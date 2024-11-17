import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { logger } from '../../../utils/logger';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import Constants from 'expo-constants';

// Make sure to complete auth sessions
WebBrowser.maybeCompleteAuthSession();

// Get these values from Google Cloud Console
const GOOGLE_CONFIG = {
  webClientId: Constants.expoConfig?.extra?.googleWebClientId,
  iosClientId: Constants.expoConfig?.extra?.googleIosClientId,
  expoClientId: Constants.expoConfig?.extra?.googleExpoClientId,
};

// Always use web client ID for OAuth flow
const CLIENT_ID = GOOGLE_CONFIG.webClientId;

if (!CLIENT_ID) {
  throw new Error('Google Web Client ID is not configured');
}

// Simplify to minimum required scopes
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly'
];

// Define Google OAuth endpoints
const GOOGLE_OAUTH_CONFIG = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
} as const;

class CalendarService {
  private request: AuthSession.AuthRequest;

  constructor() {
    this.request = new AuthSession.AuthRequest({
      clientId: CLIENT_ID,
      scopes: SCOPES,
      redirectUri: 'https://auth.expo.io/@willdennis/spirit-animal',
      responseType: AuthSession.ResponseType.Code,
      usePKCE: false,
      extraParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    });

    // Log initial configuration
    logger.info('CalendarService', 'Initialized with config', {
      clientId: CLIENT_ID,
      redirectUri: this.request.redirectUri,
      scopes: SCOPES
    });

    // Log auth configuration with async URL generation
    this.request.makeAuthUrlAsync(GOOGLE_OAUTH_CONFIG)
      .then(authUrl => {
        logger.info('CalendarService', 'Auth Configuration', {
          redirectUri: 'https://auth.expo.io/@willdennis/spirit-animal',
          clientId: CLIENT_ID.substring(0, 10) + '...', // Log partial client ID for security
          platform: Platform.OS,
          authUrl
        });
      })
      .catch(error => {
        logger.error('CalendarService', 'Failed to generate auth URL', { error });
      });
  }

  async connectGoogleCalendar(userId: string) {
    try {
      logger.info('CalendarService.connectGoogleCalendar', 'Starting connection');

      // Use explicit discovery endpoints
      const result = await this.request.promptAsync(GOOGLE_OAUTH_CONFIG);

      logger.info('CalendarService.connectGoogleCalendar', 'Auth result received', {
        type: result.type,
        hasCode: result.type === 'success' && 'code' in result.params
      });

      if (result.type === 'success' && 'code' in result.params) {
        // Exchange the code for tokens
        const tokens = await this.exchangeCodeForTokens(result.params.code);
        
        // Store the tokens
        await this.storeCalendarTokens(userId, {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        });

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

  private async exchangeCodeForTokens(code: string) {
    const tokenResponse = await fetch(GOOGLE_OAUTH_CONFIG.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        redirect_uri: this.request.redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    return tokenResponse.json();
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