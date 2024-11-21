import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../types/navigation';
import type { CalendarEvent } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;

export function EventDetailScreen({ route, navigation }: Props) {
  const { event } = route.params;

  const handleEdit = () => {
    navigation.navigate('EditEvent', { event });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{event.summary}</Text>
        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
          <Ionicons name="pencil" size={24} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Time</Text>
        <Text style={styles.sectionContent}>
          {format(new Date(event.start.dateTime), 'PPP p')}
        </Text>
      </View>

      {event.location && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.sectionContent}>{event.location}</Text>
        </View>
      )}

      {event.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.sectionContent}>{event.description}</Text>
        </View>
      )}

      {event.attendees && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendees</Text>
          {event.attendees.map((attendee, index) => (
            <View key={index} style={styles.attendeeItem}>
              <Text style={styles.attendeeName}>{attendee.email}</Text>
              <Text style={styles.attendeeStatus}>{attendee.responseStatus}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  editButton: {
    padding: 8,
  },
  section: {
    padding: 16,
    backgroundColor: 'white',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 16,
    color: '#111827',
  },
  attendeeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  attendeeName: {
    fontSize: 16,
    color: '#111827',
  },
  attendeeStatus: {
    fontSize: 14,
    color: '#6B7280',
  },
}); 