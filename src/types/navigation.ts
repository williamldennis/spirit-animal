import type { CalendarEventResponse } from '../features/calendar/services/calendarService';
import { Email } from '../features/email/types';

export type RootStackParamList = {
  Home: undefined;
  SignIn: undefined;
  SignUp: undefined;
  Chat: { chatId: string };
  SelectContact: undefined;
  EventDetail: { event: CalendarEventResponse };
  ComposeEmail: { replyTo?: Email; forward?: Email } | undefined;
  EmailDetail: { emailId: string };
};

// Add type safety for useNavigation
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
} 