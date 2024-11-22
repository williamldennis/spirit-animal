import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { format, addDays, isSameDay } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../types/navigation';
import type { CalendarEventResponse } from '../services/calendarService';

interface WeekCalendarViewProps {
  events: CalendarEventResponse[];
  currentDate?: Date;
  daysToShow?: number;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const WeekCalendarView: React.FC<WeekCalendarViewProps> = ({ 
  events, 
  currentDate = new Date(),
  daysToShow = 30
}) => {
  const navigation = useNavigation<NavigationProp>();
  const days = Array.from({ length: daysToShow }, (_, i) => addDays(currentDate, i));

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime);
      return isSameDay(eventDate, date);
    });
  };

  const handleEventPress = (event: CalendarEventResponse) => {
    navigation.navigate('EventDetail', { event });
  };

  return (
    <ScrollView style={styles.container}>
      {days.map((day, index) => (
        <View key={index} style={styles.dayContainer}>
          <Text style={[
            styles.dayHeader,
            isSameDay(day, new Date()) && styles.todayHeader
          ]}>
            {format(day, 'EEE, MMM d')}
          </Text>
          <View style={styles.eventsContainer}>
            {getEventsForDay(day).map((event, eventIndex) => (
              <TouchableOpacity
                key={eventIndex}
                style={styles.eventItem}
                onPress={() => handleEventPress(event)}
              >
                <Text style={styles.eventTime}>
                  {format(new Date(event.start.dateTime), 'h:mm a')}
                </Text>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {event.summary}
                </Text>
              </TouchableOpacity>
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
  todayHeader: {
    color: '#2563EB',
    fontWeight: '700',
  },
});

export default WeekCalendarView;