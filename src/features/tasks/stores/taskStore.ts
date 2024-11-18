import { create } from 'zustand';
import { Task } from '../types';

interface TaskStore {
  tasks: Task[];
  loading: boolean;
  error: Error | null;
  createTask: (task: Omit<Task, 'id'>) => Promise<void>;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  loading: false,
  error: null,
  createTask: async (task) => {
    // Implementation
  }
})); 