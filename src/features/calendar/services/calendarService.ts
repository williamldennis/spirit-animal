import { doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { logger } from '../../../utils/logger';
import { ENV } from '../../../config/env';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import type { CalendarEvent, CalendarCredentials } from '../types';

WebBrowser.maybeCompleteAuthSession();

export interface CalendarEventResponse {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
    self?: boolean;
  }>;
}

const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

interface CalendarCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

class CalendarService {
  private googleAuthRequest: Google.AuthRequest | null = null;
  private googleAuthPrompt: (() => Promise<Google.AuthSessionResult>) | null = null;

  constructor() {
    logger.debug('CalendarService', 'Initializing service');
  }

  setGoogleAuth(auth: [
    Google.AuthRequest | null,
    Google.AuthSessionResult | null,
    () => Promise<Google.AuthSessionResult>
  ]) {
    const [request, _, prompt] = auth;
    this.googleAuthRequest = request;
    this.googleAuthPrompt = prompt;
    
    logger.debug('CalendarService', 'Google auth set', {
      hasRequest: !!request,
      hasPrompt: !!prompt
    });
  }

  async connectGoogleCalendar(userId: string): Promise<boolean> {
    try {
      logger.info('CalendarService.connectGoogleCalendar', 'Starting connection');

      if (!this.googleAuthRequest || !this.googleAuthPrompt) {
        logger.error('CalendarService.connectGoogleCalendar', 'Auth not initialized');
        throw new Error('Google auth not initialized');
      }

      const result = await this.googleAuthPrompt();
      
      logger.debug('CalendarService.connectGoogleCalendar', 'Full auth result', {
        type: result.type,
        hasAuthentication: !!result.authentication,
        hasAccessToken: !!result.authentication?.accessToken,
        params: result.params,
        error: result.error
      });
      
      if (result.type === 'success' && result.params?.code) {
        try {
          const tokenRequestBody = {
            code: result.params.code,
            client_id: ENV.GOOGLE_IOS_CLIENT_ID,
            grant_type: 'authorization_code',
            redirect_uri: this.googleAuthRequest.redirectUri,
            code_verifier: this.googleAuthRequest.codeVerifier,
          };

          logger.debug('CalendarService.connectGoogleCalendar', 'Token request details', {
            hasCode: !!tokenRequestBody.code,
            hasCodeVerifier: !!tokenRequestBody.code_verifier,
            redirectUri: tokenRequestBody.redirect_uri,
            originalRedirectUri: this.googleAuthRequest.redirectUri
          });

          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(tokenRequestBody).toString()
          });

          const tokenData = await tokenResponse.json();
          
          logger.debug('CalendarService.connectGoogleCalendar', 'Token exchange response', {
            success: tokenResponse.ok,
            hasAccessToken: !!tokenData.access_token,
            error: tokenData.error,
            errorDescription: tokenData.error_description
          });

          if (!tokenResponse.ok || !tokenData.access_token) {
            logger.error('CalendarService.connectGoogleCalendar', 'Token exchange failed', {
              status: tokenResponse.status,
              error: tokenData
            });
            return false;
          }

          const testResponse = await fetch(
            'https://www.googleapis.com/calendar/v3/users/me/calendarList',
            {
              headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
              },
            }
          );

          if (!testResponse.ok) {
            logger.error('CalendarService.connectGoogleCalendar', 'Token verification failed', {
              status: testResponse.status,
              statusText: testResponse.statusText
            });
            return false;
          }

          const credentials = {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
          };

          await this.saveCalendarCredentials(userId, credentials);
          logger.info('CalendarService.connectGoogleCalendar', 'Connection successful');
          return true;
        } catch (error) {
          logger.error('CalendarService.connectGoogleCalendar', 'Token exchange error', { error });
          return false;
        }
      }

      logger.error('CalendarService.connectGoogleCalendar', 'Auth failed', { 
        type: result.type,
        error: result.error,
        params: result.params
      });
      return false;

    } catch (error) {
      logger.error('CalendarService.connectGoogleCalendar', 'Connection error', { error });
      throw error;
    }
  }

  async isCalendarConnected(userId: string): Promise<boolean> {
    try {
      const credentials = await this.getCalendarCredentials(userId);
      if (!credentials?.accessToken) return false;

      const expiresAt = new Date(credentials.expiresAt);
      
      if (expiresAt <= new Date() && credentials.refreshToken) {
        return this.refreshAccessToken(userId, credentials.refreshToken);
      }

      return true;
    } catch (error) {
      logger.error('CalendarService.isCalendarConnected', 'Check failed', { error });
      return false;
    }
  }

  private async refreshAccessToken(userId: string, refreshToken: string): Promise<boolean> {
    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: ENV.GOOGLE_IOS_CLIENT_ID,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString()
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok || !tokenData.access_token) {
        logger.error('CalendarService.refreshAccessToken', 'Refresh failed', {
          status: tokenResponse.status,
          error: tokenData
        });
        return false;
      }

      const credentials: CalendarCredentials = {
        accessToken: tokenData.access_token,
        refreshToken: refreshToken,
        expiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
      };

      await this.saveCalendarCredentials(userId, credentials);
      return true;
    } catch (error) {
      logger.error('CalendarService.refreshAccessToken', 'Refresh failed', { error });
      return false;
    }
  }

  async fetchUpcomingEvents(userId: string, days: number = 30): Promise<CalendarEventResponse[]> {
    try {
      const credentials = await this.getCalendarCredentials(userId);
      if (!credentials?.accessToken) {
        throw new Error('Calendar not connected');
      }

      const expiresAt = new Date(credentials.expiresAt);
      if (expiresAt <= new Date() && credentials.refreshToken) {
        const refreshed = await this.refreshAccessToken(userId, credentials.refreshToken);
        if (!refreshed) {
          throw new Error('Failed to refresh token');
        }
        credentials = await this.getCalendarCredentials(userId);
      }

      const now = new Date();
      const end = new Date();
      end.setDate(end.getDate() + days);

      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${now.toISOString()}&` +
        `timeMax=${end.toISOString()}&` +
        `orderBy=startTime&` +
        `singleEvents=true`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      logger.error('CalendarService.fetchUpcomingEvents', 'Failed to fetch events', { error });
      return [];
    }
  }

  private async saveCalendarCredentials(userId: string, credentials: CalendarCredentials) {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        calendarCredentials: credentials
      }, { merge: true });
    } catch (error) {
      logger.error('CalendarService.saveCalendarCredentials', 'Save failed', { error });
      throw error;
    }
  }

  private async getCalendarCredentials(userId: string): Promise<CalendarCredentials | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      return userDoc.data()?.calendarCredentials || null;
    } catch (error) {
      logger.error('CalendarService.getCalendarCredentials', 'Fetch failed', { error });
      throw error;
    }
  }

  async createEvent(userId: string, eventData: Partial<CalendarEvent>): Promise<CalendarEvent> {
    try {
      logger.debug('CalendarService.createEvent', 'Creating event', { eventData });
      
      // First, create in Google Calendar if connected
      const credentials = await this.getCalendarCredentials(userId);
      if (credentials?.accessToken) {
        try {
          const googleEvent = {
            summary: eventData.title,
            description: eventData.description,
            start: {
              dateTime: eventData.start?.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
              dateTime: eventData.end?.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            attendees: eventData.attendees?.map(email => ({ email }))
          };

          const response = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${credentials.accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(googleEvent)
            }
          );

          if (!response.ok) {
            throw new Error('Failed to create Google Calendar event');
          }

          const googleEventData = await response.json();
          logger.debug('CalendarService.createEvent', 'Created Google Calendar event', { googleEventData });
        } catch (error) {
          logger.error('CalendarService.createEvent', 'Failed to create Google Calendar event', { error });
          // Continue with Firestore creation even if Google Calendar fails
        }
      }

      // Then create in Firestore
      const eventsRef = collection(db, 'events');
      const newEvent = {
        userId,
        title: eventData.title || '',
        start: eventData.start,
        end: eventData.end,
        description: eventData.description || '',
        location: eventData.location || '',
        attendees: eventData.attendees || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'confirmed'
      };

      const docRef = await addDoc(eventsRef, newEvent);
      
      logger.debug('CalendarService.createEvent', 'Created Firestore event', { 
        eventId: docRef.id 
      });

      return {
        id: docRef.id,
        ...newEvent
      };
    } catch (error) {
      logger.error('CalendarService.createEvent', 'Failed to create event', { error });
      throw error;
    }
  }
}

export const calendarService = new CalendarService();