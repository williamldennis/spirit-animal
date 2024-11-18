import { useState, useEffect } from 'react';
import { useTaskStore } from '../../tasks/stores/taskStore';
import { useChatStore } from '../../chat/stores/chatStore';
import { useAuthStore } from '../../auth/stores/authStore';
import { AIService } from '../services/aiService';
import { AIResponse } from '../types';
import { chatService } from '../../chat/services/chatService';
import { logger } from '../../../utils/logger';
import * as Contacts from 'expo-contacts';
import { Contact } from '../../chat/screens/SelectContactScreen';

const aiService = new AIService();

export const useAI = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [allChats, setAllChats] = useState<{ [chatId: string]: Message[] }>({});
  
  const { tasks, createTask } = useTaskStore();
  const { messages } = useChatStore();
  const { user } = useAuthStore();

  // Load contacts
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status === 'granted') {
          const { data } = await Contacts.getContactsAsync({
            fields: [Contacts.Fields.Emails, Contacts.Fields.Name],
          });
          
          const formattedContacts = data
            .filter(contact => contact.name)
            .map(contact => ({
              id: contact.id,
              name: contact.name || 'No Name',
              email: contact.emails?.[0]?.email,
            }));
          
          setContacts(formattedContacts);
        }
      } catch (error) {
        logger.error('useAI.loadContacts', 'Failed to load contacts', { error });
      }
    };

    loadContacts();
  }, []);

  // Load all chats
  useEffect(() => {
    if (!user) return;

    const loadAllChats = async () => {
      try {
        const chats = await chatService.getAllChats(user.uid);
        const chatMessages: { [chatId: string]: Message[] } = {};
        
        for (const chat of chats) {
          const messages = await chatService.getChatMessages(chat.id);
          chatMessages[chat.id] = messages;
        }
        
        setAllChats(chatMessages);
      } catch (error) {
        logger.error('useAI.loadAllChats', 'Failed to load chats', { error });
      }
    };

    loadAllChats();
  }, [user]);

  const processUserInput = async (input: string): Promise<AIResponse> => {
    setIsProcessing(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('User must be logged in to use AI features');
      }

      const response = await aiService.processUserInput(input, {
        tasks,
        recentMessages: messages,
        allChats,
        contacts,
        userId: user.uid
      });

      // Handle AI actions
      if (response.action) {
        logger.info('useAI', 'Handling AI action', { actionType: response.action.type });
        
        switch (response.action.type) {
          case 'create_task':
            await createTask(response.action.parameters);
            break;
          case 'send_message':
            const { chatId, content } = response.action.parameters;
            await chatService.sendMessage(chatId, user.uid, content);
            break;
        }
      }

      return response;
    } catch (err) {
      logger.error('useAI', 'Error processing input', { error: err });
      setError(err as Error);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processUserInput,
    isProcessing,
    error,
    hasContacts: contacts.length > 0,
    hasChats: Object.keys(allChats).length > 0
  };
}; 