import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { calendarService } from '../services/calendarService';
import { useAuthStore } from '../../auth/stores/authStore';
import { logger } from '../../../utils/logger';

interface Props {
  onSuccess?: () => void;
}

export default function ConnectCalendarButton({ onSuccess }: Props) {
  const [connecting, setConnecting] = useState(false);
  const user = useAuthStore(state => state.user);

  const handleConnect = async () => {
    if (!user?.uid) return;

    try {
      setConnecting(true);
      const success = await calendarService.connectGoogleCalendar(user.uid);
      
      if (success) {
        onSuccess?.();
      } else {
        Alert.alert('Error', 'Failed to connect Calendar. Please try again.');
      }
    } catch (error) {
      logger.error('ConnectCalendarButton', 'Failed to connect Calendar', { error });
      Alert.alert('Error', 'Failed to connect Calendar. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleConnect}
      disabled={connecting}
    >
      {connecting ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text style={styles.buttonText}>Connect Google Calendar</Text>
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