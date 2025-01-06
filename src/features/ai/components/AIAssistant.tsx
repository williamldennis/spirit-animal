import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet,
  Platform,
  Keyboard,
  FlatList,
  KeyboardAvoidingView
} from 'react-native';
import { useAI } from '../hooks/useAI';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeTextInput } from '../../../shared/components/SafeTextInput';
import { Feather } from '@expo/vector-icons';
import { AIMessage } from '../types';
import { logger } from '../../../utils/logger';

export const AIAssistant = () => {
  const [input, setInput] = useState('');
  const [conversation, setConversation] = useState<AIMessage[]>([]);
  const { processUserInput, isProcessing, error } = useAI();
  const insets = useSafeAreaInsets();

  const handleSubmit = async () => {
    if (!input.trim() || isProcessing) return;

    try {
      logger.debug('AIAssistant', 'Processing input', { input });
      const newMessage = { role: 'user', content: input, timestamp: new Date() };
      setConversation(prev => [...prev, newMessage]);
      setInput('');

      const response = await processUserInput(input, conversation);
      if (response) {
        const aiMessage = { 
          role: 'assistant', 
          content: response.text, 
          timestamp: new Date() 
        };
        setConversation(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      logger.error('AIAssistant', 'Failed to process message', { error });
      // Show error in conversation
      setConversation(prev => [...prev, {
        role: 'system',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }]);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={conversation}
        keyExtractor={(_, index) => index.toString()}
        style={styles.flatList}
        contentContainerStyle={styles.conversationContainer}
        inverted={false}
        renderItem={({ item }) => (
          <View 
            style={[
              styles.message,
              item.role === 'user' ? styles.userMessage : 
              item.role === 'confirmation' ? styles.confirmationMessage :
              item.role === 'system' ? styles.systemMessage :
              styles.aiMessage
            ]}
          >
            <Text style={[
              styles.messageText,
              item.role === 'user' ? styles.userMessageText : 
              item.role === 'confirmation' ? styles.confirmationMessageText :
              item.role === 'system' ? styles.systemMessageText :
              styles.aiMessageText
            ]}>
              {item.content}
            </Text>
          </View>
        )}
      />

      {isProcessing && (
        <ActivityIndicator style={styles.loading} color="#2563EB" />
      )}

      <View style={styles.inputContainer}>
        <SafeTextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask anything..."
          style={styles.input}
          multiline
          maxLength={1000}
          blurOnSubmit={false}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="send"
          enablesReturnKeyAutomatically
          onSubmitEditing={handleSubmit}
        />
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isProcessing || !input.trim()}
          style={styles.sendButton}
        >
          <Feather 
            name="send" 
            size={24} 
            color={input.trim() && !isProcessing ? '#2563EB' : '#9CA3AF'} 
          />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.error}>{error.message}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  conversationContainer: {
    padding: 16,
  },
  message: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    maxWidth: '80%',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessage: {
    backgroundColor: '#2563EB',
    alignSelf: 'flex-end',
  },
  userMessageText: {
    color: 'white',
  },
  aiMessage: {
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
  },
  aiMessageText: {
    color: '#111827',
  },
  loading: {
    marginVertical: 8,
    alignSelf: 'center',
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
    alignSelf: 'flex-end',
  },
  errorContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 8,
  },
  error: {
    color: '#DC2626',
  },
  confirmationMessage: {
    backgroundColor: '#ECFDF5',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  confirmationMessageText: {
    color: '#059669',
    fontStyle: 'italic',
  },
  systemMessage: {
    backgroundColor: '#FEF3C7',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  systemMessageText: {
    color: '#A16207',
    fontStyle: 'italic',
  },
}); 