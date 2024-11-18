import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { logger } from '../../../utils/logger';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';

WebBrowser.maybeCompleteAuthSession();

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

      const [_, __, promptAsync] = this.googleAuth;
      const result = await promptAsync();
      
      logger.info('CalendarService.connectGoogleCalendar', 'Auth result received', {
        type: result.type,
        hasAuthentication: result.type === 'success' && !!result.authentication
      });

      if (result.type === 'success' && result.authentication) {
        await this.storeCalendarTokens(userId, {
          accessToken: result.authentication.accessToken,
          expiresAt: new Date(Date.now() + (result.authentication.expiresIn || 3600) * 1000)
        });

        // Verify the token works by making a test API call
        const testResponse = await fetch(
          'https://www.googleapis.com/calendar/v3/users/me/calendarList',
          {
            headers: {
              Authorization: `Bearer ${result.authentication.accessToken}`,
            },
          }
        );

        if (!testResponse.ok) {
          throw new Error(`Calendar API test failed: ${await testResponse.text()}`);
        }

        return true;
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
}

export const calendarService = new CalendarService();