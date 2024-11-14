import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import type { NavigationContainerProps } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SignInScreen from '../features/auth/screens/SignInScreen';
import { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

const Container: React.FC<NavigationContainerProps> = NavigationContainer;

export default function AppNavigator() {
  return (
    <Container>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          contentStyle: { backgroundColor: '#F9FAFB' }
        }}
      >
        <Stack.Screen 
          name="SignIn" 
          component={SignInScreen} 
        />
      </Stack.Navigator>
    </Container>
  );
} 