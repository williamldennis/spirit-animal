import * as Google from 'expo-auth-session/providers/google';
import type { TokenResponse } from 'expo-auth-session';
import Constants from 'expo-constants';
import { logger } from '../../../utils/logger';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { addDays } from 'date-fns';

export interface CalendarEventResponse {
  id: string;
  summary: string;
  start: {
    dateTime: string;
  };
  end: {
    dateTime: string;
  };
  description?: string;
}

type GoogleAuthResponse = {
  type: 'success';
  authentication: {
    accessToken: string;
    expiresIn: number;
    scope?: string;
  };
};

class CalendarService {
  private googleAuth: ReturnType<typeof Google.useAuthRequest> | null = null;

  constructor() {
    logger.debug('CalendarService', 'Initializing service');
  }

  setGoogleAuth(auth: ReturnType<typeof Google.useAuthRequest>) {
    this.googleAuth = auth;
  }

  async connectGoogleCalendar(userId: string) {
    try {
      logger.info('CalendarService.connectGoogleCalendar', 'Starting connection');

      if (!this.googleAuth?.[2]) {
        throw new Error('Google auth not initialized');
      }

      const [_, response, promptAsync] = this.googleAuth;
      const result = await promptAsync();
      
      logger.debug('CalendarService.connectGoogleCalendar', 'Auth result', {
        type: result.type,
        hasToken: result.type === 'success' && !!response?.authentication?.accessToken,
        expiresIn: response?.authentication?.expiresIn
      });

      // Check for token in response
      if (result.type === 'success' && response?.authentication?.accessToken) {
        const { accessToken, expiresIn } = response.authentication;

        logger.debug('CalendarService.connectGoogleCalendar', 'Got token', {
          tokenPrefix: accessToken.substring(0, 8) + '...',
          expiresIn
        });

        await this.storeCalendarTokens(userId, {
          accessToken,
          expiresAt: new Date(Date.now() + (expiresIn || 3600) * 1000)
        });

        // Test API connection
        const testUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=1';
        logger.debug('CalendarService.connectGoogleCalendar', 'Testing API connection', { testUrl });

        const testResponse = await fetch(testUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
        });

        if (!testResponse.ok) {
          const errorData = await testResponse.json();
          logger.error('CalendarService.connectGoogleCalendar', 'API test failed', { 
            status: testResponse.status,
            error: errorData 
          });
          throw new Error(`Calendar API test failed: ${errorData.error?.message || 'Unknown error'}`);
        }

        const testData = await testResponse.json();
        logger.debug('CalendarService.connectGoogleCalendar', 'API test successful', {
          hasItems: !!testData.items?.length,
          itemCount: testData.items?.length || 0
        });

        return true;
      }

      logger.warn('CalendarService.connectGoogleCalendar', 'No valid token found', {
        type: result.type,
        hasResponse: !!response,
        hasAuth: !!response?.authentication
      });
      return false;

    } catch (error) {
      logger.error('CalendarService.connectGoogleCalendar', 'Connection error', { 
        error,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async isCalendarConnected(userId: string): Promise<boolean> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      const tokens = userDoc.data()?.calendarTokens;

      if (!tokens?.accessToken) {
        return false;
      }

      // Handle Firestore Timestamp
      const expiresAt = tokens.expiresAt?.toDate?.() || new Date(tokens.expiresAt);
      
      logger.debug('CalendarService.isCalendarConnected', 'Checking token expiry', {
        hasToken: !!tokens.accessToken,
        expiresAt: expiresAt.toISOString(),
        now: new Date().toISOString(),
        isExpired: expiresAt < new Date()
      });

      // Check if token is expired
      if (expiresAt < new Date()) {
        logger.debug('CalendarService.isCalendarConnected', 'Token expired');
        // Clear expired tokens
        await setDoc(userRef, {
          calendarTokens: null,
          calendarConnected: false,
        }, { merge: true });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('CalendarService.isCalendarConnected', 'Failed to check connection', { error });
      return false;
    }
  }

  private async storeCalendarTokens(userId: string, tokens: {
    accessToken: string;
    expiresAt: Date;
  }) {
    try {
      logger.debug('CalendarService.storeCalendarTokens', 'Storing tokens', { userId });
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        calendarTokens: tokens,
        calendarConnected: true,
      }, { merge: true });
      logger.debug('CalendarService.storeCalendarTokens', 'Tokens stored successfully');
    } catch (error) {
      logger.error('CalendarService.storeCalendarTokens', 'Failed to store tokens', { error });
      throw error;
    }
  }

  private async refreshAccessToken(userId: string, refreshToken: string) {
    try {
      const tokenEndpoint = 'https://oauth2.googleapis.com/token';
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Constants.expoConfig?.extra?.googleWebClientId,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      await this.storeCalendarTokens(userId, {
        accessToken: data.access_token,
        expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
      });

      return data.access_token;
    } catch (error) {
      logger.error('CalendarService.refreshAccessToken', 'Refresh failed', { error });
      throw error;
    }
  }

