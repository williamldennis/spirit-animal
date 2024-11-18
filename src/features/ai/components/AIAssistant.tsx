import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet 
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
    <View style={styles.container}>
      <View style={styles.conversation}>
        {conversation.map((message, index) => (
          <View 
            key={index} 
            style={[
              styles.message,
              message.role === 'user' ? styles.userMessage : styles.aiMessage
            ]}
          >
            <Text>{message.content}</Text>
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
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={isProcessing || !input.trim()}
          style={styles.sendButton}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <Text style={styles.error}>{error.message}</Text>
      )}
    </View>
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
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#2563EB',
    alignSelf: 'flex-end',
  },
  aiMessage: {
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
  },
  loading: {
    marginVertical: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    marginRight: 8,
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  sendButton: {
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: 'white',
  },
  error: {
    color: 'red',
    padding: 16,
  }
}); 