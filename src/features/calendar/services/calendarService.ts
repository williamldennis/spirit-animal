import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { logger } from '../../../utils/logger';
import { ENV } from '../../../config/env';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

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

class CalendarService {
  private googleAuth: [
    Google.AuthRequest | null,
    Google.AuthSessionResult | null,
    () => Promise<Google.AuthSessionResult>
  ] | null = null;

  constructor() {
    logger.debug('CalendarService', 'Initializing service');
  }

  setGoogleAuth(auth: [
    Google.AuthRequest | null,
    Google.AuthSessionResult | null,
    () => Promise<Google.AuthSessionResult>
  ]) {
    this.googleAuth = auth;
    logger.debug('CalendarService', 'Google auth set', {
      hasRequest: !!auth[0],
      hasResponse: !!auth[1],
      hasPrompt: !!auth[2]
    });
  }

  async connectGoogleCalendar(userId: string): Promise<boolean> {
    try {
      logger.info('CalendarService.connectGoogleCalendar', 'Starting connection');

      if (!this.googleAuth?.[2]) {
        throw new Error('Google auth not initialized');
      }

      const [_, __, promptAsync] = this.googleAuth;
      const result = await promptAsync();
      
      if (result.type === 'success' && result.authentication?.accessToken) {
        const { accessToken, expiresIn } = result.authentication;
        
        const credentials = {
          accessToken,
          expiresAt: new Date(Date.now() + (expiresIn || 3600) * 1000).toISOString(),
        };

        await this.saveCalendarCredentials(userId, credentials);
        return true;
      }

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
      return expiresAt > new Date();
    } catch (error) {
      logger.error('CalendarService.isCalendarConnected', 'Check failed', { error });
      return false;
    }
  }

  async fetchUpcomingEvents(userId: string, days: number = 30): Promise<CalendarEventResponse[]> {
    try {
      const credentials = await this.getCalendarCredentials(userId);
      if (!credentials?.accessToken) {
        throw new Error('Calendar not connected');
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

  private async saveCalendarCredentials(userId: string, credentials: any) {
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

  private async getCalendarCredentials(userId: string): Promise<any> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      return userDoc.data()?.calendarCredentials || null;
    } catch (error) {
      logger.error('CalendarService.getCalendarCredentials', 'Fetch failed', { error });
      throw error;
    }
  }

  // ... rest of the service implementation
}

export const calendarService = new CalendarService();