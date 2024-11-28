export const useCalendar = () => {
  const userId = useAuthStore(state => state.user?.uid);

  const isConnected = async () => {
    if (!userId) return false;
    return await calendarService.isCalendarConnected(userId);
  };

  const connect = async () => {
    if (!userId) throw new Error('User not authenticated');
    return await calendarService.connectCalendar(userId);
  };

  return {
    isConnected,
    connect
  };
}; 