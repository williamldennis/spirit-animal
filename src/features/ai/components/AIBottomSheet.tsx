import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Text, KeyboardAvoidingView, Platform, ScrollView, TextInput } from 'react-native';
import { AIAssistant } from './AIAssistant';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAIStore } from '../stores/aiStore';
import { taskService } from '../../tasks/services/taskService';
import { aiService } from '../services/aiService';

type Props = {
  visible: boolean;
  onClose: () => void;
  taskId?: string;
};

export const AIBottomSheet = ({ visible, onClose, taskId }: Props) => {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const { response, clearAIResponse, getTaskResponses, setAIResponse } = useAIStore();
  const conversation = taskId ? getTaskResponses(taskId) : null;

  const handleClose = () => {
    clearAIResponse();
    onClose();
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !taskId) return;

    try {
      const task = await taskService.getTask(taskId);
      if (!task) return;

      const aiResponse = await aiService.processMessage(
        message,
        conversation?.responses.map(r => ({
          role: 'assistant',
          content: r.text
        })) || []
      );

      setAIResponse(aiResponse, taskId, conversation?.parentTaskTitle || 'Task Results');
      setMessage('');
    } catch (error) {
      console.error('Failed to process message:', error);
    }
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
            {conversation ? (
              <>
                <View style={styles.headerTitles}>
                  <Text style={styles.title}>
                    {taskId ? `🪄 ${conversation.responses[0]?.taskTitle || 'Task Results'}` : '🦊 Spirit Animal'}
                  </Text>
                  <Text style={styles.subtitle}>
                    {conversation.parentTaskTitle && `📎 Part of: ${conversation.parentTaskTitle}`}
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

          <View style={styles.content}>
            {(response || (taskId && conversation)) ? (
              <>
                <ScrollView style={styles.responseContainer}>
                  {conversation?.responses.map((resp, index) => (
                    <View key={index} style={styles.responseItem}>
                      <Text style={styles.responseText}>{resp.text}</Text>
                      {resp.confirmation && (
                        <Text style={styles.confirmationText}>{resp.confirmation}</Text>
                      )}
                    </View>
                  ))}
                </ScrollView>
                
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Ask me to modify or refine the result..."
                    multiline
                    returnKeyType="send"
                    onSubmitEditing={handleSendMessage}
                  />
                  <TouchableOpacity 
                    style={styles.sendButton}
                    onPress={handleSendMessage}
                  >
                    <Text style={styles.sendButtonText}>💬</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <AIAssistant />
            )}
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
}); 