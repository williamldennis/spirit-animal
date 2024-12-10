import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import { emailService } from '../services/emailService';
import { useAuthStore } from '../../auth/stores/authStore';
import { Email } from '../types';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { logger } from '../../../utils/logger';
import EmailContent from '../components/EmailContent';

type Props = NativeStackScreenProps<RootStackParamList, 'EmailDetail'>;

export default function EmailDetailScreen() {
  const [email, setEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const route = useRoute<Props['route']>();
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    loadEmail();
  }, []);

  const loadEmail = async () => {
    if (!user?.uid) return;
    
    try {
      const emailData = await emailService.fetchEmailDetails(user.uid, route.params.emailId);
      setEmail(emailData);
    } catch (error) {
      logger.error('EmailDetailScreen.loadEmail', 'Failed to load email', { error });
      Alert.alert('Error', 'Failed to load email');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!email) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Email not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => navigation.navigate('ComposeEmail', { replyTo: email })}
          >
            <Feather name="corner-down-left" size={24} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => navigation.navigate('ComposeEmail', { forward: email })}
          >
            <Feather name="corner-up-right" size={24} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.subject}>{email.subject}</Text>
        <View style={styles.metadata}>
          <Text style={styles.from}>{email.from}</Text>
          <Text style={styles.date}>
            {format(new Date(email.date), 'PPp')}
          </Text>
        </View>
        {email.to.length > 0 && (
          <Text style={styles.to}>
            To: {email.to.join(', ')}
          </Text>
        )}
        <EmailContent html={email.bodyHtml} text={email.body} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    height: 56,
    marginTop: 44,
  },
  headerButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  subject: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  metadata: {
    marginBottom: 12,
  },
  from: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#6B7280',
  },
  to: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
}); 