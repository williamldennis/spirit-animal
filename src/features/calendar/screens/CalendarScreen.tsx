import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { calendarService } from '../services/calendarService';
import WeekCalendarView from '../components/WeekCalendarView';
import { useAuthStore } from '../../../features/auth/stores/authStore';
import type { CalendarEventResponse } from '../services/calendarService';
import AddEventModal from '../components/AddEventModal';

export const CalendarScreen = () => {
  const [events, setEvents] = useState<CalendarEventResponse[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    const loadEvents = async () => {
      if (user?.uid) {
        try {
          setLoading(true);
          const connected = await calendarService.isCalendarConnected(user.uid);
          setIsConnected(connected);

          if (connected) {
            const calendarEvents = await calendarService.fetchUpcomingEvents(user.uid, 30);
            console.log('Fetched calendar events:', calendarEvents);
            setEvents(calendarEvents);
          }
        } catch (error) {
          console.error('Failed to load calendar events:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadEvents();
  }, [user?.uid]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (events.length === 0 && isConnected) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.message}>No events found</Text>
      </View>
    );
  }

  if (!isConnected) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.message}>Calendar not connected</Text>
        <TouchableOpacity 
          style={styles.connectButton}
          onPress={() => calendarService.connectGoogleCalendar(user?.uid || '')}
        >
          <Text style={styles.connectButtonText}>Connect Google Calendar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WeekCalendarView 
        events={events} 
        daysToShow={30} 
      />
      
      <AddEventModal 
        visible={showAddEvent} 
        onClose={() => setShowAddEvent(false)}
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
  },
});

export default CalendarScreen; 