import { 
  collection, addDoc, query, where, getDocs, 
  orderBy, onSnapshot, Timestamp, doc, getDoc, updateDoc 
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { logger } from '../../../utils/logger';

export type Message = {
  id: string;
  text: string;
  senderId: string;
  createdAt: Date;
};

export type Chat = {
  id: string;
  participants: string[];
  lastMessage: string | null;
  lastMessageAt: Date | null;
  createdAt: Date;
};

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

  async sendMessage(chatId: string, senderId: string, text: string) {
    try {
      logger.info('ChatService.sendMessage', 'Sending message', { chatId, senderId });
      
      const messagesRef = collection(db, `chats/${chatId}/messages`);
      const messageDoc = await addDoc(messagesRef, {
        text,
        senderId,
        createdAt: Timestamp.now(),
      });

      // Update chat's last message
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        lastMessage: text,
        lastMessageAt: Timestamp.now(),
      });

      logger.info('ChatService.sendMessage', 'Message sent', { messageId: messageDoc.id });
      return messageDoc.id;
    } catch (error) {
      logger.error('ChatService.sendMessage', 'Failed to send message', { error });
      throw new Error('Failed to send message. Please try again.');
    }
  }

  subscribeToMessages(chatId: string, callback: (messages: Message[]) => void) {
    logger.info('ChatService.subscribeToMessages', 'Setting up messages subscription', { chatId });
    
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const q = query(messagesRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Message[];

      logger.debug('ChatService.subscribeToMessages', 'Received messages update', { 
        chatId, 
        messageCount: messages.length 
      });
      
      callback(messages);
    }, (error) => {
      logger.error('ChatService.subscribeToMessages', 'Subscription error', { error });
    });
  }

  async getChatDetails(chatId: string): Promise<Chat> {
    try {
      logger.info('ChatService.getChatDetails', 'Fetching chat details', { chatId });
      
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (!chatDoc.exists()) {
        throw new Error('Chat not found');
      }

      const data = chatDoc.data();
      return {
        id: chatDoc.id,
        participants: data.participants,
        lastMessage: data.lastMessage,
        lastMessageAt: data.lastMessageAt?.toDate() || null,
        createdAt: data.createdAt.toDate(),
      };
    } catch (error) {
      logger.error('ChatService.getChatDetails', 'Failed to fetch chat details', { error });
      throw new Error('Failed to load chat details. Please try again.');
    }
  }
}

export const chatService = new ChatService(); 