  async fetchUpcomingEvents(userId: string, daysToFetch: number = 30): Promise<CalendarEventResponse[]> {
    try {
      logger.debug('CalendarService.fetchUpcomingEvents', 'Starting fetch', { 
        userId,
        daysToFetch 
      });
      
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      const tokens = userDoc.data()?.calendarTokens;

      // Check if calendar is connected
      if (!tokens?.accessToken) {
        logger.debug('CalendarService.fetchUpcomingEvents', 'Calendar not connected');
        return []; 
      }

      // Handle Firestore Timestamp
      const expiresAt = tokens.expiresAt?.toDate?.() || new Date(tokens.expiresAt);
      const now = new Date();
      const isExpired = expiresAt < now;

      logger.debug('CalendarService.fetchUpcomingEvents', 'Token expiry check', {
        now: now.toISOString(),
        expiry: expiresAt.toISOString(),
        isExpired
      });

      if (isExpired) {
        logger.debug('CalendarService.fetchUpcomingEvents', 'Token expired, clearing connection');
        await setDoc(userRef, {
          calendarTokens: null,
          calendarConnected: false,
        }, { merge: true });
        return [];
      }

      const endDate = addDays(now, daysToFetch);
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${endDate.toISOString()}&orderBy=startTime&singleEvents=true&maxResults=250`;

      logger.debug('CalendarService.fetchUpcomingEvents', 'Making API request', {
        url,
        tokenPrefix: tokens.accessToken.substring(0, 8) + '...',
        dateRange: {
          start: now.toISOString(),
          end: endDate.toISOString(),
          daysToFetch
        }
      });

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        },
      });

      logger.debug('CalendarService.fetchUpcomingEvents', 'API response received', {
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('CalendarService.fetchUpcomingEvents', 'API request failed', { 
          status: response.status,
          error: errorData 
        });

        if (response.status === 401) {
          await setDoc(userRef, {
            calendarTokens: null,
            calendarConnected: false,
          }, { merge: true });
          logger.debug('CalendarService.fetchUpcomingEvents', 'Cleared invalid tokens');
        }

        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      logger.debug('CalendarService.fetchUpcomingEvents', 'Events fetched successfully', {
        count: data.items?.length || 0,
        firstEvent: data.items?.[0] ? {
          summary: data.items[0].summary,
          start: data.items[0].start
        } : null,
        sampleEvents: (data.items || []).slice(0, 3).map((e: CalendarEventResponse) => ({
          summary: e.summary,
          start: e.start
        }))
      });
      
      return data.items || [];
    } catch (error) {
      logger.error('CalendarService.fetchUpcomingEvents', 'Failed to fetch events', { 
        error,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      return []; // Return empty array on error
    }
  }

  getGoogleAuthStatus(): boolean {
    return !!this.googleAuth;
  }

  async createEvent(userId: string, eventData: Partial<CalendarEventResponse>) {
    try {
      logger.debug('CalendarService.createEvent', 'Creating new event', { userId });
      
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      const tokens = userDoc.data()?.calendarTokens;

      if (!tokens?.accessToken) {
        logger.error('CalendarService.createEvent', 'No access token found');
        throw new Error('Calendar not connected');
      }

      // Ensure timezone is set for both start and end times
      const eventWithTimezone = {
        ...eventData,
        start: {
          ...eventData.start,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone // Get user's timezone
        },
        end: {
          ...eventData.end,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };

      const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
      
      logger.debug('CalendarService.createEvent', 'Creating event with data', { 
        eventData: eventWithTimezone 
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventWithTimezone)
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('CalendarService.createEvent', 'Failed to create event', { 
          status: response.status,
          error: errorData 
        });
        throw new Error('Failed to create event');
      }

      const data = await response.json();
      logger.debug('CalendarService.createEvent', 'Event created successfully', {
        eventId: data.id,
        summary: data.summary
      });
      
      return data;
    } catch (error) {
      logger.error('CalendarService.createEvent', 'Failed to create event', { error });
      throw error;
    }
  }

  async updateEvent(userId: string, eventId: string, eventData: Partial<CalendarEventResponse>) {
    try {
      logger.debug('CalendarService.updateEvent', 'Updating event', { userId, eventId });
      
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      const tokens = userDoc.data()?.calendarTokens;

      if (!tokens?.accessToken) {
        logger.error('CalendarService.updateEvent', 'No access token found');
        throw new Error('Calendar not connected');
      }

      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        throw new Error('Failed to update event');
      }

      return await response.json();
    } catch (error) {
      logger.error('CalendarService.updateEvent', 'Failed to update event', { error });
      throw error;
    }
  }

  async deleteEvent(userId: string, eventId: string) {
    try {
      logger.debug('CalendarService.deleteEvent', 'Deleting event', { userId, eventId });
      
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      const tokens = userDoc.data()?.calendarTokens;

      if (!tokens?.accessToken) {
        logger.error('CalendarService.deleteEvent', 'No access token found');
        throw new Error('Calendar not connected');
      }

      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }
    } catch (error) {
      logger.error('CalendarService.deleteEvent', 'Failed to delete event', { error });
      throw error;
    }
  }
}

export const calendarService = new CalendarService();