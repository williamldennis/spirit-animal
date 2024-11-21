import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { format, addDays, startOfDay, isSameDay, parseISO } from 'date-fns';
import { calendarService } from '../services/calendarService';
import { logger } from '../../../utils/logger';
import { useAuthStore } from '../../auth/stores/authStore';

interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
}

export default function WeekCalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!user?.uid) return;
      
      try {
        setLoading(true);
        const fetchedEvents = await calendarService.fetchUpcomingEvents(user.uid);
        setEvents(fetchedEvents);
      } catch (error) {
        logger.error('WeekCalendarView', 'Failed to fetch events', { error });
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [user]);

  const formatEventDate = (event: CalendarEvent) => {
    try {
      // Handle both full dateTime and date-only formats
      const dateString = event.start.dateTime || event.start.date;
      if (!dateString) {
        return 'No date';
      }

      const date = parseISO(dateString);
      
      // If we have a time component (dateTime), show it
      if (event.start.dateTime) {
        return format(date, 'MMM d, h:mm a');
      }
      
      // For all-day events (date only)
      return format(date, 'MMM d');
    } catch (error) {
      logger.error('WeekCalendarView.formatEventDate', 'Failed to format date', {
        event,
        error
      });
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.eventsContainer}>
        {events.length > 0 ? (
          events.map((event) => (
            <View key={event.id} style={styles.eventItem}>
              <View style={styles.eventTime}>
                <Text style={styles.timeText}>
                  {formatEventDate(event)}
                </Text>
              </View>
              <View style={styles.eventContent}>
                <Text style={styles.eventTitle}>{event.summary}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.noEventsContainer}>
            <Text style={styles.noEventsText}>No upcoming events</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventsContainer: {
    flex: 1,
    padding: 16,
  },
  eventItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventTime: {
    marginRight: 12,
    minWidth: 100,
  },
  timeText: {
    fontSize: 14,
    color: '#6B7280',
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  noEventsContainer: {
    padding: 24,
    alignItems: 'center',
  },
  noEventsText: {
    fontSize: 16,
    color: '#6B7280',
  },
});