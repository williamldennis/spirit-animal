import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SignInScreen from '../features/auth/screens/SignInScreen';
import SignUpScreen from '../features/auth/screens/SignUpScreen';
import HomeScreen from '../features/home/screens/HomeScreen';
import SelectContactScreen from '../features/chat/screens/SelectContactScreen';
import ChatScreen from '../features/chat/screens/ChatScreen';
import EventDetailScreen from '../features/calendar/screens/EventDetailScreen';
import { RootStackParamList } from '../types/navigation';
import { useAuthStore } from '../features/auth/stores/authStore';
import { logger } from '../utils/logger';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const user = useAuthStore(state => state.user);

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          contentStyle: { backgroundColor: '#F9FAFB' }
        }}
      >
        {user ? (
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
          </>
        ) : (
          // Auth stack
          <>
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
} 