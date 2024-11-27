import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { logger } from '../../../utils/logger';
import type { Task } from '../types';

class TaskService {
  async getTasks(userId: string): Promise<Task[]> {
    try {
      logger.debug('TaskService.getTasks', 'Fetching tasks', { userId });
      
      const tasksRef = collection(db, 'tasks');
      const q = query(
        tasksRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const tasks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];

      logger.debug('TaskService.getTasks', 'Tasks fetched', { 
        taskCount: tasks.length,
        sampleTasks: tasks.slice(0, 3).map(t => ({
          id: t.id,
          title: t.title,
          completed: t.completed
        }))
      });

      return tasks;
    } catch (error) {
      logger.error('TaskService.getTasks', 'Failed to fetch tasks', { error });
      throw error;
    }
  }

  async createTask(userId: string, taskData: Partial<Task>): Promise<Task> {
    try {
      const tasksRef = collection(db, 'tasks');
      
      // Create base task data without undefined values
      const baseTask = {
        userId,
        completed: false,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date())
      };

      // Filter out undefined values from taskData
      const filteredTaskData = Object.entries(taskData).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          // Convert Date objects to Timestamps
          if (value instanceof Date) {
            acc[key] = Timestamp.fromDate(value);
          } else {
            acc[key] = value;
          }
        }
        return acc;
      }, {} as Record<string, any>);

      // Merge the filtered data
      const newTask = {
        ...baseTask,
        ...filteredTaskData
      };

      logger.debug('TaskService.createTask', 'Creating task with data', {
        taskData: newTask
      });

      const docRef = await addDoc(tasksRef, newTask);
      return {
        id: docRef.id,
        ...newTask
      } as Task;
    } catch (error) {
      logger.error('TaskService.createTask', 'Failed to create task', { error });
      throw error;
    }
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        ...updates,
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error('TaskService.updateTask', 'Failed to update task', { error });
      throw error;
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await deleteDoc(taskRef);
    } catch (error) {
      logger.error('TaskService.deleteTask', 'Failed to delete task', { error });
      throw error;
    }
  }

  async toggleTaskComplete(taskId: string, completed: boolean): Promise<void> {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        completed,
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error('TaskService.toggleTaskComplete', 'Failed to toggle task', { error });
      throw error;
    }
  }

  subscribeToDayTasks(userId: string, callback: (tasks: Task[]) => void): () => void {
    try {
      logger.debug('TaskService.subscribeToDayTasks', 'Setting up subscription', { userId });
      
      const tasksRef = collection(db, 'tasks');
      const q = query(
        tasksRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc') // Simplify query to debug
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map(doc => {
          const data = doc.data();
          // Ensure timestamps are properly converted
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            dueDate: data.dueDate || null
          } as Task;
        });

        logger.debug('TaskService.subscribeToDayTasks', 'Tasks updated', { 
          taskCount: tasks.length,
          sampleTasks: tasks.slice(0, 3).map(t => ({
            id: t.id,
            title: t.title,
            completed: t.completed,
            parentTaskId: t.parentTaskId,
            createdAt: t.createdAt
          }))
        });

        callback(tasks);
      }, (error) => {
        logger.error('TaskService.subscribeToDayTasks', 'Subscription error', { error });
      });

      return unsubscribe;
    } catch (error) {
      logger.error('TaskService.subscribeToDayTasks', 'Failed to setup subscription', { error });
      throw error;
    }
  }
}

export const taskService = new TaskService(); 