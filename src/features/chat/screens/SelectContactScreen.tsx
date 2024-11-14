import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Contacts from 'expo-contacts';
import { logger } from '../../../utils/logger';

type Contact = {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
};

export default function SelectContactScreen() {
  const navigation = useNavigation();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      logger.info('SelectContactScreen', 'Requesting contacts permission');
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status === 'granted') {
        logger.info('SelectContactScreen', 'Loading contacts');
        const { data } = await Contacts.getContactsAsync({
          fields: [
            Contacts.Fields.Emails,
            Contacts.Fields.PhoneNumbers,
            Contacts.Fields.Name,
          ],
        });

        if (data.length > 0) {
          const formattedContacts: Contact[] = data
            .filter(contact => contact.name) // Only include contacts with names
            .map(contact => ({
              id: contact.id,
              name: contact.name || 'No Name',
              email: contact.emails?.[0]?.email,
              phoneNumber: contact.phoneNumbers?.[0]?.number,
            }));

          logger.info('SelectContactScreen', 'Contacts loaded', { count: formattedContacts.length });
          setContacts(formattedContacts);
        } else {
          logger.warn('SelectContactScreen', 'No contacts found');
        }
      } else {
        logger.warn('SelectContactScreen', 'Contacts permission denied');
        Alert.alert(
          'Permission Required',
          'Please enable contacts permission to chat with your contacts.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      logger.error('SelectContactScreen', 'Error loading contacts', { error });
      Alert.alert(
        'Error',
        'Could not load contacts. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContact = (contact: Contact) => {
    logger.info('SelectContactScreen', 'Contact selected', { contactId: contact.id });
    // TODO: Create chat with contact
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Chat</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color="#6B7280" />
        <Text style={styles.searchPlaceholder}>Search contacts...</Text>
      </View>

      {/* Contacts List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <Text>Loading contacts...</Text>
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text>No contacts found</Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => handleSelectContact(item)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.name.charAt(0)}
                </Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.name}</Text>
                {item.email && (
                  <Text style={styles.contactEmail}>{item.email}</Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchPlaceholder: {
    marginLeft: 8,
    color: '#6B7280',
    fontSize: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  contactInfo: {
    marginLeft: 12,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  contactEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 