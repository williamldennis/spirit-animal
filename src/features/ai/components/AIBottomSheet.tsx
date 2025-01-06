import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Text, KeyboardAvoidingView, Platform, ScrollView, TextInput, ActivityIndicator, Linking, Alert } from 'react-native';
import { AIAssistant } from './AIAssistant';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAIStore } from '../stores/aiStore';
import { taskService } from '../../tasks/services/taskService';
import { aiService } from '../services/aiService';
import { AIMessage } from '../types';
import { logger } from '../../../utils/logger';

type Props = {
  visible: boolean;
  onClose: () => void;
  taskId?: string;
};

export const AIBottomSheet = ({ visible, onClose, taskId }: Props) => {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<AIMessage[]>([]);
  const { response, clearAIResponse, getTaskResponses, setAIResponse } = useAIStore();
  const taskConversation = taskId ? getTaskResponses(taskId) : null;
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeConversation = async () => {
      setIsLoading(true);
      try {
        if (taskId) {
          try {
            const task = await taskService.getTask(taskId);
            if (!task) return;

            const systemMessage: AIMessage = {
              role: 'system',
              content: `I'm here to help you with: "${task.title}"${task.description ? `\n\nDescription: ${task.description}` : ''}`,
              timestamp: new Date()
            };

            if (task.parentTaskId) {
              const parentTask = await taskService.getTask(task.parentTaskId);
              if (parentTask) {
                systemMessage.content += `\n\nThis is part of: "${parentTask.title}"`;
              }
            }

            setConversation([systemMessage]);

            if (taskConversation?.responses.length) {
              const existingResponses = taskConversation.responses.map(resp => ({
                role: 'assistant' as const,
                content: resp.text,
                timestamp: new Date()
              }));
              
              if (existingResponses.length > 0) {
                setConversation(prev => [...prev, ...existingResponses]);
              }
            }

            const aiResponse = await aiService.processMessage(
              `Help me with this task: ${task.title}`,
              []
            );

            const aiMessage: AIMessage = {
              role: 'assistant',
              content: aiResponse.text,
              timestamp: new Date()
            };

            setConversation(prev => [...prev, aiMessage]);

            if (aiResponse.confirmation) {
              const confirmationMessage: AIMessage = {
                role: 'confirmation',
                content: aiResponse.confirmation,
                timestamp: new Date()
              };
              setConversation(prev => [...prev, confirmationMessage]);
            }

            setAIResponse(aiResponse, taskId, taskConversation?.parentTaskTitle || 'Task Results');
          } catch (error) {
            console.error('Failed to initialize conversation:', error);
            const errorMessage: AIMessage = {
              role: 'system',
              content: error instanceof Error ? error.message : 'Failed to load task information',
              timestamp: new Date()
            };
            setConversation([errorMessage]);
          }
        }
      } catch (error) {
        console.error('Failed to initialize conversation:', error);
        const errorMessage: AIMessage = {
          role: 'system',
          content: error instanceof Error ? error.message : 'Failed to load task information',
          timestamp: new Date()
        };
        setConversation([errorMessage]);
      } finally {
        setIsLoading(false);
      }
    };

    if (visible && taskId) {
      initializeConversation();
    } else {
      setConversation([]);
    }
  }, [visible, taskId]);

  const handleClose = () => {
    clearAIResponse();
    onClose();
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      logger.debug('AIBottomSheet', 'Sending message to AI', { message });
      const response = await aiService.processMessage(message, conversation);
      
      if (response) {
        setConversation(prev => [...prev, 
          { role: 'user', content: message, timestamp: new Date() },
          { role: 'assistant', content: response.text, timestamp: new Date() }
        ]);
      }
      setMessage('');
    } catch (error) {
      logger.error('AIBottomSheet', 'Failed to process message', { error });
      setError('Failed to get response from AI');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkPress = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        Alert.alert(
          'Open External Link',
          'Would you like to open this link in your browser?',
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Open',
              onPress: async () => {
                try {
                  await Linking.openURL(url);
                } catch (error) {
                  Alert.alert(
                    'Error',
                    'Could not open the link. Please try again later.'
                  );
                }
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Error',
          'Sorry, this link cannot be opened on your device.'
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'There was a problem processing the link. Please try again.'
      );
    }
  };

  // Helper function to detect and format links in text
  const renderTextWithLinks = (text: string) => {
    // Regular expression to match URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <Text
            key={index}
            style={[styles.link, styles.messageLink]}
            onPress={() => handleLinkPress(part)}
          >
            {part}
          </Text>
        );
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            {taskConversation ? (
              <>
                <View style={styles.headerTitles}>
                  <Text style={styles.title}>
                    {taskId ? `🪄 ${taskConversation.responses[0]?.taskTitle || 'Task Results'}` : '🦊 Spirit Animal'}
                  </Text>
                  <Text style={styles.subtitle}>
                    {taskConversation.parentTaskTitle && `📎 Part of: ${taskConversation.parentTaskTitle}`}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles.title}>🦊 Spirit Animal</Text>
            )}
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.loadingText}>Loading conversation...</Text>
              </View>
            ) : (
              conversation.map((msg, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.messageContainer,
                    msg.role === 'user' ? styles.userMessage : 
                    msg.role === 'confirmation' ? styles.confirmationMessage :
                    msg.role === 'system' ? styles.systemMessage :
                    styles.assistantMessage
                  ]}
                >
                  <Text 
                    style={[
                      styles.messageText,
                      msg.role === 'user' ? styles.userMessageText :
                      msg.role === 'confirmation' ? styles.confirmationMessageText :
                      msg.role === 'system' ? styles.systemMessageText :
                      styles.assistantMessageText
                    ]}
                  >
                    {renderTextWithLinks(msg.content)}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Type a message..."
              style={styles.input}
              multiline
              maxLength={1000}
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
            />
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={loading || !message.trim()}
              style={styles.sendButton}
            >
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  closeButton: {
    fontSize: 24,
    color: '#6B7280',
    padding: 4,
  },
  content: {
    flex: 1,
  },
  responseContainer: {
    flex: 1,
  },
  responseItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  responseText: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 8,
  },
  confirmationText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    padding: 8,
  },
  sendButtonText: {
    fontSize: 24,
  },
  messageContainer: {
    padding: 12,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#2563EB',
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
  },
  confirmationMessage: {
    backgroundColor: '#ECFDF5',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  systemMessage: {
    backgroundColor: '#FEF3C7',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: 'white',
  },
  assistantMessageText: {
    color: '#111827',
  },
  confirmationMessageText: {
    color: '#059669',
    fontStyle: 'italic',
  },
  systemMessageText: {
    color: '#A16207',
    fontStyle: 'italic',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 16,
  },
  link: {
    textDecorationLine: 'underline',
  },
  messageLink: {
    color: '#2563EB', // Blue color for links
  },
  userMessageLink: {
    color: '#ffffff', // White color for links in user messages
  },
  assistantMessageLink: {
    color: '#2563EB', // Blue color for links in assistant messages
  },
  confirmationMessageLink: {
    color: '#059669', // Green color for links in confirmation messages
  },
  systemMessageLink: {
    color: '#A16207', // Amber color for links in system messages
  },
}); 