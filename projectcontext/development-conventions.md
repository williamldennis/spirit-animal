# Development Conventions - Productivity App

## Technology Stack
- React Native CLI (not Expo)
- TypeScript
- Zustand for state management
- React Query for data fetching
- MMKV for storage
- React Navigation
- React Native Paper UI components
- Firebase backend services

## Code Style and Structure

### File Organization
```plaintext
src/
├── features/          # Feature-based organization
│   ├── auth/
│   ├── chat/
│   ├── calendar/
│   ├── tasks/
│   └── ai/
├── shared/           # Shared utilities and components
├── navigation/       # Navigation configuration
├── store/           # Zustand store definitions
└── types/           # Global type definitions
```

### Naming Conventions
- Use kebab-case for directories: `features/chat-room/`
- Use PascalCase for components: `MessageBubble.tsx`
- Use camelCase for utilities: `useMessages.ts`
- Use descriptive names with auxiliary verbs: `isLoading`, `hasError`, `shouldUpdate`

### Component Structure
```typescript
// Single component per file
// Order: imports, types, component, styles
import { View, Text } from 'react-native';
import { styles } from './styles';

interface ComponentProps {
  // Props definition
}

export function ComponentName({ prop1, prop2 }: ComponentProps) {
  // Component logic
  return (
    // JSX
  );
}
```

### TypeScript Usage
- Use interfaces over types when possible
- Enable strict mode in TypeScript
- Use explicit return types for functions
- Use proper type imports/exports
- No 'any' types - use proper typing or unknown

## Coding Practices

### State Management
```typescript
// Zustand store example
interface AppState {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const useStore = create<AppState>((set) => ({
  theme: 'light',
  setTheme: (theme) => set({ theme })
}));
```

### Data Fetching
```typescript
// React Query pattern
function useData(id: string) {
  return useQuery(['key', id], 
    () => fetchData(id),
    {
      staleTime: 1000 * 60,
      cacheTime: 1000 * 60 * 30,
    }
  );
}
```

### Error Handling
- Use try/catch with async/await
- Handle errors at the beginning of functions
- Use early returns
- Implement global error boundaries
- Use proper error typing

### Performance
- Use React.memo for expensive components
- Implement virtualized lists for long scrolling
- Use proper image caching
- Minimize re-renders
- Use proper memoization (useMemo, useCallback)

## UI/UX Standards

### Styling
```typescript
// Use StyleSheet for better performance
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  }
});

// Or use styled-components/Tailwind if preferred
```

### Component Patterns
- Use functional components
- Implement proper loading states
- Handle empty states
- Provide error feedback
- Use proper keyboard handling

### Navigation
```typescript
// Type-safe navigation
type RootStackParamList = {
  Home: undefined;
  Chat: { id: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
```

## Testing Conventions
- Write unit tests for utilities
- Write component tests with React Native Testing Library
- Use proper mocking for services
- Implement integration tests for critical flows

## Security Practices
- Sanitize all user inputs
- Use secure storage for sensitive data
- Implement proper authentication flows
- Use HTTPS for all network requests
- Handle permissions properly

## Git Practices
- Use feature branches
- Write meaningful commit messages
- Review code before merging
- Keep PRs focused and small
- Use proper Git hooks

## Code Review Guidelines
- Check for TypeScript errors
- Verify performance implications
- Review security considerations
- Check for proper error handling
- Verify testing coverage

## VSCode/Cursor Setup
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.updateImportsOnFileMove.enabled": "always",
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

## CLI Commands
```bash
# Development
npm run start     # Start Metro bundler
npm run ios       # Run iOS simulator
npm run android   # Run Android emulator
npm run test      # Run tests
npm run lint      # Run linter

# Build
npm run build:ios      # Build iOS
npm run build:android  # Build Android
```

## Environment Configuration
```typescript
// Use react-native-config for environment variables
import Config from 'react-native-config';

const apiKey = Config.API_KEY;
```

## Performance Monitoring
- Implement proper logging
- Use Firebase Analytics
- Monitor crash reports
- Track key metrics
- Use performance monitoring tools

## Documentation
- Document complex logic
- Maintain README files
- Use JSDoc for public APIs
- Document environment setup
- Keep deployment docs updated
- Use comments to explain "why" behind the code

## About me
- I'm a novice developer with a passion for learning and building
- I'm looking for a mentor to guide me through the development process

## Debugging
- Use a systematic approach to debugging
- Make sure to search the code base for words including the error message in order to find the root cause or possible solutions
- Don't sacrifice functionality for the sake of a clean code base
- Don't remove features or refactor code without talking to me first


