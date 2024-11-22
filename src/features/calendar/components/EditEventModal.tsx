import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useAuthStore } from '../../../features/auth/stores/authStore';
import { calendarService } from '../services/calendarService';
import { logger } from '../../../utils/logger';
import type { CalendarEventResponse } from '../services/calendarService';
import { Feather } from '@expo/vector-icons';
import { getStatusColor, getStatusText } from '../utils/eventHelpers';

interface EditEventModalProps {
  visible: boolean;
  onClose: () => void;
  event: CalendarEventResponse;
}

interface Attendee {
  email: string;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  self?: boolean;
}

export default function EditEventModal({ visible, onClose, event }: EditEventModalProps) {
  const [title, setTitle] = useState(event.summary);
  const [description, setDescription] = useState(event.description || '');
  const [startDate, setStartDate] = useState(new Date(event.start.dateTime));
  const [endDate, setEndDate] = useState(new Date(event.end.dateTime));
  const [attendees, setAttendees] = useState<Attendee[]>(event.attendees || []);
  const [newAttendee, setNewAttendee] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const user = useAuthStore(state => state.user);

  const handleAddAttendee = () => {
    if (!newAttendee.trim()) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newAttendee)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setAttendees(prev => [...prev, { 
      email: newAttendee.trim(),
      responseStatus: 'needsAction'
    }]);
    setNewAttendee('');
  };

  const handleRemoveAttendee = (email: string) => {
    setAttendees(prev => prev.filter(a => a.email !== email));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    if (endDate <= startDate) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    setLoading(true);
    try {
      if (!user?.uid) throw new Error('User not authenticated');

      const updatedEvent = {
        ...event,
        summary: title,
        description,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        attendees: attendees.length > 0 ? attendees : undefined
      };

      await calendarService.updateEvent(user.uid, event.id, updatedEvent);
      onClose();
    } catch (error) {
      logger.error('EditEventModal', 'Failed to update event', { error });
      Alert.alert('Error', 'Failed to update event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              if (!user?.uid) throw new Error('User not authenticated');
              await calendarService.deleteEvent(user.uid, event.id);
              onClose();
            } catch (error) {
              logger.error('EditEventModal', 'Failed to delete event', { error });
              Alert.alert('Error', 'Failed to delete event. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Event</Text>
          
          <ScrollView style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Event Title"
              value={title}
              onChangeText={setTitle}
              editable={!loading}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              editable={!loading}
            />

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={styles.dateButtonLabel}>Start Time</Text>
              <Text style={styles.dateButtonText}>
                {format(startDate, 'PPp')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={styles.dateButtonLabel}>End Time</Text>
              <Text style={styles.dateButtonText}>
                {format(endDate, 'PPp')}
              </Text>
            </TouchableOpacity>

            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="datetime"
                onChange={(event, date) => {
                  setShowStartPicker(false);
                  if (date) setStartDate(date);
                }}
              />
            )}

            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="datetime"
                onChange={(event, date) => {
                  setShowEndPicker(false);
                  if (date) setEndDate(date);
                }}
              />
            )}

            <View style={styles.attendeesSection}>
              <Text style={styles.sectionTitle}>Attendees</Text>
              <View style={styles.addAttendeeContainer}>
                <TextInput
                  style={[styles.input, styles.attendeeInput]}
                  placeholder="Add attendee email"
                  value={newAttendee}
                  onChangeText={setNewAttendee}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddAttendee}
                  disabled={!newAttendee.trim()}
                >
                  <Feather name="plus" size={24} color="#2563EB" />
                </TouchableOpacity>
              </View>

              {attendees.map((attendee, index) => (
                <View key={index} style={styles.attendeeItem}>
                  <Text style={styles.attendeeEmail}>
                    {attendee.email}
                    {attendee.self && ' (You)'}
                  </Text>
                  {attendee.responseStatus && (
                    <Text style={[
                      styles.attendeeStatus,
                      { color: getStatusColor(attendee.responseStatus) }
                    ]}>
                      {getStatusText(attendee.responseStatus)}
                    </Text>
                  )}
                  {!attendee.self && (
                    <TouchableOpacity
                      onPress={() => handleRemoveAttendee(attendee.email)}
                      style={styles.removeButton}
                    >
                      <Feather name="x" size={20} color="#DC2626" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.deleteButton]}
              onPress={handleDelete}
              disabled={loading}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
  },
  form: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  dateButtonLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#2563EB',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  attendeesSection: {
    marginTop: 16,
  },
  addAttendeeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  attendeeInput: {
    flex: 1,
    marginBottom: 0,
  },
  addButton: {
    padding: 8,
  },
  attendeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  attendeeEmail: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  attendeeStatus: {
    fontSize: 12,
    marginRight: 8,
    fontStyle: 'italic',
  },
  removeButton: {
    padding: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
}); 