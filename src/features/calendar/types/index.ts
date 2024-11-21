export interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime: string;
  };
  location?: string;
  description?: string;
  attendees?: Array<{
    email: string;
    responseStatus: string;
  }>;
} 