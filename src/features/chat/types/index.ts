export interface Message {
  id: string;
  chatId: string;
  text: string;
  senderId: string;
  timestamp: Date;
  type?: 'text' | 'ai_suggestion' | 'confirmation' | 'calendar_event';
} 