import 'react-native-gesture-handler';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { calendarService } from './src/features/calendar/services/calendarService';
import { logger } from './src/utils/logger';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/config/firebase';
import { useAuthStore } from './src/features/auth/stores/authStore';
import { useEffect } from 'react';
import * as Font from 'expo-font';
import { Feather } from '@expo/vector-icons';
import { ENV } from './src/config/env';

WebBrowser.maybeCompleteAuthSession();

// Define all required scopes
const SCOPES = [
  // Calendar scopes
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  // Gmail scopes
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify'
];

export default function App() {
  const setUser = useAuthStore(state => state.setUser);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [fontsLoaded, setFontsLoaded] = React.useState(false);

  // Initialize Google Auth with more detailed logging
  const authConfig = Platform.select({
    ios: {
      iosClientId: ENV.GOOGLE_IOS_CLIENT_ID,
      scopes: SCOPES,
    },
    default: {
      clientId: ENV.GOOGLE_WEB_CLIENT_ID,
      scopes: SCOPES,
      selectAccount: true,
    },
  });

  logger.debug('App', 'Auth configuration selected', {
    platform: Platform.OS,
    config: {
      hasIosClientId: !!authConfig?.iosClientId,
      hasWebClientId: !!authConfig?.clientId,
      scopes: authConfig?.scopes
    }
  });

  const [request, response, promptAsync] = Google.useAuthRequest(authConfig);

  // Log auth hook values
  React.useEffect(() => {
    logger.debug('App', 'Auth hook values updated', {
      hasRequest: !!request,
      requestType: request ? typeof request : 'undefined',
      hasResponse: !!response,
      responseType: response ? response.type : 'undefined',
      hasPrompt: !!promptAsync,
      promptType: promptAsync ? typeof promptAsync : 'undefined'
    });
  }, [request, response, promptAsync]);

  // Set up auth state listener
  React.useEffect(() => {
    logger.debug('App', 'Setting up auth state listener');
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      logger.debug('App', 'Auth state changed', { 
        isAuthenticated: !!user,
        userId: user?.uid,
        email: user?.email 
      });
      setUser(user);
      setIsInitialized(true);
    });

    return () => {
      logger.debug('App', 'Cleaning up auth state listener');
      unsubscribe();
    };
  }, []);

  // Share Google auth with calendar service with additional logging
  React.useEffect(() => {
    if (request && promptAsync) {
      logger.debug('App', 'Setting Google auth in calendar service', {
        requestProperties: Object.keys(request),
        promptAsyncType: typeof promptAsync,
        responseType: response?.type
      });

      calendarService.setGoogleAuth([request, response, promptAsync]);
      
      logger.debug('App', 'Google Auth Configuration', {
        platform: Platform.OS,
        hasWebClientId: !!ENV.GOOGLE_WEB_CLIENT_ID,
        hasIosClientId: !!ENV.GOOGLE_IOS_CLIENT_ID,
        scopes: SCOPES
      });
    }
  }, [request, response, promptAsync]);

  // Load fonts
  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Feather': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf')
        });
        setFontsLoaded(true);
        logger.debug('App', 'Feather fonts loaded successfully');
      } catch (error) {
        logger.error('App', 'Failed to load Feather fonts', { error });
        // Continue even if font loading fails
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  if (!isInitialized || !fontsLoaded) {
    logger.debug('App', 'Still initializing...', { isInitialized, fontsLoaded });
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
} 