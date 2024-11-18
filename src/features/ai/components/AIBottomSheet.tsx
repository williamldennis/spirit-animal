import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Text } from 'react-native';
import { AIAssistant } from './AIAssistant';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export const AIBottomSheet = ({ visible, onClose }: Props) => {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  
  // Get current chat context if we're in a chat screen
  const currentChatContext = route.name === 'Chat' ? {
    chatId: route.params?.chatId,
    contact: route.params?.contact
  } : undefined;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>AI Assistant</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* AI Assistant */}
          <View style={styles.content}>
            <AIAssistant currentChatContext={currentChatContext} />
          </View>
        </View>
      </View>
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
    height: '80%', // Takes up 80% of screen height
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    fontSize: 24,
    color: '#6B7280',
    padding: 4,
  },
  content: {
    flex: 1,
  },
}); 