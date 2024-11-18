import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { calendarService } from './src/features/calendar/services/calendarService';
import { logger } from './src/utils/logger';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

// Define the exact redirect URI to match Google Console
const REDIRECT_URI = 'https://auth.expo.io/@willdennis/spirit-animal';

export default function App() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    // Include both client IDs
    webClientId: Constants.expoConfig?.extra?.googleWebClientId,
    iosClientId: Constants.expoConfig?.extra?.googleIosClientId,
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ],
    redirectUri: REDIRECT_URI
  });

  React.useEffect(() => {
    // Log the exact configuration being used
    logger.debug('Google Auth Config', JSON.stringify({
      platform: Platform.OS,
      webClientId: Constants.expoConfig?.extra?.googleWebClientId ? 'present' : 'missing',
      iosClientId: Constants.expoConfig?.extra?.googleIosClientId ? 'present' : 'missing',
      configuredRedirectUri: REDIRECT_URI,
      actualRedirectUri: request?.redirectUri || 'not set',
      // Log if they match
      redirectUriMatch: REDIRECT_URI === request?.redirectUri
    }));

    if (response?.type === 'success') {
      logger.debug('Google Auth Success', JSON.stringify({
        type: response.type,
        authentication: response.authentication ? 'present' : 'missing'
      }));
    } else if (response) {
      logger.debug('Google Auth Response', JSON.stringify({
        type: response.type
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