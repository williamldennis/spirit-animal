# React Native Implementation Guide - Productivity AI Assistant

## Tech Stack
```plaintext
Frontend:
- React Native
- TypeScript
- React Navigation
- Firebase JS SDK
- Google APIs
- Reanimated 3 (for smooth animations)
- React Native Calendar
- Notifee (for notifications)

Backend:
- Firebase (Auth, Firestore, Functions)
- OpenAI API
- Google Calendar API

Development:
- Cursor IDE
- Expo (bare workflow)
- ESLint + Prettier
```

## Week 1: Project Setup & Authentication
### Day 1: Initial Setup
```bash
# Initialize project
npx create-expo-app ProductivityApp --template typescript

# Install essential dependencies
npm install @react-navigation/native @react-navigation/native-stack
npm install @firebase/app @firebase/auth @firebase/firestore
npm install @react-native-google-signin/google-signin
npm install @notifee/react-native
npm install reanimated-bottom-sheet
npm install react-native-reanimated
npm install zustand # For state management
```

Project structure:
```plaintext
src/
├── app/
│   ├── App.tsx
│   └── AppNavigator.tsx
├── features/
│   ├── auth/
│   ├── chat/
│   ├── calendar/
│   ├── tasks/
│   └── ai/
├── services/
│   ├── firebase/
│   ├── google/
│   └── ai/
├── hooks/
├── components/
├── utils/
└── types/
```

### Day 2: Authentication Setup
```typescript
// src/services/firebase/auth.ts
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export class AuthService {
  async signInWithGoogle() {
    try {
      const { idToken } = await GoogleSignin.signIn();
      const credential = auth.GoogleAuthProvider.credential(idToken);
      return auth().signInWithCredential(credential);
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  }
}

// src/features/auth/components/SignInScreen.tsx
export const SignInScreen = () => {
  const [loading, setLoading] = useState(false);
  
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await authService.signInWithGoogle();
      // Navigate to main app
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };
  
  return (
    // UI Implementation
  );
};
```

### Day 3: Navigation & Main UI
```typescript
// src/app/AppNavigator.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export const AppNavigator = () => {
  const { user } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
```

## Week 2: Chat Implementation
### Day 4: Chat Backend
```typescript
// src/services/firebase/chat.ts
import firestore from '@react-native-firebase/firestore';

export class ChatService {
  private db = firestore();

  async getChats(userId: string) {
    return this.db
      .collection('chats')
      .where('participants', 'array-contains', userId)
      .orderBy('lastMessageAt', 'desc')
      .get();
  }

  subscribeToChat(chatId: string, callback: (messages: Message[]) => void) {
    return this.db
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(messages);
      });
  }
}

// src/features/chat/hooks/useChat.ts
export const useChat = (chatId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = chatService.subscribeToChat(chatId, newMessages => {
      setMessages(newMessages);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId]);

  return { messages, loading };
};
```

### Day 5: Chat UI Components
```typescript
// src/features/chat/components/ChatList.tsx
export const ChatList = () => {
  const { chats, loading } = useChats();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <FlatList
      data={chats}
      renderItem={({ item }) => <ChatListItem chat={item} />}
      keyExtractor={item => item.id}
    />
  );
};

// src/features/chat/components/ChatRoom.tsx
export const ChatRoom = () => {
  const { messages, loading } = useChat(chatId);
  const { sendMessage } = useChatActions(chatId);

  return (
    <View style={styles.container}>
      <MessageList messages={messages} />
      <MessageInput onSend={sendMessage} />
    </View>
  );
};
```

## Week 3: Calendar Integration
### Day 6-7: Calendar Setup
```typescript
// src/services/google/calendar.ts
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export class CalendarService {
  async getEvents(timeMin: string, timeMax: string) {
    const { accessToken } = await GoogleSignin.getTokens();
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.json();
  }
}

// src/features/calendar/hooks/useCalendar.ts
export const useCalendar = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshEvents = async () => {
    try {
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const data = await calendarService.getEvents(timeMin, timeMax);
      setEvents(data.items);
    } catch (error) {
      console.error('Calendar Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshEvents();
  }, []);

  return { events, loading, refreshEvents };
};
```

