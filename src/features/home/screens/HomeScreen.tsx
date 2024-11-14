import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { logger } from '../../../utils/logger';
import ChatList from '../../chat/components/ChatList';

type TabType = {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
};

const TABS: TabType[] = [
  { id: 'chat', icon: 'message-circle', label: 'Chat' },
  { id: 'calendar', icon: 'calendar', label: 'Calendar' },
  { id: 'tasks', icon: 'check-square', label: 'Tasks' }
];

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState('chat');
  const navigation = useNavigation();

  const renderHeaderRight = () => {
    if (activeTab === 'chat') {
      return (
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => {
              logger.debug('HomeScreen', 'Navigating to SelectContact');
              navigation.navigate('SelectContact');
            }}
          >
            <Feather name="edit" size={24} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="more-vertical" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.iconButton}>
          <Feather name="search" size={24} color="#6B7280" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <Feather name="more-vertical" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatList />;
      case 'calendar':
        return (
          <View style={styles.centerContainer}>
            <Text>Calendar Coming Soon</Text>
          </View>
        );
      case 'tasks':
        return (
          <View style={styles.centerContainer}>
            <Text>Tasks Coming Soon</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {activeTab === 'chat' ? 'Messages' : 
           activeTab === 'calendar' ? 'Calendar' : 'Tasks'}
        </Text>
        {renderHeaderRight()}
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabButton}
            onPress={() => setActiveTab(tab.id)}
          >
            <Feather
              name={tab.icon}
              size={24}
              color={activeTab === tab.id ? '#2563EB' : '#6B7280'}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === tab.id ? '#2563EB' : '#6B7280' }
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* AI FAB */}
      <TouchableOpacity style={styles.fab}>
        <Text style={styles.fabText}>AI</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 8,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tabButton: {
    alignItems: 'center',
    padding: 8,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 90,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 