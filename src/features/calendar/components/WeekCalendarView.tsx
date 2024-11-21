import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { format, addDays, isSameDay } from 'date-fns';
import type { CalendarEventResponse } from '../services/calendarService';

interface WeekCalendarViewProps {
  events: CalendarEventResponse[];
  currentDate?: Date;
}

export const WeekCalendarView: React.FC<WeekCalendarViewProps> = ({ 
  events, 
  currentDate = new Date() 
}) => {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentDate, i));

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime);
      return isSameDay(eventDate, date);
    });
  };

  return (
    <ScrollView style={styles.container}>
      {weekDays.map((day, index) => (
        <View key={index} style={styles.dayContainer}>
          <Text style={styles.dayHeader}>
            {format(day, 'EEE, MMM d')}
          </Text>
          <View style={styles.eventsContainer}>
            {getEventsForDay(day).map((event, eventIndex) => (
              <View key={eventIndex} style={styles.eventItem}>
                <Text style={styles.eventTime}>
                  {format(new Date(event.start.dateTime), 'h:mm a')}
                </Text>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {event.summary}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dayContainer: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dayHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  eventsContainer: {
    marginLeft: 10,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  eventTime: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  eventTitle: {
    fontSize: 14,
    flex: 1,
  },
});

export default WeekCalendarView;