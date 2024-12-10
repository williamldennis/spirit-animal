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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { emailService } from '../services/emailService';
import { useAuthStore } from '../../auth/stores/authStore';
import { Email } from '../types';
import { format } from 'date-fns';
import ConnectGmailButton from '../components/ConnectGmailButton';
import { logger } from '../../../utils/logger';
import { Swipeable } from 'react-native-gesture-handler';
import { useTaskStore } from '../../tasks/stores/taskStore';
import Toast from 'react-native-toast-message';

export default function EmailScreen() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const navigation = useNavigation();
  const user = useAuthStore(state => state.user);

  useFocusEffect(
    React.useCallback(() => {
      checkConnection();
    }, [])
  );

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

  const loadEmails = async (forceRefresh = false) => {
    if (!user?.uid) return;
    
    try {
      if (!forceRefresh) {
        setLoading(true);
      }
      const fetchedEmails = await emailService.fetchEmails(user.uid, forceRefresh);
      setEmails(fetchedEmails);
    } catch (error) {
      Alert.alert('Error', 'Failed to load emails');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEmails(true);
  };

  const handleConnectGmail = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      setIsConnected(true);
      loadEmails();
    } catch (error) {
      Alert.alert('Error', 'Failed to connect Gmail');
      setLoading(false);
    }
  };

  const handleArchive = async (emailId: string) => {
    if (!user?.uid) return;
    
    try {
      const success = await emailService.archiveEmail(user.uid, emailId);
      if (success) {
        // Remove the email from the local state
        setEmails(prevEmails => prevEmails.filter(email => email.id !== emailId));
        
        // Show success toast
        Toast.show({
          type: 'success',
          text1: 'Email Archived',
          text2: 'The email has been moved to archive',
          position: 'bottom',
          visibilityTime: 2000,
        });
        
        logger.debug('EmailScreen', 'Email archived successfully', { emailId });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Archive Failed',
          text2: 'Unable to archive email',
          position: 'bottom',
        });
      }
    } catch (error) {
      logger.error('EmailScreen', 'Failed to archive email', { error });
      Toast.show({
        type: 'error',
        text1: 'Archive Failed',
        text2: 'Unable to archive email',
        position: 'bottom',
      });
    }
  };

  const handleCreateTask = async (email: Email) => {
    if (!user?.uid) return;

    try {
      await useTaskStore.getState().addTask(user.uid, {
        title: email.subject,
        criteria: `Email Reference: ${email.id}\n\nFrom: ${email.from}\nDate: ${format(new Date(email.date), 'PPp')}\n\nTap to open original email.`,
        completed: false,
        dueDate: undefined
      });
      Alert.alert('Success', 'Task created from email');
    } catch (error) {
      logger.error('EmailScreen', 'Failed to create task from email', { error });
      Alert.alert('Error', 'Failed to create task');
    }
  };

  const renderEmailItem = ({ item }: { item: Email }) => {
    const renderRightActions = () => (
      <TouchableOpacity
        style={styles.swipeActionRight}
        onPress={() => handleArchive(item.id)}
      >
        <Feather name="archive" size={24} color="white" />
        <Text style={styles.swipeActionText}>Archive</Text>
      </TouchableOpacity>
    );

    const renderLeftActions = () => (
      <TouchableOpacity
        style={styles.swipeActionLeft}
        onPress={() => handleCreateTask(item)}
      >
        <Feather name="check-square" size={24} color="white" />
        <Text style={styles.swipeActionText}>Create Task</Text>
      </TouchableOpacity>
    );

    return (
      <Swipeable
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        friction={2}
        rightThreshold={40}
        leftThreshold={40}
      >
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
      </Swipeable>
    );
  };

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
        refreshing={refreshing}
        onRefresh={handleRefresh}
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
  swipeActionRight: {
    backgroundColor: '#4B5563',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
  },
  swipeActionLeft: {
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
  },
  swipeActionText: {
    color: 'white',
    fontSize: 14,
    marginTop: 4,
  },
}); 