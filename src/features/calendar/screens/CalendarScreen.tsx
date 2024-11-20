import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  FlatList,
  Alert
} from 'react-native';
import { calendarService } from '../services/calendarService';
import { useAuthStore } from '../../auth/stores/authStore';
import { logger } from '../../../utils/logger';

// Add type for events
interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime: string;
  };
}

export default function CalendarScreen() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    checkCalendarConnection();
  }, [user]);

  const checkCalendarConnection = async () => {
    if (!user) return;
    
    try {
      const connected = await calendarService.isCalendarConnected(user.uid);
      setIsConnected(connected);
      if (connected) {
        fetchEvents();
      }
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
      logger.debug('CalendarScreen.handleConnectCalendar', 'Starting connection attempt', {
        userId: user.uid,
        hasAuth: calendarService.getGoogleAuthStatus()
      });

      const success = await calendarService.connectGoogleCalendar(user.uid);
      
      logger.debug('CalendarScreen.handleConnectCalendar', 'Connection result', {
        success
      });

      if (success) {
        setIsConnected(true);
        fetchEvents();
      }
    } catch (error) {
      logger.error('CalendarScreen.handleConnectCalendar', 'Failed to connect', { 
        error,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      Alert.alert('Error', 'Failed to connect Google Calendar. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const upcomingEvents = await calendarService.fetchUpcomingEvents(user.uid);
      setEvents(upcomingEvents);
    } catch (error) {
      logger.error('CalendarScreen', 'Failed to fetch events', { error });
      Alert.alert('Error', 'Failed to fetch calendar events. Please try again.');
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

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.eventItem}>
            <Text style={styles.eventTitle}>{item.summary}</Text>
            <Text style={styles.eventTime}>
              {new Date(item.start.dateTime).toLocaleString()}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No upcoming events</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
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
  eventItem: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
}); 