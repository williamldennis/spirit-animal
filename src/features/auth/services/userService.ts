import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { logger } from '../../../utils/logger';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export class UserService {
  async createUserProfile(userId: string, email: string) {
    try {
      logger.info('UserService.createUserProfile', 'Creating user profile', { userId });
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        email,
        name: email.split('@')[0], // Simple name from email for now
        createdAt: new Date(),
      });
    } catch (error) {
      logger.error('UserService.createUserProfile', 'Failed to create profile', { error });
      throw error;
    }
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      logger.info('UserService.getUserProfile', 'Fetching user profile', { userId });
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return null;
      }

      const data = userDoc.data();
      return {
        id: userDoc.id,
        email: data.email,
        name: data.name,
        createdAt: data.createdAt.toDate(),
      };
    } catch (error) {
      logger.error('UserService.getUserProfile', 'Failed to fetch profile', { error });
      throw error;
    }
  }

  async verifyUserProfile(userId: string, email: string) {
    try {
      logger.info('UserService.verifyUserProfile', 'Checking user profile', { userId, email });
      const profile = await this.getUserProfile(userId);
      
      if (!profile) {
        logger.warn('UserService.verifyUserProfile', 'Profile not found, creating', { userId });
        await this.createUserProfile(userId, email);
        return await this.getUserProfile(userId);
      }
      
      return profile;
    } catch (error) {
      logger.error('UserService.verifyUserProfile', 'Failed to verify profile', { error });
      throw error;
    }
  }
}

export const userService = new UserService(); 