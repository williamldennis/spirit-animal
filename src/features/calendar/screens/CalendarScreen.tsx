import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
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
});

export default CalendarScreen; 