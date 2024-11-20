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
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import { logger } from '../../../utils/logger';
import { useAuthStore } from '../../auth/stores/authStore';
import { Message, chatService } from '../services/chatService';
import { Chat } from '../services/chatService';
import { userService, UserProfile } from '../../auth/services/userService';
import { SafeTextInput } from '../../../shared/components/SafeTextInput';
import { useAI } from '../../ai/hooks/useAI';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const navigation = useNavigation();
  const route = useRoute<Props['route']>();
  const { chatId } = route.params;
  const user = useAuthStore(state => state.user);
  const { processUserInput, isProcessing: aiProcessing } = useAI();

  // Load chat details and other user's profile
  useEffect(() => {
    const loadChatDetails = async () => {
      try {
        const chatDetails = await chatService.getChatDetails(chatId);
        setChat(chatDetails);

        // Find the other user's ID
        if (user) {
          const otherUserId = chatDetails.participants.find(id => id !== user.uid);
          if (otherUserId) {
            const profile = await userService.getUserProfile(otherUserId);
            if (profile) {
              logger.info('ChatScreen', 'Loaded other user profile', { 
                userId: otherUserId,
                name: profile.name 
              });
              setOtherUser(profile);
            }
          }
        }
      } catch (error) {
        logger.error('ChatScreen', 'Error loading chat details', { error });
      }
    };

    loadChatDetails();
  }, [chatId, user]);

  // Subscribe to messages
  useEffect(() => {
    logger.info('ChatScreen', 'Setting up messages subscription');
    const unsubscribe = chatService.subscribeToMessages(chatId, (newMessages) => {
      setMessages(newMessages);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
      logger.info('ChatScreen', 'Cleaning up messages subscription');
      unsubscribe();
    };
  }, [chatId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || sending) {
      return;
    }

    const trimmedMessage = newMessage.trim();
    setSending(true);

    try {
      // Check if message is directed to AI
      if (trimmedMessage.toLowerCase().startsWith('@spiritanimal')) {
        const aiQuery = trimmedMessage.substring('@spiritanimal'.length).trim();
        
        // First send the user's message
        await chatService.sendMessage(chatId, user.uid, trimmedMessage);
        
        // Process with AI and send response
        const aiResponse = await processUserInput(aiQuery);
        if (aiResponse.text) {
          await chatService.sendMessage(chatId, 'ai-assistant', aiResponse.text, 'ai_suggestion');
        }
        
        // If there's a confirmation message, send it as well
        if (aiResponse.confirmation) {
          await chatService.sendMessage(
            chatId, 
            'ai-assistant',
            aiResponse.confirmation,
            'ai_suggestion'
          );
        }
      } else {
        // Regular message
        await chatService.sendMessage(chatId, user.uid, trimmedMessage);
      }

      setNewMessage('');
    } catch (error) {
      logger.error('ChatScreen', 'Error sending message', { error });
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Update the message rendering to handle AI messages
  const renderMessage = ({ item }: { item: Message }) => (
    <View 
      style={[
        styles.messageContainer,
        item.senderId === user?.uid ? styles.sentMessage : 
        item.type === 'ai_suggestion' ? styles.aiMessage :
        styles.receivedMessage
      ]}
    >
      {item.type === 'ai_suggestion' && (
        <View style={styles.aiHeader}>
          <Text style={styles.aiLabel}>AI Assistant</Text>
        </View>
      )}
      <Text style={[
        styles.messageText,
        item.senderId === user?.uid ? styles.sentMessageText : 
        item.type === 'ai_suggestion' ? styles.aiMessageText :
        styles.receivedMessageText
      ]}>
        {item.text}
      </Text>
    </View>
  );

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
          <View style={styles.headerTitleContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {otherUser?.name.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>
                {otherUser?.name || 'Unknown User'}
              </Text>
              {otherUser?.email && (
                <Text style={styles.headerSubtitle}>
                  {otherUser.email}
                </Text>
              )}
            </View>
          </View>
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
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            inverted
            contentContainerStyle={styles.messagesList}
            renderItem={renderMessage}
          />

          <View style={styles.inputContainer}>
            <SafeTextInput
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Message or @spiritanimal for AI help..."
              style={styles.input}
              multiline
              maxLength={1000}
              blurOnSubmit={false}
              autoCorrect={false}
              autoCapitalize="none"
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
  headerInfo: {
    flex: 1,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    marginLeft: 12,
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '500',
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
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  sentMessageText: {
    color: 'white',
  },
  receivedMessageText: {
    color: '#111827',
  },
  aiMessageText: {
    color: '#1E40AF',
  },
  aiHeader: {
    marginBottom: 4,
  },
  aiLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4F46E5',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    marginRight: 8,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    padding: 8,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
}); 