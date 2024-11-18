import { create } from 'zustand';
import { Message } from '../types';

interface ChatStore {
  messages: Message[];
  loading: boolean;
  error: Error | null;
  sendMessage: (chatId: string, content: string) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  loading: false,
  error: null,
  sendMessage: async (chatId, content) => {
    // Implementation
  }
})); 