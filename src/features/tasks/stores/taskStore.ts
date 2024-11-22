import { create } from 'zustand';
import { Task } from '../types';
import { taskService } from '../services/taskService';
import { logger } from '../../../utils/logger';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  loadTasks: (userId: string) => Promise<void>;
  addTask: (userId: string, task: Partial<Task>) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  toggleTaskComplete: (taskId: string, completed: boolean) => Promise<void>;
  setTasks: (tasks: Task[]) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  
  setTasks: (tasks: Task[]) => {
    set({ tasks });
  },

  loadTasks: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      // Initial load
      const tasks = await taskService.getTasks(userId);
      set({ tasks, loading: false });

      // Setup subscription
      taskService.subscribeToDayTasks(userId, (updatedTasks) => {
        set({ tasks: updatedTasks });
      });
    } catch (error) {
      logger.error('TaskStore.loadTasks', 'Failed to load tasks', { error });
      set({ error: 'Failed to load tasks', loading: false });
    }
  },

  addTask: async (userId: string, task: Partial<Task>) => {
    set({ loading: true, error: null });
    try {
      const newTask = await taskService.createTask(userId, task);
      set(state => ({ 
        tasks: [newTask, ...state.tasks],
        loading: false 
      }));
    } catch (error) {
      logger.error('TaskStore.addTask', 'Failed to add task', { error });
      set({ error: 'Failed to add task', loading: false });
    }
  },

  updateTask: async (taskId: string, updates: Partial<Task>) => {
    set({ loading: true, error: null });
    try {
      await taskService.updateTask(taskId, updates);
      set(state => ({
        tasks: state.tasks.map(task => 
          task.id === taskId ? { ...task, ...updates } : task
        ),
        loading: false
      }));
    } catch (error) {
      logger.error('TaskStore.updateTask', 'Failed to update task', { error });
      set({ error: 'Failed to update task', loading: false });
    }
  },

  deleteTask: async (taskId: string) => {
    set({ loading: true, error: null });
    try {
      await taskService.deleteTask(taskId);
      set(state => ({
        tasks: state.tasks.filter(task => task.id !== taskId),
        loading: false
      }));
    } catch (error) {
      logger.error('TaskStore.deleteTask', 'Failed to delete task', { error });
      set({ error: 'Failed to delete task', loading: false });
    }
  },

  toggleTaskComplete: async (taskId: string, completed: boolean) => {
    set({ loading: true, error: null });
    try {
      await taskService.toggleTaskComplete(taskId, completed);
      set(state => ({
        tasks: state.tasks.map(task =>
          task.id === taskId ? { ...task, completed } : task
        ),
        loading: false
      }));
    } catch (error) {
      logger.error('TaskStore.toggleTaskComplete', 'Failed to toggle task', { error });
      set({ error: 'Failed to toggle task', loading: false });
    }
  },
})); 