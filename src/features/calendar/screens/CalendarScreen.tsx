import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { calendarService } from '../services/calendarService';
import { WeekCalendarView } from '../components/WeekCalendarView';
import { useAuthStore } from '../../../features/auth/stores/authStore';
import type { CalendarEventResponse } from '../services/calendarService';
import AddEventModal from '../components/AddEventModal';

export const CalendarScreen = () => {
  const [events, setEvents] = useState<CalendarEventResponse[]>([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    const loadEvents = async () => {
      if (user?.uid) {
        try {
          const calendarEvents = await calendarService.fetchUpcomingEvents(user.uid);
          setEvents(calendarEvents);
        } catch (error) {
          console.error('Failed to load calendar events:', error);
        }
      }
    };

    loadEvents();
  }, [user?.uid]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddEvent(true)}
        >
          <Feather name="plus" size={24} color="#2563EB" />
        </TouchableOpacity>
      </View>
      
      <WeekCalendarView events={events} />
      
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
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  addButton: {
    padding: 8,
  },
});

export default CalendarScreen; 