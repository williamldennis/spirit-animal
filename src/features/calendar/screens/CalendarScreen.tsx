import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { calendarService } from '../services/calendarService';
import WeekCalendarView from '../components/WeekCalendarView';
import { useAuthStore } from '../../../features/auth/stores/authStore';
import type { CalendarEventResponse } from '../services/calendarService';
import AddEventModal from '../components/AddEventModal';
import { logger } from '../../../utils/logger';

export const CalendarScreen = () => {
  const [events, setEvents] = useState<CalendarEventResponse[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore(state => state.user);

  const loadEvents = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      const connected = await calendarService.isCalendarConnected(user.uid);
      logger.debug('CalendarScreen.loadEvents', 'Calendar connection status', { connected });
      setIsConnected(connected);

      if (connected) {
        const calendarEvents = await calendarService.fetchUpcomingEvents(user.uid, 30);
        logger.debug('CalendarScreen.loadEvents', 'Fetched events', { 
          count: calendarEvents.length,
          sampleEvent: calendarEvents[0]?.summary 
        });
        setEvents(calendarEvents);
      }
    } catch (error) {
      logger.error('CalendarScreen.loadEvents', 'Failed to load events', { error });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 30000);
    return () => clearInterval(interval);
  }, [user?.uid]);

  const handleConnectCalendar = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      const success = await calendarService.connectGoogleCalendar(user.uid);
      logger.debug('CalendarScreen.handleConnectCalendar', 'Connection result', { success });
      
      if (success) {
        await loadEvents();
      }
    } catch (error) {
      logger.error('CalendarScreen.handleConnectCalendar', 'Failed to connect calendar', { error });
    } finally {
      setLoading(false);
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
        <Text style={styles.message}>Calendar not connected</Text>
        <TouchableOpacity 
          style={styles.connectButton}
          onPress={handleConnectCalendar}
        >
          <Text style={styles.connectButtonText}>Connect Google Calendar</Text>
        </TouchableOpacity>
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