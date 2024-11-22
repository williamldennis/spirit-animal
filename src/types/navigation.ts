import type { CalendarEventResponse } from '../features/calendar/services/calendarService';

export type RootStackParamList = {
  Home: undefined;
  SignIn: undefined;
  SignUp: undefined;
  Chat: { chatId: string };
  SelectContact: undefined;
  EventDetail: { event: CalendarEventResponse };
};

// Add type safety for useNavigation
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
} 