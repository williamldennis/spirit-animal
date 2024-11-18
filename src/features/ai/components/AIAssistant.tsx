import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  NativeEventSubscription,
  Keyboard
} from 'react-native';
import { useAI } from '../hooks/useAI';

export const AIAssistant = () => {
  const [input, setInput] = useState('');
  const { processUserInput, isProcessing, error } = useAI();
  const [conversation, setConversation] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
  }>>([]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage = input;
    setInput('');
    Keyboard.dismiss();
    
    setConversation(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await processUserInput(userMessage);
      setConversation(prev => [...prev, { 
        role: 'assistant', 
        content: response.text 
      }]);
    } catch (err) {
      console.error('Error processing message:', err);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.conversation}>
        {conversation.map((message, index) => (
          <View 
            key={index} 
            style={[
              styles.message,
              message.role === 'user' ? styles.userMessage : styles.aiMessage
            ]}
          >
            <Text style={[
              styles.messageText,
              message.role === 'user' ? styles.userMessageText : styles.aiMessageText
            ]}>
              {message.content}
            </Text>
          </View>
        ))}
        {isProcessing && (
          <ActivityIndicator style={styles.loading} />
        )}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask anything..."
          style={styles.input}
          multiline
          maxLength={1000}
          blurOnSubmit={false}
          autoCorrect={false}
          autoCapitalize="none"
          keyboardType="default"
          returnKeyType="send"
          enablesReturnKeyAutomatically
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={isProcessing || !input.trim()}
          style={[
            styles.sendButton,
            (!input.trim() || isProcessing) && styles.sendButtonDisabled
          ]}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <Text style={styles.error}>{error.message}</Text>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  conversation: {
    flex: 1,
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
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  input: {
    flex: 1,
    marginRight: 8,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  sendButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  error: {
    color: '#DC2626',
    padding: 16,
    backgroundColor: '#FEE2E2',
    margin: 16,
    borderRadius: 8,
  }
}); 