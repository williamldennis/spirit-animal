import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { logger } from '../../../utils/logger';
import { chatService, Chat } from '../services/chatService';
import { useAuthStore } from '../../auth/stores/authStore';
import { userService, UserProfile } from '../../auth/services/userService';

export default function ChatList() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const user = useAuthStore(state => state.user);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});

  useEffect(() => {
    if (!user) return;

    logger.info('ChatList', 'Setting up chats subscription');
    const unsubscribe = chatService.subscribeToChats(user.uid, async (updatedChats) => {
      const profiles: Record<string, UserProfile> = {};
      for (const chat of updatedChats) {
        const otherUserId = chat.participants.find(id => id !== user.uid);
        if (otherUserId && !userProfiles[otherUserId]) {
          try {
            const profile = await userService.getUserProfile(otherUserId);
            if (profile) {
              profiles[otherUserId] = profile;
            }
          } catch (error) {
            logger.error('ChatList', 'Error loading user profile', { error });
          }
        }
      }
      setUserProfiles(prev => ({ ...prev, ...profiles }));
      setChats(updatedChats);
      setLoading(false);
    });

    return () => {
      logger.info('ChatList', 'Cleaning up chats subscription');
      unsubscribe();
    };
  }, [user]);

  const getOtherUserProfile = (chat: Chat): UserProfile | null => {
    if (!user) return null;
    const otherUserId = chat.participants.find(id => id !== user.uid);
    return otherUserId ? userProfiles[otherUserId] : null;
  };

  const renderChatItem = ({ item }: { item: Chat }) => {
    const otherUser = getOtherUserProfile(item);
    
    return (
      <TouchableOpacity 
        style={styles.chatItem}
        onPress={() => {
          logger.debug('ChatList', 'Navigating to chat', { chatId: item.id });
          navigation.navigate('Chat', { chatId: item.id });
        }}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {otherUser?.name.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>
              {otherUser?.name || 'Unknown User'}
            </Text>
            {item.lastMessageAt && (
              <Text style={styles.timestamp}>
                {format(item.lastMessageAt, 'MMM d')}
              </Text>
            )}
          </View>
          {item.lastMessage && (
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (chats.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No chats yet</Text>
        <Text style={styles.emptySubtext}>
          Start a new chat by tapping the edit button above
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={chats}
      keyExtractor={item => item.id}
      renderItem={renderChatItem}
      contentContainerStyle={styles.listContainer}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563EB',
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6B7280',
  },
}); 