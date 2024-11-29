import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { emailService } from '../services/emailService';
import { useAuthStore } from '../../auth/stores/authStore';
import { Email } from '../types';
import { format } from 'date-fns';
import ConnectGmailButton from '../components/ConnectGmailButton';
import { logger } from '../../../utils/logger';

export default function EmailScreen() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const navigation = useNavigation();
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    if (!user?.uid) return;
    
    try {
      const connected = await emailService.isGmailConnected(user.uid);
      logger.debug('EmailScreen', 'Gmail connection status', { connected });
      setIsConnected(connected);
      setLoading(false);
      
      if (connected) {
        loadEmails();
      }
    } catch (error) {
      logger.error('EmailScreen', 'Failed to check Gmail connection', { error });
      setLoading(false);
    }
  };

  const loadEmails = async () => {
    if (!user?.uid) return;
    
    try {
      const fetchedEmails = await emailService.fetchEmails(user.uid);
      setEmails(fetchedEmails);
    } catch (error) {
      Alert.alert('Error', 'Failed to load emails');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGmail = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      const success = await emailService.connectGmail(user.uid);
      if (success) {
        setIsConnected(true);
        loadEmails();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect Gmail');
      setLoading(false);
    }
  };

  const renderEmailItem = ({ item }: { item: Email }) => (
    <TouchableOpacity
      style={styles.emailItem}
      onPress={() => navigation.navigate('EmailDetail', { emailId: item.id })}
    >
      <View style={styles.emailHeader}>
        <Text style={styles.sender}>{item.from}</Text>
        <Text style={styles.date}>{format(new Date(item.date), 'MMM d')}</Text>
      </View>
      <Text style={styles.subject} numberOfLines={1}>{item.subject}</Text>
      <Text style={styles.preview} numberOfLines={2}>{item.snippet}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!isConnected) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.message}>Connect your Gmail account to get started</Text>
        <ConnectGmailButton 
          onSuccess={() => {
            setIsConnected(true);
            loadEmails();
          }} 
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={emails}
        renderItem={renderEmailItem}
        keyExtractor={item => item.id}
        refreshing={loading}
        onRefresh={loadEmails}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ComposeEmail')}
      >
        <Feather name="edit" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
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
  emailItem: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  emailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sender: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  date: {
    fontSize: 14,
    color: '#6B7280',
  },
  subject: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  preview: {
    fontSize: 14,
    color: '#6B7280',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#2563EB',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
}); 