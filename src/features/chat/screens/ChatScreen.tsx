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
  Alert,
  ActionSheetIOS
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
import { taskService } from '../../tasks/services/taskService';
import { calendarService } from '../../calendar/services/calendarService';
import { MessageContext } from '../../ai/types/index';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

const getRecentMessages = (messages: Message[], count: number = 5): MessageContext[] => {
  return messages
    .slice(0, count)
    .reverse()
    .map(msg => ({
      role: msg.senderId === 'ai-assistant' ? "assistant" as const : "user" as const,
      content: msg.text
    }));
};

const isAcknowledgment = (message: string): boolean => {
  const acknowledgments = ['thanks', 'thank you', 'ok', 'okay', 'got it', 'cool', 'great'];
  return acknowledgments.some(ack => message.toLowerCase().trim() === ack);
};

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
        
        // Skip AI processing for acknowledgments
        if (isAcknowledgment(aiQuery)) {
          // Just send the user's message without AI response
          await chatService.sendMessage(chatId, user.uid, trimmedMessage);
        } else {
          // First send the user's message
          await chatService.sendMessage(chatId, user.uid, trimmedMessage);
          
          // Get recent message context
          const recentMessages = getRecentMessages(messages);
          
          // Process with AI and send response, including context
          const aiResponse = await processUserInput(aiQuery, recentMessages);
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

  const handleMessageLongPress = async (message: Message) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Create Task', 'Create Event'],
          cancelButtonIndex: 0,
          title: 'Message Options'
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            try {
              await taskService.createTask(user?.uid || '', {
                title: message.text,
                description: `Created from chat with ${otherUser?.name || 'Unknown'}`,
                completed: false,
                createdAt: new Date()
              });
              Alert.alert('Success', 'Task created successfully!');
            } catch (error) {
              logger.error('ChatScreen', 'Error creating task', { error });
              Alert.alert('Error', 'Failed to create task. Please try again.');
            }
          } else if (buttonIndex === 2) {
            try {
              if (!user?.uid) throw new Error('User not authenticated');

              const startTime = new Date();
              const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later

              const eventData = {
                summary: message.text,
                description: `Created from chat with ${otherUser?.name || 'Unknown'}`,
                start: {
                  dateTime: startTime.toISOString(),
                  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                end: {
                  dateTime: endTime.toISOString(),
                  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                }
              };

              await calendarService.createEvent(user.uid, eventData);
              Alert.alert('Success', 'Event created successfully!');
            } catch (error) {
              logger.error('ChatScreen', 'Error creating event', { error });
              Alert.alert('Error', 'Failed to create event. Please try again.');
            }
          }
        }
      );
    } else {
      // For Android, we'll show a simple alert with options
      Alert.alert(
        'Message Options',
        'What would you like to do?',
        [
          {
            text: 'Create Task',
            onPress: async () => {
              try {
                await taskService.createTask(user?.uid || '', {
                  title: message.text,
                  description: `Created from chat with ${otherUser?.name || 'Unknown'}`,
                  completed: false,
                  createdAt: new Date()
                });
                Alert.alert('Success', 'Task created successfully!');
              } catch (error) {
                logger.error('ChatScreen', 'Error creating task', { error });
                Alert.alert('Error', 'Failed to create task. Please try again.');
              }
            }
          },
          {
            text: 'Create Event',
            onPress: async () => {
              try {
                if (!user?.uid) throw new Error('User not authenticated');

                const startTime = new Date();
                const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later

                const eventData = {
                  summary: message.text,
                  description: `Created from chat with ${otherUser?.name || 'Unknown'}`,
                  start: {
                    dateTime: startTime.toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                  },
                  end: {
                    dateTime: endTime.toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                  }
                };

                await calendarService.createEvent(user.uid, eventData);
                Alert.alert('Success', 'Event created successfully!');
              } catch (error) {
                logger.error('ChatScreen', 'Error creating event', { error });
                Alert.alert('Error', 'Failed to create event. Please try again.');
              }
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    }
  };

  // Update the message rendering to handle AI messages
  const renderMessage = ({ item }: { item: Message }) => (
    <TouchableOpacity 
      onLongPress={() => handleMessageLongPress(item)}
      delayLongPress={500} // Half a second press to trigger
      activeOpacity={0.7}
    >
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
            <Text style={styles.aiLabel}>🦊</Text>
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
    </TouchableOpacity>
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
            <TouchableOpacity 
              style={styles.aiButton}
              onPress={async () => {
                if (!newMessage.trim() || sending) return;
                const trimmedMessage = newMessage.trim();
                
                // Skip AI processing for acknowledgments
                if (isAcknowledgment(trimmedMessage)) {
                  const aiMessage = `@spiritanimal ${trimmedMessage}`;
                  await chatService.sendMessage(chatId, user.uid, aiMessage);
                  setNewMessage('');
                  return;
                }

                setNewMessage('');
                const aiMessage = `@spiritanimal ${trimmedMessage}`;
                try {
                  setSending(true);
                  // First send the user's message
                  await chatService.sendMessage(chatId, user.uid, aiMessage);
                  
                  // Get recent message context
                  const recentMessages = getRecentMessages(messages);
                  
                  // Process with AI and send response
                  const aiResponse = await processUserInput(trimmedMessage, recentMessages);
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
                } catch (error) {
                  logger.error('ChatScreen', 'Error processing AI message', { error });
                  Alert.alert('Error', 'Failed to process AI message. Please try again.');
                } finally {
                  setSending(false);
                }
              }}
              disabled={!newMessage.trim() || sending}
            >
              <Text style={[
                styles.aiButtonText,
                (!newMessage.trim() || sending) && styles.aiButtonDisabled
              ]}>
                🦊
              </Text>
            </TouchableOpacity>
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
              disabled={!newMessage.trim() || sending}
            >
              <Feather 
                name="send" 
                size={24} 
                color={newMessage.trim() && !sending ? '#2563EB' : '#9CA3AF'} 
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
    fontSize: 16,
    marginBottom: 2,
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
  aiButton: {
    padding: 8,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiButtonText: {
    fontSize: 20,
    opacity: 1,
  },
  aiButtonDisabled: {
    opacity: 0.5,
  },
}); 