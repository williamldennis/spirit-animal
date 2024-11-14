# Core UI Components

## 1. Authentication Screens

```typescript
// src/features/auth/screens/SignInScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/authStore';

export const SignInScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const signIn = useAuthStore(state => state.signIn);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Brand */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>P</Text>
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        {/* Google Sign In */}
        <TouchableOpacity style={styles.googleButton}>
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <Text style={styles.dividerText}>or</Text>
        </View>

        {/* Email/Password Form */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={() => signIn({ email, password })}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerText: {
    flex: 1,
    textAlign: 'center',
    color: '#6B7280',
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 16,
  },
  signInButton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  signInButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});
```

## 2. Main Tab Navigation

```typescript
// src/features/navigation/MainTabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ChatList, CalendarView, TaskList } from '../screens';
import { useAIStore } from '../stores/aiStore';
import { FloatingAIButton } from '../components';

const Tab = createBottomTabNavigator();

export const MainTabNavigator = () => {
  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: 'white',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
          },
          tabBarStyle: {
            backgroundColor: 'white',
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
          },
        }}
      >
        <Tab.Screen
          name="Chat"
          component={ChatList}
          options={{
            title: 'Messages',
          }}
        />
        <Tab.Screen
          name="Calendar"
          component={CalendarView}
          options={{
            title: 'Calendar',
          }}
        />
        <Tab.Screen
          name="Tasks"
          component={TaskList}
          options={{
            title: 'Tasks',
          }}
        />
      </Tab.Navigator>
      <FloatingAIButton />
    </>
  );
};
```

## 3. Chat Interface

```typescript
// src/features/chat/components/ChatRoom.tsx
import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Message, MessageInput } from '../components';
import { useChatMessages } from '../hooks/useChatMessages';

export const ChatRoom = ({ route }) => {
  const { chatId } = route.params;
  const { messages, sendMessage } = useChatMessages(chatId);

  const renderMessage = ({ item }) => (
    <Message
      message={item}
      isAI={item.sender === 'ai'}
      isUser={item.sender === 'user'}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        inverted
      />
      <MessageInput onSend={sendMessage} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  messageList: {
    padding: 16,
  },
});

// Message Component
interface MessageProps {
  message: {
    id: string;
    text: string;
    sender: string;
    timestamp: Date;
  };
  isAI: boolean;
  isUser: boolean;
}

const Message = ({ message, isAI, isUser }: MessageProps) => (
  <View style={[
    styles.messageContainer,
    isUser ? styles.userMessage : styles.otherMessage,
    isAI && styles.aiMessage,
  ]}>
    <Text style={styles.messageText}>{message.text}</Text>
  </View>
);

const messageStyles = StyleSheet.create({
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563EB',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
  },
  aiMessage: {
    backgroundColor: '#EBF5FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  messageText: {
    fontSize: 16,
    color: '#374151',
  },
});
```

## 4. AI Assistant Modal

```typescript
// src/features/ai/components/AIAssistant.tsx
import React from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAIStore } from '../stores/aiStore';

export const AIAssistant = () => {
  const insets = useSafeAreaInsets();
  const { isVisible, hideAssistant, messages, sendMessage } = useAIStore();
  const [input, setInput] = useState('');

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent
      onRequestClose={hideAssistant}
    >
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <View style={styles.handle} />
        
        <View style={styles.header}>
          <Text style={styles.title}>AI Assistant</Text>
          <TouchableOpacity onPress={hideAssistant}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.messageContainer}>
          {messages.map(message => (
            <View key={message.id} style={styles.message}>
              <Text>{message.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask anything..."
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={() => {
              sendMessage(input);
              setInput('');
            }}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    fontSize: 24,
    color: '#6B7280',
  },
  messageContainer: {
    flex: 1,
    marginBottom: 16,
  },
  message: {
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 24,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 24,
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});
```

Would you like me to:
1. Create additional UI components (Calendar, Tasks, etc.)
2. Add animations and transitions
3. Show how to handle different screen sizes
4. Add theme support
5. Create shared components
6. Add accessibility features
7. Show loading states and error handling

Let me know what aspect you'd like to explore further!