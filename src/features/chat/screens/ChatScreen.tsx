import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import { logger } from '../../../utils/logger';
import { useAuthStore } from '../../auth/stores/authStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;
type Message = {
  id: string;
  text: string;
  senderId: string;
  createdAt: Date;
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const route = useRoute<Props['route']>();
  const { chatId } = route.params;
  const user = useAuthStore(state => state.user);

  // Load chat messages
  useEffect(() => {
    const loadMessages = async () => {
      logger.info('ChatScreen', 'Loading messages', { chatId });
      try {
        // TODO: Implement message loading from Firebase
        setLoading(false);
      } catch (error) {
        logger.error('ChatScreen', 'Error loading messages', { error });
        setLoading(false);
      }
    };

    loadMessages();
  }, [chatId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) {
      logger.debug('ChatScreen', 'Invalid message or user state', { 
        messageLength: newMessage.length,
        hasUser: !!user 
      });
      return;
    }

    logger.info('ChatScreen', 'Sending message', { chatId });
    try {
      // TODO: Implement message sending to Firebase
      setNewMessage('');
    } catch (error) {
      logger.error('ChatScreen', 'Error sending message', { error });
    }
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
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Chat</Text>
          {/* TODO: Show other user's name */}
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <Feather name="more-vertical" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.messagesList}
          renderItem={({ item }) => (
            <View style={[
              styles.messageContainer,
              item.senderId === user?.uid ? styles.sentMessage : styles.receivedMessage
            ]}>
              <Text style={[
                styles.messageText,
                item.senderId === user?.uid ? styles.sentMessageText : styles.receivedMessageText
              ]}>
                {item.text}
              </Text>
            </View>
          )}
        />
      )}

      {/* Message Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            <Feather 
              name="send" 
              size={24} 
              color={newMessage.trim() ? '#2563EB' : '#9CA3AF'} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerButton: {
    padding: 8,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 16,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563EB',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 16,
  },
  sentMessageText: {
    color: 'white',
  },
  receivedMessageText: {
    color: '#111827',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    marginRight: 12,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
  },
}); 