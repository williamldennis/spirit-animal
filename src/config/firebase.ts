import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// TODO: Move to secure configuration later
const FIREBASE_CONFIG = {
  apiKey: "your-actual-api-key",
  authDomain: "your-actual-domain.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-actual-bucket.appspot.com",
  messagingSenderId: "your-actual-sender-id",
  appId: "your-actual-app-id"
};

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG);

// Initialize Auth
const auth = getAuth(app);

export { auth }; 