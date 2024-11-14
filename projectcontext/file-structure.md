# Project File Structure

```plaintext
productivity-app/
├── src/
│   ├── app/
│   │   ├── App.tsx                 # Root app component
│   │   ├── AppNavigator.tsx        # Navigation configuration
│   │   └── providers/
│   │       ├── AuthProvider.tsx    # Authentication context
│   │       ├── ThemeProvider.tsx   # Theme context
│   │       └── index.ts
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── SignInForm.tsx
│   │   │   │   ├── SignUpForm.tsx
│   │   │   │   └── GoogleSignInButton.tsx
│   │   │   ├── screens/
│   │   │   │   ├── SignInScreen.tsx
│   │   │   │   └── SignUpScreen.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   └── useGoogleSignIn.ts
│   │   │   ├── services/
│   │   │   │   └── authService.ts
│   │   │   └── types/
│   │   │       └── auth.types.ts
│   │   │
│   │   ├── chat/
│   │   │   ├── components/
│   │   │   │   ├── ChatBubble.tsx
│   │   │   │   ├── ChatInput.tsx
│   │   │   │   └── ChatHeader.tsx
│   │   │   ├── screens/
│   │   │   │   ├── ChatListScreen.tsx
│   │   │   │   └── ChatRoomScreen.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useChat.ts
│   │   │   │   └── useMessages.ts
│   │   │   ├── services/
│   │   │   │   └── chatService.ts
│   │   │   └── types/
│   │   │       └── chat.types.ts
│   │   │
│   │   ├── calendar/
│   │   │   ├── components/
│   │   │   │   ├── CalendarView.tsx
│   │   │   │   ├── EventCard.tsx
│   │   │   │   └── EventForm.tsx
│   │   │   ├── screens/
│   │   │   │   ├── CalendarScreen.tsx
│   │   │   │   └── EventDetailScreen.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useCalendar.ts
│   │   │   │   └── useEvents.ts
│   │   │   ├── services/
│   │   │   │   └── calendarService.ts
│   │   │   └── types/
│   │   │       └── calendar.types.ts
│   │   │
│   │   ├── tasks/
│   │   │   ├── components/
│   │   │   │   ├── TaskCard.tsx
│   │   │   │   ├── TaskList.tsx
│   │   │   │   └── TaskForm.tsx
│   │   │   ├── screens/
│   │   │   │   ├── TaskListScreen.tsx
│   │   │   │   └── TaskDetailScreen.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useTasks.ts
│   │   │   ├── services/
│   │   │   │   └── taskService.ts
│   │   │   └── types/
│   │   │       └── task.types.ts
│   │   │
│   │   └── ai/
│   │       ├── components/
│   │       │   ├── AIAssistant.tsx
│   │       │   ├── AISuggestion.tsx
│   │       │   └── AIInput.tsx
│   │       ├── hooks/
│   │       │   └── useAI.ts
│   │       ├── services/
│   │       │   └── aiService.ts
│   │       └── types/
│   │           └── ai.types.ts
│   │
│   ├── shared/
│   │   ├── components/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Loading.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useDebounce.ts
│   │   │   ├── useForm.ts
│   │   │   └── useNetwork.ts
│   │   │
│   │   ├── services/
│   │   │   ├── api.ts              # API client setup
│   │   │   ├── storage.ts          # Local storage utilities
│   │   │   └── firebase.ts         # Firebase configuration
│   │   │
│   │   └── utils/
│   │       ├── dateUtils.ts
│   │       ├── formatters.ts
│   │       └── validation.ts
│   │
│   ├── store/
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── chatSlice.ts
│   │   │   └── settingsSlice.ts
│   │   └── index.ts
│   │
│   ├── navigation/
│   │   ├── types.ts
│   │   ├── AuthNavigator.tsx
│   │   ├── MainNavigator.tsx
│   │   └── linking.ts
│   │
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   ├── typography.ts
│   │   └── index.ts
│   │
│   └── types/
│       ├── navigation.types.ts
│       ├── api.types.ts
│       └── common.types.ts
│
├── assets/
│   ├── images/
│   ├── fonts/
│   └── icons/
│
├── __tests__/
│   ├── components/
│   ├── services/
│   └── utils/
│
├── .env
├── .env.development
├── .env.production
├── app.json
├── package.json
├── tsconfig.json
├── babel.config.js
└── metro.config.js
```

Key Type Definitions:

```typescript
// src/types/common.types.ts
export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

// src/features/chat/types/chat.types.ts
export interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
  type: 'text' | 'ai_suggestion' | 'calendar_event';
}

// src/features/calendar/types/calendar.types.ts
export interface Event {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  attendees: string[];
}

// src/features/tasks/types/task.types.ts
export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
}
```

Important Configuration Files:

```typescript
// babel.config.js
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@app': './src/app',
          '@features': './src/features',
          '@shared': './src/shared',
          '@store': './src/store',
          '@theme': './src/theme',
          '@types': './src/types',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};

// tsconfig.json
{
  "extends": "@tsconfig/react-native/tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@app/*": ["src/app/*"],
      "@features/*": ["src/features/*"],
      "@shared/*": ["src/shared/*"],
      "@store/*": ["src/store/*"],
      "@theme/*": ["src/theme/*"],
      "@types/*": ["src/types/*"]
    },
    "types": ["jest"]
  }
}
```

Path Imports Example:
```typescript
// Using path aliases for clean imports
import { Button } from '@shared/components/Button';
import { useAuth } from '@features/auth/hooks/useAuth';
import { colors } from '@theme/colors';
import { User } from '@types/common.types';
```

