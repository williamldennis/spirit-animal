import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { auth } from '../../../config/firebase';

class AuthService {
  async signUp(email: string, password: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      return userCredential.user;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  async signIn(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      return userCredential.user;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  async signOut() {
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  private handleAuthError(error: any) {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return new Error('This email address is already registered. Please sign in or use a different email.');
      case 'auth/invalid-email':
        return new Error('Please enter a valid email address.');
      case 'auth/operation-not-allowed':
        return new Error('Sign up is currently disabled. Please try again later.');
      case 'auth/weak-password':
        return new Error('Password should be at least 6 characters long and include numbers and special characters.');
      case 'auth/network-request-failed':
        return new Error('Network error. Please check your internet connection and try again.');
      case 'auth/too-many-requests':
        return new Error('Too many attempts. Please try again later.');
      case 'auth/internal-error':
        return new Error('An internal error occurred. Please try again later.');
      default:
        console.error('Firebase Auth Error:', error);
        return new Error('An unexpected error occurred. Please try again.');
    }
  }
}

export const authService = new AuthService(); 