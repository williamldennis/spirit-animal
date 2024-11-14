import { collection, addDoc, query, where, getDocs, getFirestore } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { logger } from '../../../utils/logger';

class ChatService {
  async createChat(currentUserId: string, contactEmail: string) {
    try {
      logger.info('ChatService.createChat', 'Looking up contact', { contactEmail });
      
      // First, check if chat already exists
      const chatsRef = collection(db, 'chats');
      const existingChatQuery = query(
        chatsRef,
        where('participants', 'array-contains', currentUserId)
      );
      
      const existingChats = await getDocs(existingChatQuery);
      const existingChat = existingChats.docs.find(doc => {
        const data = doc.data();
        return data.participants.includes(currentUserId);
      });

      if (existingChat) {
        logger.info('ChatService.createChat', 'Chat already exists', { chatId: existingChat.id });
        return existingChat.id;
      }

      // If no chat exists, create a new one
      const chatDoc = await addDoc(chatsRef, {
        participants: [currentUserId],
        createdAt: new Date().toISOString(),
        lastMessage: null,
        lastMessageAt: null,
        updatedAt: new Date().toISOString()
      });

      logger.info('ChatService.createChat', 'Chat created', { 
        chatId: chatDoc.id,
        participants: [currentUserId]
      });

      return chatDoc.id;
    } catch (error: any) {
      logger.error('ChatService.createChat', 'Failed to create chat', { error });
      if (error.code === 'permission-denied') {
        throw new Error('Unable to create chat. Please check your permissions.');
      }
      throw new Error('Failed to create chat. Please try again.');
    }
  }
}

export const chatService = new ChatService(); 