import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { logger } from '../../../utils/logger';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import Constants from 'expo-constants';

// Ensure WebBrowser session completion and log result
WebBrowser.maybeCompleteAuthSession();

// Use hardcoded HTTPS redirect URI
const redirectUri = 'https://auth.expo.io/@willdennis/spirit-animal';

// Google Calendar API configuration
const GOOGLE_CONFIG = {
  clientId: Constants.expoConfig?.extra?.googleWebClientId,
  scopes: [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events'
  ],
  redirectUri
};

class CalendarService {
  private request: AuthSession.AuthRequest;

  constructor() {
    logger.debug('CalendarService', 'Initializing service');
    
    try {
      this.request = new AuthSession.AuthRequest({
        clientId: GOOGLE_CONFIG.clientId!,
        scopes: GOOGLE_CONFIG.scopes,
        redirectUri: GOOGLE_CONFIG.redirectUri,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: false,
        extraParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      });

      logger.debug('CalendarService', 'Request initialized', {
        redirectUri: this.request.redirectUri,
        responseType: this.request.responseType,
        usePKCE: this.request.usePKCE
      });
    } catch (error) {
      logger.error('CalendarService', 'Failed to initialize request', { error });
      throw error;
    }
  }

  async connectGoogleCalendar(userId: string) {
    try {
      logger.info('CalendarService.connectGoogleCalendar', 'Starting connection');

      // Log the request state before generating URL
      logger.debug('CalendarService.connectGoogleCalendar', 'Request state', {
        hasRequest: !!this.request,
        requestProps: Object.keys(this.request)
      });

      // Generate auth URL with detailed logging
      const authUrl = await this.request.makeAuthUrlAsync({
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth'
      });
      
      logger.info('CalendarService.connectGoogleCalendar', 'Auth URL generated', { 
        authUrl,
        redirectUri: GOOGLE_CONFIG.redirectUri
      });

      // Attempt the OAuth flow with detailed error handling
      logger.info('CalendarService.connectGoogleCalendar', 'Prompting for auth');
      try {
        const result = await this.request.promptAsync({
          authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenEndpoint: 'https://oauth2.googleapis.com/token'
        });

        logger.info('CalendarService.connectGoogleCalendar', 'Auth completed', {
          type: result.type,
          hasParams: !!result.params,
          error: result.error
        });

        if (result.type === 'success' && result.params?.code) {
          logger.info('CalendarService.connectGoogleCalendar', 'Exchanging code for tokens');
          
          const tokens = await this.exchangeCodeForTokens(result.params.code);
          await this.storeCalendarTokens(userId, tokens);
          
          logger.info('CalendarService.connectGoogleCalendar', 'Successfully connected');
          return true;
        }

        logger.warn('CalendarService.connectGoogleCalendar', 'Auth failed', {
          type: result.type,
          error: result.error
        });
        return false;
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

  private async exchangeCodeForTokens(code: string) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CONFIG.clientId!,
        redirect_uri: GOOGLE_CONFIG.redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000)
    };
  }
}

export const calendarService = new CalendarService();