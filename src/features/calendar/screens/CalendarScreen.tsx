import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { calendarService } from '../services/calendarService';
import WeekCalendarView from '../components/WeekCalendarView';
import { useAuthStore } from '../../../features/auth/stores/authStore';
import type { CalendarEventResponse } from '../services/calendarService';
import AddEventModal from '../components/AddEventModal';
import { logger } from '../../../utils/logger';
import ConnectCalendarButton from '../components/ConnectCalendarButton';

export const CalendarScreen = () => {
  const [events, setEvents] = useState<CalendarEventResponse[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    if (!user?.uid) return;
    
    try {
      const connected = await calendarService.isCalendarConnected(user.uid);
      logger.debug('CalendarScreen', 'Calendar connection status', { connected });
      setIsConnected(connected);
      setLoading(false);
      
      if (connected) {
        loadEvents();
      }
    } catch (error) {
      logger.error('CalendarScreen', 'Failed to check calendar connection', { error });
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    if (!user?.uid) return;
    
    try {
      const calendarEvents = await calendarService.fetchUpcomingEvents(user.uid, 30);
      logger.debug('CalendarScreen.loadEvents', 'Fetched events', { 
        count: calendarEvents.length,
        sampleEvent: calendarEvents[0] ? {
          summary: calendarEvents[0].summary,
          start: calendarEvents[0].start
        } : null
      });
      setEvents(calendarEvents);
    } catch (error) {
      logger.error('CalendarScreen.loadEvents', 'Failed to load events', { error });
    }
  };

  const handleAddEventClose = async () => {
    setShowAddEvent(false);
    await loadEvents();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!isConnected) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.message}>Connect your Google Calendar to get started</Text>
        <ConnectCalendarButton 
          onSuccess={() => {
            setIsConnected(true);
            loadEvents();
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WeekCalendarView events={events} daysToShow={30} />
      
      <AddEventModal 
        visible={showAddEvent} 
        onClose={handleAddEventClose}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  connectButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  connectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  }
});

export default CalendarScreen; 