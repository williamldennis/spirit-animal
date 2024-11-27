import type { Timestamp } from 'firebase/firestore';

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: Timestamp;
  priority?: 'low' | 'medium' | 'high';
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  parentTaskId?: string;
} 