import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

const FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Debug log Firebase config
logger.debug('Firebase', 'Initializing with config', {
  hasApiKey: !!FIREBASE_CONFIG.apiKey,
  hasAuthDomain: !!FIREBASE_CONFIG.authDomain,
  hasProjectId: !!FIREBASE_CONFIG.projectId,
});

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG);

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

logger.debug('Firebase', 'Initialization complete', {
  hasAuth: !!auth,
  hasDb: !!db,
});

export { auth, db }; 