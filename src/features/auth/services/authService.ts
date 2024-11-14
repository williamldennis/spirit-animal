import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { auth } from '../../../config/firebase';
import { logger } from '../../../utils/logger';
import { userService } from './userService';

class AuthService {
  async signUp(email: string, password: string) {
    logger.info('AuthService.signUp', 'Starting sign up process', { email });
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Create user profile in Firestore
      await userService.createUserProfile(userCredential.user.uid, email);
      
      logger.info('AuthService.signUp', 'Sign up successful', { 
        userId: userCredential.user.uid,
        email 
      });
      return userCredential.user;
    } catch (error: any) {
      logger.error('AuthService.signUp', 'Sign up failed', { error });
      throw this.handleAuthError(error);
    }
  }

  async signIn(email: string, password: string) {
    logger.info('AuthService.signIn', 'Starting sign in process', { email });
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Verify user profile exists
      await userService.verifyUserProfile(userCredential.user.uid, email);
      
      logger.info('AuthService.signIn', 'Sign in successful', { userId: userCredential.user.uid });
      return userCredential.user;
    } catch (error: any) {
      logger.error('AuthService.signIn', 'Sign in failed', { error });
      throw this.handleAuthError(error);
    }
  }

  async signOut() {
    logger.info('AuthService.signOut', 'Starting sign out process');
    try {
      await firebaseSignOut(auth);
      logger.info('AuthService.signOut', 'Sign out successful');
    } catch (error: any) {
      logger.error('AuthService.signOut', 'Sign out failed', { error });
      throw this.handleAuthError(error);
    }
  }

  private handleAuthError(error: any) {
    logger.debug('AuthService.handleAuthError', 'Processing auth error', { errorCode: error.code });
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
        logger.error('AuthService.handleAuthError', 'Unhandled auth error', { error });
        return new Error('An unexpected error occurred. Please try again.');
    }
  }
}

export const authService = new AuthService(); 