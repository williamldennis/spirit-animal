import { useState, useEffect } from 'react';
import { useTaskStore } from '../../tasks/stores/taskStore';
import { useChatStore } from '../../chat/stores/chatStore';
import { useAuthStore } from '../../auth/stores/authStore';
import { AIService } from '../services/aiService';
import { AIResponse, AIMessage } from '../types';
import { chatService } from '../../chat/services/chatService';
import { taskService } from '../../tasks/services/taskService';
import { logger } from '../../../utils/logger';
import * as Contacts from 'expo-contacts';
import { Contact } from '../../../types/contact';
import { Message } from '../../chat/types';
import { calendarService } from '../../calendar/services/calendarService';
import type { CalendarEventResponse } from '../../calendar/services/calendarService';
import type { Task } from '../../tasks/types';

const aiService = new AIService();

export const useAI = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [allChats, setAllChats] = useState<{ [chatId: string]: Message[] }>({});
  const [events, setEvents] = useState<CalendarEventResponse[]>([]);
  
  // Get tasks and loadTasks function from store
  const tasks = useTaskStore(state => state.tasks);
  const loadTasks = useTaskStore(state => state.loadTasks);
  const { messages } = useChatStore();
  const { user } = useAuthStore();

  // Load tasks when component mounts or user changes
  useEffect(() => {
    if (user?.uid) {
      loadTasks(user.uid);
      logger.debug('useAI.loadTasks', 'Loading tasks for user', { 
        userId: user.uid 
      });
    }
  }, [user?.uid, loadTasks]);

  // Debug log when tasks change
  useEffect(() => {
    logger.debug('useAI.tasksUpdate', 'Tasks updated', {
      taskCount: tasks.length,
      taskSample: tasks.slice(0, 3).map(t => ({
        id: t.id,
        title: t.title,
        completed: t.completed,
        dueDate: t.dueDate
      }))
    });
  }, [tasks]);

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
            .filter(contact => contact.name && contact.emails?.[0]?.email)
            .map(contact => ({
              id: contact.id,
              name: contact.name || '',
              email: contact.emails?.[0]?.email || '',
            }));
          setContacts(formattedContacts);
        }
      } catch (error) {
        logger.error('useAI.loadContacts', 'Failed to load contacts', { error });
      }
    };
    loadContacts();
  }, []);

  // Load all chats and messages
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

  // Add calendar events loading
  useEffect(() => {
    if (!user) return;

    const loadEvents = async () => {
      try {
        const calendarEvents = await calendarService.fetchUpcomingEvents(user.uid);
        setEvents(calendarEvents);
      } catch (error) {
        logger.error('useAI.loadEvents', 'Failed to load calendar events', { error });
      }
    };

    loadEvents();
  }, [user]);

  const processUserInput = async (input: string, conversationHistory: AIMessage[] = []): Promise<AIResponse> => {
    setIsProcessing(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('User must be logged in to use AI features');
      }

      // Log tasks for debugging
      logger.debug('useAI.processUserInput', 'Current tasks context', { 
        taskCount: tasks.length,
        taskSample: tasks.slice(0, 3).map(t => ({
          id: t.id,
          title: t.title,
          completed: t.completed,
          dueDate: t.dueDate,
          description: t.description,
          priority: t.priority
        }))
      });

      const response = await aiService.processUserInput(input, {
        tasks, // Pass tasks directly from store
        recentMessages: messages,
        allChats,
        contacts,
        events,
        userId: user.uid,
        conversationHistory
      });

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
    hasContext: {
      contacts: contacts.length > 0,
      chats: Object.keys(allChats).length > 0,
      tasks: tasks.length > 0,
      events: events.length > 0
    }
  };
}; 