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
import { aiService } from '../../ai/services/aiService';
import { useAIStore } from '../../ai/stores/aiStore';
import { useBottomSheet } from '../../shared/hooks/useBottomSheet';
import { AIBottomSheet } from '../../ai/components/AIBottomSheet';

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
  const [expandingTask, setExpandingTask] = useState<string | null>(null);
  const { showAIBottomSheet } = useBottomSheet();
  const { setAIResponse } = useAIStore();
  const isAIBottomSheetVisible = useBottomSheet((state) => state.isAIBottomSheetVisible);
  const hideAIBottomSheet = useBottomSheet((state) => state.hideAIBottomSheet);

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
      // Group subtasks with their parent tasks
      const taskMap = new Map<string, Task>();
      const parentTasks: Task[] = [];
      
      // First pass: collect all tasks in a map and identify parent tasks
      allTasks.forEach(task => {
        taskMap.set(task.id, task);
        if (!task.parentTaskId) {
          parentTasks.push(task);
        }
      });

      // Process tasks into sections
      const processTasksForSection = (tasks: Task[]) => {
        // First, create a map of parent tasks to their subtasks
        const taskGroups = new Map<string, Task[]>();
        
        // Group all subtasks by their parent
        allTasks.forEach(task => {
          if (task.parentTaskId) {
            const subtasks = taskGroups.get(task.parentTaskId) || [];
            subtasks.push(task);
            taskGroups.set(task.parentTaskId, subtasks);
          }
        });

        // Process parent tasks and inject their subtasks
        return tasks.reduce((acc: Task[], parentTask) => {
          // Only process parent tasks
          if (!parentTask.parentTaskId) {
            // Add the parent task
            acc.push(parentTask);
            
            // Add all subtasks for this parent
            const subtasks = taskGroups.get(parentTask.id) || [];
            subtasks
              .sort((a, b) => {
                if (a.completed !== b.completed) {
                  return a.completed ? 1 : -1;
                }
                return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
              })
              .forEach(subtask => acc.push(subtask));
          }
          return acc;
        }, []);
      };

      const incompleteTasks = parentTasks.filter(task => !task.completed);
      const completedTasks = parentTasks.filter(task => task.completed);

      const todayTasks = processTasksForSection(
        incompleteTasks.filter(task => {
          const date = getTaskDate(task.dueDate);
          return date && isToday(date);
        })
      );

      const tomorrowTasks = processTasksForSection(
        incompleteTasks.filter(task => {
          const date = getTaskDate(task.dueDate);
          return date && isTomorrow(date);
        })
      );

      const futureTasks = processTasksForSection(
        incompleteTasks.filter(task => {
          const date = getTaskDate(task.dueDate);
          return !date || (date && !isToday(date) && !isTomorrow(date));
        })
      );

      const sections: TaskSection[] = [
        { title: 'Today', data: todayTasks },
        { title: 'Tomorrow', data: tomorrowTasks },
        { title: 'Future', data: futureTasks }
      ];

      if (showCompleted && completedTasks.length > 0) {
        sections.push({
          title: 'Completed',
          data: processTasksForSection(completedTasks)
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

  const handleExpandTask = async (task: Task) => {
    if (expandingTask) return; // Prevent multiple expansions at once
    
    try {
      setExpandingTask(task.id);
      await aiService.expandTaskIntoSubtasks(task);
    } catch (error) {
      logger.error('TaskList.handleExpandTask', 'Failed to expand task', { error });
      Alert.alert('Error', 'Failed to break down task. Please try again.');
    } finally {
      setExpandingTask(null);
    }
  };

  const handleAutoCompleteTask = async (task: Task) => {
    if (expandingTask === task.id) return;
    
    try {
      setExpandingTask(task.id);
      logger.debug('TaskList.handleAutoCompleteTask', 'Attempting to auto-complete task', { 
        taskId: task.id,
        title: task.title 
      });

      const response = await aiService.attemptAutoComplete(task);
      
      // Show the AI's response in the bottom sheet
      setAIResponse(response);
      showAIBottomSheet();

      if (response.completed) {
        // Task was completed automatically
        await taskService.toggleTaskComplete(task.id, true);
        logger.debug('TaskList.handleAutoCompleteTask', 'Task completed successfully', {
          taskId: task.id,
          response
        });
      } else {
        logger.debug('TaskList.handleAutoCompleteTask', 'Task could not be completed', {
          taskId: task.id,
          reason: response.confirmation
        });
      }
    } catch (error) {
      logger.error('TaskList.handleAutoCompleteTask', 'Failed to auto-complete task', { error });
      Alert.alert('Error', 'Failed to process task. Please try again.');
    } finally {
      setExpandingTask(null);
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
        renderItem={({ item, section }) => {
          const isSubtask = !!item.parentTaskId;
          
          return (
            <View style={[
              styles.taskItem,
              section.title === 'Completed' && styles.completedTaskItem,
              isSubtask && styles.subtaskItem
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
                    isSubtask && styles.subtaskTitle,
                    item.completed && styles.taskTitleCompleted
                  ]}>
                    {item.title}
                  </Text>
                  
                  <View style={styles.taskActions}>
                    {isSubtask ? (
                      <TouchableOpacity 
                        onPress={() => handleAutoCompleteTask(item)}
                        disabled={expandingTask === item.id}
                        style={styles.autoCompleteButton}
                      >
                        {expandingTask === item.id ? (
                          <ActivityIndicator size="small" color="#2563EB" />
                        ) : (
                          <Text style={styles.autoCompleteButtonText}>🪄</Text>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity 
                        onPress={() => handleExpandTask(item)}
                        disabled={expandingTask === item.id}
                        style={styles.expandButton}
                      >
                        {expandingTask === item.id ? (
                          <ActivityIndicator size="small" color="#2563EB" />
                        ) : (
                          <Text style={styles.expandButtonText}>🦊</Text>
                        )}
                      </TouchableOpacity>
                    )}
                    {item.dueDate && (
                      <Text style={styles.taskDueDate}>
                        {formatDueDate(item.dueDate)}
                      </Text>
                    )}
                  </View>
                </View>
                
                {item.description && (
                  <Text style={styles.taskDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        }}
      />
      
      {editingTask && (
        <EditTaskModal
          visible={!!editingTask}
          onClose={() => setEditingTask(null)}
          task={editingTask}
        />
      )}

      <AIBottomSheet 
        visible={isAIBottomSheetVisible}
        onClose={hideAIBottomSheet}
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
    paddingRight: 8,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'nowrap',
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  subtaskTitle: {
    fontSize: 15,
    color: '#4B5563',
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
  subtaskItem: {
    marginLeft: 40,
    paddingLeft: 24,
    borderLeftWidth: 2,
    borderLeftColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  expandButton: {
    padding: 4,
    marginLeft: 'auto',
  },
  expandButtonText: {
    fontSize: 16,
  },
  taskDueDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  autoCompleteButton: {
    padding: 4,
    marginLeft: 'auto',
  },
  autoCompleteButtonText: {
    fontSize: 16,
  },
}); 