import React from 'react';
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

  // Initialize Google Auth
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: Constants.expoConfig?.extra?.googleWebClientId,
    iosClientId: Constants.expoConfig?.extra?.googleIosClientId,
    scopes: SCOPES,
    selectAccount: true,
  });

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

  // Share Google auth with calendar service
  React.useEffect(() => {
    if (request) {
      calendarService.setGoogleAuth([request, response, promptAsync]);
      logger.debug('App', 'Google Auth Configuration', {
        platform: Platform.OS,
        hasWebClientId: !!Constants.expoConfig?.extra?.googleWebClientId,
        hasIosClientId: !!Constants.expoConfig?.extra?.googleIosClientId,
        scopes: SCOPES,
      });
    }
  }, [request, response]);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync(Feather.font);
        logger.debug('App', 'Feather fonts loaded successfully');
      } catch (error) {
        logger.error('App', 'Failed to load Feather fonts', { error });
      }
    }
    loadFonts();
  }, []);

  if (!isInitialized) {
    logger.debug('App', 'Still initializing...');
    return null;
  }

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
} 