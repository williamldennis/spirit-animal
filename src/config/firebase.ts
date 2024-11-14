import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import Constants from 'expo-constants';

const FIREBASE_CONFIG = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
  appId: Constants.expoConfig?.extra?.firebaseAppId,
};

// Validate config
if (!FIREBASE_CONFIG.apiKey) {
  throw new Error('Firebase configuration is missing. Please check your .env file.');
}

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db }; 