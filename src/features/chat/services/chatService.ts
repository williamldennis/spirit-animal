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

const convertTimestamp = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'string') return new Date(timestamp);
  return new Date();
};

class ChatService {
  async createChat(currentUserId: string, contactEmail: string) {
    try {
      logger.info('ChatService.createChat', 'Looking up contact', { contactEmail });
      
      // First, find the contact's user ID
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', contactEmail));
      
      logger.debug('ChatService.createChat', 'Querying users collection', { 
        collection: 'users',
        field: 'email',
        value: contactEmail 
      });
      
      const querySnapshot = await getDocs(q);
      
      logger.debug('ChatService.createChat', 'Query results', { 
        empty: querySnapshot.empty,
        size: querySnapshot.size,
        docs: querySnapshot.docs.map(doc => ({
          id: doc.id,
          email: doc.data().email
        }))
      });
      
      if (querySnapshot.empty) {
        logger.warn('ChatService.createChat', 'Contact not found', { contactEmail });
        throw new Error('This contact is not registered on Spirit Animal yet.');
      }

      const contactUser = querySnapshot.docs[0];
      const contactId = contactUser.id;

      // Check if chat already exists between these users
      const chatsRef = collection(db, 'chats');
      const existingChatQuery = query(
        chatsRef,
        where('participants', 'array-contains', currentUserId)
      );
      
      const existingChats = await getDocs(existingChatQuery);
      const existingChat = existingChats.docs.find(doc => {
        const data = doc.data();
        return data.participants.includes(contactId);
      });

      if (existingChat) {
        logger.info('ChatService.createChat', 'Chat already exists', { 
          chatId: existingChat.id,
          participants: [currentUserId, contactId]
        });
        return existingChat.id;
      }

      // Create new chat with both participants
      const now = new Date();
      const chatDoc = await addDoc(chatsRef, {
        participants: [currentUserId, contactId], // Include both users
        createdAt: Timestamp.fromDate(now),
        lastMessage: null,
        lastMessageAt: null,
        updatedAt: Timestamp.fromDate(now)
      });

      logger.info('ChatService.createChat', 'Chat created', { 
        chatId: chatDoc.id,
        participants: [currentUserId, contactId]
      });

      return chatDoc.id;
    } catch (error: any) {
      logger.error('ChatService.createChat', 'Failed to create chat', { error });
      throw error;
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
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text || '',
          senderId: data.senderId || '',
          createdAt: convertTimestamp(data.createdAt),
        };
      }) as Message[];

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

  subscribeToChats(userId: string, callback: (chats: Chat[]) => void) {
    logger.info('ChatService.subscribeToChats', 'Setting up chats subscription', { userId });
    
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', userId),
      orderBy('lastMessageAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          participants: data.participants || [],
          lastMessage: data.lastMessage || null,
          lastMessageAt: data.lastMessageAt ? convertTimestamp(data.lastMessageAt) : null,
          createdAt: convertTimestamp(data.createdAt),
        };
      }) as Chat[];

      logger.debug('ChatService.subscribeToChats', 'Received chats update', { 
        userId, 
        chatCount: chats.length 
      });
      
      callback(chats);
    }, (error) => {
      logger.error('ChatService.subscribeToChats', 'Subscription error', { error });
    });
  }
}

export const chatService = new ChatService(); 