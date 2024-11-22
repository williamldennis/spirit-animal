import { Task } from '../../tasks/types';
import { Message as ChatMessage } from '../../chat/types';
import { Contact } from '../../../types/contact';
import { CalendarEventResponse } from '../../calendar/services/calendarService';

export interface AIMessage {
  role: 'user' | 'assistant' | 'confirmation' | 'system';
  content: string;
  timestamp: Date;
}

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
  recentMessages?: ChatMessage[];
  allChats?: { [chatId: string]: ChatMessage[] };
  contacts?: Contact[];
  events?: CalendarEventResponse[];
  userId: string;
  currentChatId?: string;
  currentContact?: { name: string; email: string; };
  conversationHistory?: AIMessage[];
}

export interface AIState {
  isProcessing: boolean;
  error: Error | null;
  lastResponse?: AIResponse;
}

export interface MessageContext {
  role: "user" | "assistant";
  content: string;
} 