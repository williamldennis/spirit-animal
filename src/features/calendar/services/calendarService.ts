import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { logger } from '../../../utils/logger';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

// Use hardcoded HTTPS redirect URI
const redirectUri = 'https://auth.expo.io/@willdennis/spirit-animal';

class CalendarService {
  private request: AuthSession.AuthRequest;

  constructor() {
    logger.debug('CalendarService', 'Initializing service');
    
    try {
      this.request = new AuthSession.AuthRequest({
        clientId: Constants.expoConfig?.extra?.googleWebClientId!,
        scopes: [
          'https://www.googleapis.com/auth/calendar.readonly',
          'https://www.googleapis.com/auth/calendar.events'
        ],
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: false,
        extraParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      });

      logger.debug('CalendarService', 'Request configuration', {
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

      const result = await this.request.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token'
      });
      
      logger.info('CalendarService.connectGoogleCalendar', 'Auth result received', {
        type: result.type,
        hasParams: !!result.params,
        error: result.error
      });

      if (result.type === 'success' && result.params?.code) {
        await this.storeCalendarTokens(userId, {
          accessToken: result.params.code,
          expiresAt: new Date(Date.now() + 3600 * 1000)
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