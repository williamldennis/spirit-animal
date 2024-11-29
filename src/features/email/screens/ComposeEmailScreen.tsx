import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import { emailService } from '../services/emailService';
import { useAuthStore } from '../../auth/stores/authStore';
import { Feather } from '@expo/vector-icons';
import { logger } from '../../../utils/logger';

type Props = NativeStackScreenProps<RootStackParamList, 'ComposeEmail'>;

export default function ComposeEmailScreen() {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const navigation = useNavigation();
  const route = useRoute<Props['route']>();
  const user = useAuthStore(state => state.user);

  // Pre-fill fields if replying or forwarding
  React.useEffect(() => {
    if (route.params?.replyTo) {
      setTo(route.params.replyTo.from);
      setSubject(`Re: ${route.params.replyTo.subject}`);
      setBody(`\n\nOn ${route.params.replyTo.date}, ${route.params.replyTo.from} wrote:\n> ${route.params.replyTo.body}`);
    } else if (route.params?.forward) {
      setSubject(`Fwd: ${route.params.forward.subject}`);
      setBody(`\n\n---------- Forwarded message ---------\nFrom: ${route.params.forward.from}\nDate: ${route.params.forward.date}\nSubject: ${route.params.forward.subject}\n\n${route.params.forward.body}`);
    }
  }, [route.params]);

  const handleSend = async () => {
    if (!user?.uid) return;
    
    if (!to.trim()) {
      Alert.alert('Error', 'Please enter a recipient');
      return;
    }

    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }

    try {
      setSending(true);
      const success = await emailService.sendEmail(user.uid, {
        to: to.split(',').map(email => email.trim()),
        subject: subject.trim(),
        body: body.trim()
      });

      if (success) {
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Failed to send email');
      }
    } catch (error) {
      logger.error('ComposeEmailScreen.handleSend', 'Failed to send email', { error });
      Alert.alert('Error', 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const getHeaderTitle = () => {
    if (route.params?.replyTo) {
      return 'Reply';
    }
    if (route.params?.forward) {
      return 'Forward';
    }
    return 'New Message';
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.headerButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        <TouchableOpacity
          onPress={handleSend}
          disabled={sending}
          style={[styles.headerButton, sending && styles.headerButtonDisabled]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <TextInput
          style={styles.input}
          placeholder="To"
          value={to}
          onChangeText={setTo}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!sending}
        />
        <TextInput
          style={styles.input}
          placeholder="Subject"
          value={subject}
          onChangeText={setSubject}
          autoCapitalize="sentences"
          editable={!sending}
        />
        <TextInput
          style={[styles.input, styles.bodyInput]}
          placeholder="Email body"
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
          editable={!sending}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
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
    marginTop: 44, // Add top margin for iOS status bar
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
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerButtonText: {
    color: '#6B7280',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  sendButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  input: {
    padding: 16,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  bodyInput: {
    flex: 1,
    height: 300,
    borderBottomWidth: 0,
  },
}); 