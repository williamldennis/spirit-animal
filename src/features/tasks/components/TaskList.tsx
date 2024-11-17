import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  SectionList,
  Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { taskService, Task } from '../services/taskService';
import { useAuthStore } from '../../auth/stores/authStore';
import { logger } from '../../../utils/logger';

type TaskSection = {
  title: string;
  data: Task[];
};

export default function TaskList() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskSection[]>([]);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    if (!user) return;

    const today = new Date();
    const unsubscribe = taskService.subscribeToDayTasks(user.uid, today, (todayTasks) => {
      const sections: TaskSection[] = [
        {
          title: 'Today',
          data: todayTasks,
        }
      ];
      setTasks(sections);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      await taskService.toggleTaskComplete(taskId, completed);
    } catch (error) {
      logger.error('TaskList', 'Failed to toggle task', { error });
      Alert.alert('Error', 'Failed to update task. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={tasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.taskItem}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => handleToggleTask(item.id, !item.completed)}
            >
              {item.completed ? (
                <Feather name="check-square" size={20} color="#2563EB" />
              ) : (
                <Feather name="square" size={20} color="#9CA3AF" />
              )}
            </TouchableOpacity>
            <View style={styles.taskContent}>
              <Text style={[
                styles.taskTitle,
                item.completed && styles.taskTitleCompleted
              ]}>
                {item.title}
              </Text>
              {item.description && (
                <Text style={styles.taskDescription}>{item.description}</Text>
              )}
            </View>
          </View>
        )}
      />
    </View>
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
  },
  sectionHeader: {
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  checkbox: {
    marginRight: 12,
    marginTop: 2,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  taskDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  container: {
    flex: 1,
  }
}); 