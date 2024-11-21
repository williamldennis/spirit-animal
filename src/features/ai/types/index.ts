import { Task } from '../../tasks/types';
import { Message } from '../../chat/types';
import { Contact } from '../../../types/contact';
import { CalendarEventResponse } from '../../calendar/services/calendarService';

export interface AIAction {
  type: 'create_task' | 'send_message' | 'create_event' | 'update_event';
  parameters: any;
}

export interface AIResponse {
  text: string;
  action?: AIAction;
  confirmation?: string;
}

export interface AIContext {
  tasks?: Task[];
  recentMessages?: Message[];
  allChats?: { [chatId: string]: Message[] };
  contacts?: Contact[];
  events?: CalendarEventResponse[];
  userId: string;
  currentChatId?: string;
  currentContact?: { name: string; email: string; };
  conversationHistory?: Message[];
}

export interface AIState {
  isProcessing: boolean;
  error: Error | null;
  lastResponse?: AIResponse;
} 