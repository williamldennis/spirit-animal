import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { logger } from '../../../utils/logger';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import Constants from 'expo-constants';

const BROWSER_RESULT = WebBrowser.maybeCompleteAuthSession();
logger.debug('CalendarService', 'WebBrowser session completion result', { BROWSER_RESULT });

// Get these values from Google Cloud Console
const GOOGLE_CONFIG = {
  webClientId: Constants.expoConfig?.extra?.googleWebClientId,
  iosClientId: Constants.expoConfig?.extra?.googleIosClientId,
  expoClientId: Constants.expoConfig?.extra?.googleExpoClientId,
};

// Log the available client IDs for debugging
logger.debug('CalendarService', 'Available client IDs', {
  web: GOOGLE_CONFIG.webClientId,
  ios: GOOGLE_CONFIG.iosClientId,
  expo: GOOGLE_CONFIG.expoClientId
});

// Always use web client ID when using Expo's auth proxy
const CLIENT_ID = GOOGLE_CONFIG.webClientId;

if (!CLIENT_ID) {
  throw new Error('Google Web Client ID is not configured');
}

const SCOPES = [
  // Non-sensitive scopes
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/calendar.settings.readonly',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.calendars.readonly',
  'https://www.googleapis.com/auth/calendar.freebusy',
  // Sensitive scopes
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.acls',
  'https://www.googleapis.com/auth/calendar.acls.readonly',
  'https://www.googleapis.com/auth/calendar.calendars',
  'https://www.googleapis.com/auth/calendar.events.owned',
  'https://www.googleapis.com/auth/calendar.events.owned.readonly'
];

// Create a fixed HTTPS redirect URI using auth.expo.io directly
const redirectUri = 'https://auth.expo.io/@willdennis/spirit-animal';

class CalendarService {
  private request = new AuthSession.AuthRequest({
    clientId: CLIENT_ID,
    scopes: SCOPES,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: false,
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  });

  async connectGoogleCalendar(userId: string) {
    try {
      logger.info('CalendarService.connectGoogleCalendar', 'Starting connection', {
        userId,
        clientId: CLIENT_ID,
        redirectUri,
        scopes: SCOPES.length
      });

      logger.debug('CalendarService.connectGoogleCalendar', 'Starting OAuth prompt');

      try {
        const result = await this.request.promptAsync({
          authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenEndpoint: 'https://oauth2.googleapis.com/token',
        });

        if (result.type === 'success' && result.params?.code) {
          await this.storeCalendarTokens(userId, {
            accessToken: result.params.code,
            expiresAt: new Date(Date.now() + 3600 * 1000),
          });

          logger.info('CalendarService.connectGoogleCalendar', 'Successfully connected');
          return true;
        } else {
          logger.warn('CalendarService.connectGoogleCalendar', 'Connection failed', { 
            type: result.type,
            error: result.error
          });
          return false;
        }
      } catch (promptError) {
        logger.error('CalendarService.connectGoogleCalendar', 'Prompt error', {
          error: promptError,
          message: promptError instanceof Error ? promptError.message : 'Unknown error'
        });
        throw promptError;
      }
    } catch (error) {
      logger.error('CalendarService.connectGoogleCalendar', 'Connection error', { 
        error,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
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

  async isCalendarConnected(userId: string): Promise<boolean> {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    return userDoc.data()?.calendarConnected || false;
  }

  async fetchUpcomingEvents(userId: string) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      const tokens = userDoc.data()?.calendarTokens;

      if (!tokens || new Date(tokens.expiresAt) < new Date()) {
        throw new Error('Calendar access expired. Please reconnect.');
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${new Date().toISOString()}`,
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      );

      const data = await response.json();
      return data.items;
    } catch (error) {
      logger.error('CalendarService.fetchUpcomingEvents', 'Failed to fetch events', { error });
      throw new Error('Failed to fetch calendar events. Please try again.');
    }
  }
}

export const calendarService = new CalendarService();