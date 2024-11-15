import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { logger } from '../../../utils/logger';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

// Get these values from Google Cloud Console
const GOOGLE_CONFIG = {
  webClientId: Constants.expoConfig?.extra?.googleWebClientId,
  iosClientId: Constants.expoConfig?.extra?.googleIosClientId,
  expoClientId: Constants.expoConfig?.extra?.googleExpoClientId,
};

// Use the appropriate client ID based on platform
const CLIENT_ID = Platform.select({
  ios: GOOGLE_CONFIG.iosClientId,
  web: GOOGLE_CONFIG.webClientId,
  default: GOOGLE_CONFIG.expoClientId,
});

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events'
];

// Use Expo's auth proxy service
const redirectUri = AuthSession.makeRedirectUri({
  useProxy: true,
  projectNameForProxy: '@willdennis/spirit-animal'
});

// Log the redirect URI for configuration
logger.info('CalendarService', 'Using redirect URI', { redirectUri });

class CalendarService {
  private config = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  };

  private request = new AuthSession.AuthRequest({
    clientId: CLIENT_ID,
    scopes: SCOPES,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  });

  async connectGoogleCalendar(userId: string) {
    try {
      logger.info('CalendarService.connectGoogleCalendar', 'Starting Google Calendar connection');
      
      const result = await this.request.promptAsync(this.config);
      
      if (result.type === 'success' && result.authentication) {
        // Store the tokens in Firestore
        await this.storeCalendarTokens(userId, {
          accessToken: result.authentication.accessToken,
          refreshToken: result.authentication.refreshToken,
          expiresAt: new Date(Date.now() + (result.authentication.expiresIn || 3600) * 1000),
        });

        logger.info('CalendarService.connectGoogleCalendar', 'Successfully connected Google Calendar');
        return true;
      } else {
        logger.warn('CalendarService.connectGoogleCalendar', 'Connection cancelled or failed', { resultType: result.type });
        return false;
      }
    } catch (error) {
      logger.error('CalendarService.connectGoogleCalendar', 'Failed to connect Google Calendar', { error });
      throw new Error('Failed to connect Google Calendar. Please try again.');
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