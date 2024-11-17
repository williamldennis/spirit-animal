import { 
  collection, addDoc, query, where, getDocs, 
  orderBy, onSnapshot, Timestamp, doc, updateDoc, deleteDoc 
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { logger } from '../../../utils/logger';

export type Task = {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate: Date;
  createdAt: Date;
  userId: string;
};

class TaskService {
  async createTask(userId: string, task: Omit<Task, 'id' | 'createdAt' | 'userId'>) {
    try {
      logger.info('TaskService.createTask', 'Creating task', { userId });
      const tasksRef = collection(db, 'tasks');
      const taskDoc = await addDoc(tasksRef, {
        ...task,
        userId,
        createdAt: Timestamp.now(),
        completed: false,
      });
      
      logger.info('TaskService.createTask', 'Task created', { taskId: taskDoc.id });
      return taskDoc.id;
    } catch (error) {
      logger.error('TaskService.createTask', 'Failed to create task', { error });
      throw error;
    }
  }

  async toggleTaskComplete(taskId: string, completed: boolean) {
    try {
      logger.info('TaskService.toggleTaskComplete', 'Toggling task completion', { taskId });
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, { completed });
    } catch (error) {
      logger.error('TaskService.toggleTaskComplete', 'Failed to toggle task', { error });
      throw error;
    }
  }

  subscribeToDayTasks(userId: string, date: Date, callback: (tasks: Task[]) => void) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    logger.info('TaskService.subscribeToDayTasks', 'Setting up tasks subscription', { 
      userId, 
      date: date.toISOString() 
    });

    const tasksRef = collection(db, 'tasks');
    const q = query(
      tasksRef,
      where('userId', '==', userId),
      where('dueDate', '>=', startOfDay),
      where('dueDate', '<=', endOfDay),
      orderBy('dueDate', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate.toDate(),
        createdAt: doc.data().createdAt.toDate(),
      })) as Task[];

      logger.debug('TaskService.subscribeToDayTasks', 'Received tasks update', { 
        taskCount: tasks.length 
      });
      
      callback(tasks);
    });
  }

  async deleteTask(taskId: string) {
    try {
      logger.info('TaskService.deleteTask', 'Deleting task', { taskId });
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (error) {
      logger.error('TaskService.deleteTask', 'Failed to delete task', { error });
      throw error;
    }
  }
}

export const taskService = new TaskService(); 