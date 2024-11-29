import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { emailService } from '../services/emailService';
import { useAuthStore } from '../../auth/stores/authStore';
import { logger } from '../../../utils/logger';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { ENV } from '../../../config/env';

WebBrowser.maybeCompleteAuthSession();

interface Props {
  onSuccess?: () => void;
}

export default function ConnectGmailButton({ onSuccess }: Props) {
  const [connecting, setConnecting] = useState(false);
  const user = useAuthStore(state => state.user);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: ENV.GOOGLE_WEB_CLIENT_ID,
    iosClientId: ENV.GOOGLE_IOS_CLIENT_ID,
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify'
    ],
  });

  useEffect(() => {
    if (response?.type === 'success' && user?.uid) {
      const { accessToken } = response.authentication || {};
      if (accessToken) {
        handleAuthSuccess(accessToken);
      }
    }
  }, [response]);

  const handleAuthSuccess = async (accessToken?: string) => {
    if (!accessToken || !user?.uid) return;

    try {
      setConnecting(true);
      const success = await emailService.connectGmail(user.uid, accessToken);
      
      if (success) {
        onSuccess?.();
      } else {
        Alert.alert('Error', 'Failed to connect Gmail. Please try again.');
      }
    } catch (error) {
      logger.error('ConnectGmailButton', 'Failed to connect Gmail', { error });
      Alert.alert('Error', 'Failed to connect Gmail. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const handleConnect = async () => {
    if (!user?.uid) return;

    try {
      setConnecting(true);
      await promptAsync();
    } catch (error) {
      logger.error('ConnectGmailButton', 'Failed to connect Gmail', { error });
      Alert.alert('Error', 'Failed to connect Gmail. Please try again.');
      setConnecting(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleConnect}
      disabled={connecting || !request}
    >
      {connecting ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text style={styles.buttonText}>Connect Gmail</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
}); 