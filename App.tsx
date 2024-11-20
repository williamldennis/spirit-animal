import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { calendarService } from './src/features/calendar/services/calendarService';
import { logger } from './src/utils/logger';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import type { AuthSessionResult } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

// Define the exact redirect URI to match Google Console
const REDIRECT_URI = Platform.select({
  ios: 'com.googleusercontent.apps.1042281418890-lf5ougfstfge53aausq1kgpkhm7id4m:/',
  android: 'com.willdennis.spiritanimal://oauth2redirect/google',
  default: 'https://auth.expo.io/@willdennis/spirit-animal',
});

// Define scopes explicitly
const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.events.readonly'
];

export default function App() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: Constants.expoConfig?.extra?.googleWebClientId,
    iosClientId: Constants.expoConfig?.extra?.googleIosClientId,
    scopes: CALENDAR_SCOPES,
    selectAccount: true,
    extraParams: {
      access_type: 'offline',
    }
  });

  React.useEffect(() => {
    logger.debug('Google Auth Configuration', JSON.stringify({
      platform: Platform.OS,
      webClientId: Constants.expoConfig?.extra?.googleWebClientId?.substring(0, 8) + '...',
      iosClientId: Constants.expoConfig?.extra?.googleIosClientId?.substring(0, 8) + '...',
      configuredRedirectUri: REDIRECT_URI,
      actualRedirectUri: request?.redirectUri,
      scopes: request?.scopes,
      responseType: request?.responseType,
      usePKCE: request?.usePKCE
    }));

    if (response?.type === 'success') {
      logger.debug('Google Auth Success', JSON.stringify({
        type: response.type,
        authentication: response.authentication ? {
          accessToken: response.authentication.accessToken?.substring(0, 8) + '...',
          scopes: response.authentication.scope?.split(' '),
          expiresIn: response.authentication.expiresIn
        } : 'missing'
      }));
    }
  }, [request, response]);

  React.useEffect(() => {
    calendarService.setGoogleAuth([request, response, promptAsync]);
  }, [request, response, promptAsync]);

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
} 