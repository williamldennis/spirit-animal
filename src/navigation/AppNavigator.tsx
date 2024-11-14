import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SignInScreen from '../features/auth/screens/SignInScreen';
import SignUpScreen from '../features/auth/screens/SignUpScreen';
import HomeScreen from '../features/home/screens/HomeScreen';
import SelectContactScreen from '../features/chat/screens/SelectContactScreen';
import { RootStackParamList } from '../types/navigation';
import { useAuthStore } from '../features/auth/stores/authStore';

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