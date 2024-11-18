export interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Date;
  type: 'text' | 'ai_suggestion' | 'calendar_event';
} 