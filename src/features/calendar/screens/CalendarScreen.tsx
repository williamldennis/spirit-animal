import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { calendarService } from '../services/calendarService';
import { useAuthStore } from '../../auth/stores/authStore';
import { logger } from '../../../utils/logger';
import WeekCalendarView from '../components/WeekCalendarView';

export default function CalendarScreen() {
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    checkCalendarConnection();
  }, [user]);

  const checkCalendarConnection = async () => {
    if (!user) return;
    
    try {
      const connected = await calendarService.isCalendarConnected(user.uid);
      logger.debug('CalendarScreen', 'Calendar connection status', { connected });
      setIsConnected(connected);
    } catch (error) {
      logger.error('CalendarScreen', 'Failed to check calendar connection', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectCalendar = async () => {
    if (!user) return;

    try {
      setLoading(true);
      logger.debug('CalendarScreen.handleConnectCalendar', 'Starting connection');
      
      const success = await calendarService.connectGoogleCalendar(user.uid);
      logger.debug('CalendarScreen.handleConnectCalendar', 'Connection result', { success });
      
      if (success) {
        logger.debug('CalendarScreen.handleConnectCalendar', 'Connection successful, updating state');
        setIsConnected(true);
      } else {
        logger.warn('CalendarScreen.handleConnectCalendar', 'Connection unsuccessful');
        setIsConnected(false);
        Alert.alert('Error', 'Failed to connect Google Calendar. Please try again.');
      }
    } catch (error) {
      logger.error('CalendarScreen', 'Failed to connect calendar', { error });
      setIsConnected(false);
      Alert.alert('Error', 'Failed to connect Google Calendar. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!isConnected) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>Connect Your Calendar</Text>
        <Text style={styles.subtitle}>
          Connect your Google Calendar to see your upcoming events
        </Text>
        <TouchableOpacity 
          style={styles.connectButton}
          onPress={handleConnectCalendar}
        >
          <Text style={styles.connectButtonText}>
            Connect Google Calendar
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <WeekCalendarView />;
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  connectButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  connectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
}); 