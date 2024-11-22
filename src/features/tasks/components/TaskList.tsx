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
import { taskService } from '../services/taskService';
import { useAuthStore } from '../../auth/stores/authStore';
import { logger } from '../../../utils/logger';
import { isToday, isTomorrow, format } from 'date-fns';
import EditTaskModal from './EditTaskModal';
import type { Task } from '../types';
import type { Timestamp } from 'firebase/firestore';

type TaskSection = {
  title: string;
  data: Task[];
};

export default function TaskList() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskSection[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const user = useAuthStore(state => state.user);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const formatDueDate = (dueDate: string | Date | Timestamp | undefined) => {
    if (!dueDate) return '';
    try {
      let date: Date;
      
      if (typeof dueDate === 'string') {
        date = new Date(dueDate);
      } else if (dueDate instanceof Date) {
        date = dueDate;
      } else if ('seconds' in dueDate && 'nanoseconds' in dueDate) {
        // Handle Firestore Timestamp
        date = new Date(dueDate.seconds * 1000);
      } else {
        throw new Error('Invalid date format');
      }

      return format(date, 'MM/dd/yyyy');
    } catch (error) {
      logger.error('TaskList.formatDueDate', 'Failed to format date', { 
        dueDate, 
        error,
        dateType: typeof dueDate,
        isTimestamp: dueDate && 'seconds' in dueDate
      });
      return '';
    }
  };

  const getTaskDate = (dueDate: string | Date | Timestamp | undefined): Date | null => {
    if (!dueDate) return null;
    try {
      if (typeof dueDate === 'string') {
        return new Date(dueDate);
      } else if (dueDate instanceof Date) {
        return dueDate;
      } else if ('seconds' in dueDate && 'nanoseconds' in dueDate) {
        return new Date(dueDate.seconds * 1000);
      }
      return null;
    } catch (error) {
      logger.error('TaskList.getTaskDate', 'Failed to parse date', { dueDate, error });
      return null;
    }
  };

  useEffect(() => {
    if (!user) return;

    const unsubscribe = taskService.subscribeToDayTasks(user.uid, (allTasks) => {
      // Split tasks into sections
      const incompleteTasks = allTasks.filter(task => !task.completed);
      const completedTasks = allTasks.filter(task => task.completed);

      const todayTasks = incompleteTasks.filter(task => {
        const date = getTaskDate(task.dueDate);
        return date && isToday(date);
      });

      const tomorrowTasks = incompleteTasks.filter(task => {
        const date = getTaskDate(task.dueDate);
        return date && isTomorrow(date);
      });

      const futureTasks = incompleteTasks.filter(task => {
        const date = getTaskDate(task.dueDate);
        return !date || // Tasks with no due date
          (date && !isToday(date) && !isTomorrow(date)); // Future dated tasks
      });

      const sections: TaskSection[] = [
        {
          title: 'Today',
          data: todayTasks,
        },
        {
          title: 'Tomorrow',
          data: tomorrowTasks,
        },
        {
          title: 'Future',
          data: futureTasks,
        }
      ];

      if (showCompleted && completedTasks.length > 0) {
        sections.push({
          title: 'Completed',
          data: completedTasks,
        });
      }

      setTasks(sections.filter(section => section.data.length > 0));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, showCompleted]);

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      await taskService.toggleTaskComplete(taskId, completed);
    } catch (error) {
      logger.error('TaskList', 'Failed to toggle task', { error });
      Alert.alert('Error', 'Failed to update task. Please try again.');
    }
  };

  const handleTaskLongPress = (task: Task) => {
    setEditingTask(task);
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
        ListHeaderComponent={
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setShowCompleted(!showCompleted)}
          >
            <Text style={styles.toggleButtonText}>
              {showCompleted ? 'Hide Completed' : 'Show Completed'}
            </Text>
            <Feather 
              name={showCompleted ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color="#6B7280" 
            />
          </TouchableOpacity>
        }
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        renderItem={({ item, section }) => (
          <View style={[
            styles.taskItem,
            section.title === 'Completed' && styles.completedTaskItem
          ]}>
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
            <TouchableOpacity 
              style={styles.taskContent}
              onPress={() => handleTaskLongPress(item)}
            >
              <View style={styles.taskTitleRow}>
                <Text style={[
                  styles.taskTitle,
                  item.completed && styles.taskTitleCompleted
                ]}>
                  {item.title}
                </Text>
                {item.dueDate && (
                  <Text style={styles.taskDueDate}>
                    {formatDueDate(item.dueDate)}
                  </Text>
                )}
              </View>
              {item.description && (
                <Text style={styles.taskDescription}>{item.description}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      />
      
      {editingTask && (
        <EditTaskModal
          visible={!!editingTask}
          onClose={() => setEditingTask(null)}
          task={editingTask}
        />
      )}
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
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 4,
  },
  completedTaskItem: {
    opacity: 0.7,
    backgroundColor: '#F9FAFB',
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskDueDate: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
}); 