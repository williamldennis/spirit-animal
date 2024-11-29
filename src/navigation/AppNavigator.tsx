import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SignInScreen from '../features/auth/screens/SignInScreen';
import SignUpScreen from '../features/auth/screens/SignUpScreen';
import HomeScreen from '../features/home/screens/HomeScreen';
import SelectContactScreen from '../features/chat/screens/SelectContactScreen';
import ChatScreen from '../features/chat/screens/ChatScreen';
import EventDetailScreen from '../features/calendar/screens/EventDetailScreen';
import EmailScreen from '../features/email/screens/EmailScreen';
import ComposeEmailScreen from '../features/email/screens/ComposeEmailScreen';
import EmailDetailScreen from '../features/email/screens/EmailDetailScreen';
import { RootStackParamList } from '../types/navigation';
import { useAuthStore } from '../features/auth/stores/authStore';
import { logger } from '../utils/logger';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const user = useAuthStore(state => state.user);

  // Add debug logging
  React.useEffect(() => {
    logger.debug('AppNavigator', 'Rendering with auth state', { 
      isAuthenticated: !!user,
      userId: user?.uid,
      email: user?.email,
      shouldShowAuth: !user,
    });
  }, [user]);

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          contentStyle: { backgroundColor: '#F9FAFB' }
        }}
      >
        {!user ? (
          // Auth stack
          <>
            <Stack.Screen 
              name="SignIn" 
              component={SignInScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="SignUp" 
              component={SignUpScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          // Authenticated stack
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="SelectContact" component={SelectContactScreen} />
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen}
              options={{
                animation: 'slide_from_right'
              }}
            />
            <Stack.Screen 
              name="EventDetail" 
              component={EventDetailScreen} 
              options={{ title: 'Event Details' }} 
            />
            <Stack.Screen
              name="ComposeEmail"
              component={ComposeEmailScreen}
              options={{ title: 'New Email' }}
            />
            <Stack.Screen
              name="EmailDetail"
              component={EmailDetailScreen}
              options={{ title: 'Email' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
} 