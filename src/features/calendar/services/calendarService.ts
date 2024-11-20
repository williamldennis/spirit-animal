import * as Google from 'expo-auth-session/providers/google';
import type { AuthSessionResult } from 'expo-auth-session';
import Constants from 'expo-constants';
import { logger } from '../../../utils/logger';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';

interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime: string;
  };
}

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

      const [request, response, promptAsync] = this.googleAuth;
      
      logger.debug('CalendarService.connectGoogleCalendar', 'Auth request config', {
        redirectUri: request?.redirectUri,
        scopes: request?.scopes,
        clientId: request?.clientId?.substring(0, 8) + '...',
      });

      const result = await promptAsync();
      
      logger.info('CalendarService.connectGoogleCalendar', 'Auth result', {
        type: result.type,
        hasAuthentication: result.type === 'success' && !!result.authentication,
      });

      if (result.type === 'success' && result.authentication) {
        await this.storeCalendarTokens(userId, {
          accessToken: result.authentication.accessToken,
          refreshToken: result.authentication.refreshToken,
          expiresAt: new Date(Date.now() + (result.authentication.expiresIn || 3600) * 1000)
        });

        try {
          const testResponse = await fetch(
            'https://www.googleapis.com/calendar/v3/users/me/calendarList',
            {
              headers: {
                Authorization: `Bearer ${result.authentication.accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!testResponse.ok) {
            const errorData = await testResponse.json();
            logger.error('CalendarService.connectGoogleCalendar', 'API test failed', {
              status: testResponse.status,
              error: errorData
            });
            throw new Error(`Calendar API test failed: ${JSON.stringify(errorData)}`);
          }

          const data = await testResponse.json();
          logger.info('CalendarService.connectGoogleCalendar', 'API test successful', {
            calendarsCount: data.items?.length
          });

          return true;
        } catch (apiError) {
          logger.error('CalendarService.connectGoogleCalendar', 'API test error', { apiError });
          throw apiError;
        }
      }

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
      return !!tokens;
    } catch (error) {
      logger.error('CalendarService.isCalendarConnected', 'Failed to check connection', { error });
      return false;
    }
  }

  private async storeCalendarTokens(userId: string, tokens: {
    accessToken: string;
    refreshToken?: string;
    expiresAt: Date;
  }) {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      calendarTokens: tokens,
      calendarConnected: true,
    }, { merge: true });
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
        refreshToken,
        expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
      });

      return data.access_token;
    } catch (error) {
      logger.error('CalendarService.refreshAccessToken', 'Refresh failed', { error });
      throw error;
    }
  }

  async fetchUpcomingEvents(userId: string): Promise<CalendarEvent[]> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      const tokens = userDoc.data()?.calendarTokens;

      if (!tokens?.accessToken) {
        throw new Error('No access token available');
      }

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${new Date().toISOString()}&maxResults=10&orderBy=startTime&singleEvents=true',
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      return data.items;
    } catch (error) {
      logger.error('CalendarService.fetchUpcomingEvents', 'Failed to fetch events', { error });
      throw error;
    }
  }

  getGoogleAuthStatus(): boolean {
    return !!this.googleAuth;
  }
}

export const calendarService = new CalendarService();