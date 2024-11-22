import React, { useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../types/navigation';
import EditEventModal from '../components/EditEventModal';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;

const EventDetailScreen = ({ route, navigation }: Props) => {
  const { event } = route.params;
  const [showEditModal, setShowEditModal] = useState(false);

  // Configure the navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: event.summary,
      headerShown: true,
      headerRight: () => (
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => setShowEditModal(true)}
        >
          <Feather name="edit-2" size={24} color="#2563EB" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, event]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Time</Text>
        <Text style={styles.sectionContent}>
          {format(new Date(event.start.dateTime), 'PPpp')} - {'\n'}
          {format(new Date(event.end.dateTime), 'PPpp')}
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

      {event.attendees && event.attendees.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendees</Text>
          {event.attendees.map((attendee, index) => (
            <View key={index} style={styles.attendeeItem}>
              <Text style={styles.attendeeName}>{attendee.email}</Text>
              <Text style={styles.attendeeStatus}>
                {attendee.responseStatus === 'accepted' ? 'Going' : 
                 attendee.responseStatus === 'declined' ? 'Not Going' : 
                 attendee.responseStatus === 'tentative' ? 'Maybe' : 'Pending'}
              </Text>
            </View>
          ))}
        </View>
      )}

      <EditEventModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        event={event}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  section: {
    padding: 16,
    backgroundColor: 'white',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 24,
  },
  attendeeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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

export default EventDetailScreen; 