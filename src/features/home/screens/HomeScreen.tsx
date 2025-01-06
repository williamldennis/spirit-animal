import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { logger } from '../../../utils/logger';
import ChatList from '../../chat/components/ChatList';
import CalendarScreen from '../../calendar/screens/CalendarScreen';
import TaskList from '../../tasks/components/TaskList';
import AddTaskModal from '../../tasks/components/AddTaskModal';
import { AIBottomSheet } from '../../ai/components/AIBottomSheet';
import AddEventModal from '../../calendar/components/AddEventModal';
import EmailScreen from '../../email/screens/EmailScreen';
import { useBottomSheet } from '../../shared/hooks/useBottomSheet';

type TabType = {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
};

const TABS: TabType[] = [
  { id: 'chat', icon: 'message-circle', label: 'Chat' },
  { id: 'calendar', icon: 'calendar', label: 'Calendar' },
  { id: 'tasks', icon: 'check-square', label: 'Tasks' },
  { id: 'email', icon: 'mail', label: 'Email' }
];

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState('chat');
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const navigation = useNavigation();

  const renderHeaderRight = () => {
    if (activeTab === 'chat') {
      return (
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => {
              logger.debug('HomeScreen', 'Navigating to SelectContact');
              navigation.navigate('SelectContact');
            }}
          >
            <Feather name="edit" size={24} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Feather name="more-vertical" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
      );
    }
    
    if (activeTab === 'calendar') {
      return (
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowAddEvent(true)}
          >
            <Feather name="plus" size={24} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Feather name="search" size={24} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Feather name="more-vertical" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
      );
    }
    
    if (activeTab === 'tasks') {
      return (
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowAddTask(true)}
          >
            <Feather name="plus" size={24} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Feather name="more-vertical" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
      );
    }
    
    if (activeTab === 'email') {
      return (
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.navigate('ComposeEmail')}
          >
            <Feather name="edit" size={24} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Feather name="search" size={24} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Feather name="more-vertical" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
      );
    }
    
    return null;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatList />;
      case 'calendar':
        return <CalendarScreen />;
      case 'tasks':
        return (
          <>
            <TaskList />
            <AddTaskModal 
              visible={showAddTask} 
              onClose={() => setShowAddTask(false)} 
            />
          </>
        );
      case 'email':
        return <EmailScreen />;
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
           activeTab === 'calendar' ? 'Calendar' : 
           activeTab === 'tasks' ? 'Tasks' : 'Email'}
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
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => {
          logger.debug('HomeScreen', 'Opening AI Assistant');
          setShowAI(true);
        }}
      >
        <Text style={styles.fabText}>🦊</Text>
      </TouchableOpacity>

      {/* AI Bottom Sheet */}
      <AIBottomSheet 
        visible={showAI}
        onClose={() => setShowAI(false)} 
      />

      <AddEventModal 
        visible={showAddEvent} 
        onClose={() => setShowAddEvent(false)} 
      />
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
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    minHeight: 40,
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
    bottom: 120,
    width: 56,
    height: 56,
    borderRadius: 28,
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
    fontSize: 24,
    lineHeight: 28,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 