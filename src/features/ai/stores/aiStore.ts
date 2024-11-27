import { create } from 'zustand';
import { AIResponse } from '../types';

interface TaskConversation {
  taskId: string;
  parentTaskTitle: string;
  responses: (AIResponse & { taskTitle?: string })[];
}

interface AIState {
  response: AIResponse | null;
  taskConversations: Map<string, TaskConversation>;
  setAIResponse: (
    response: AIResponse, 
    taskId: string, 
    parentTaskTitle: string,
    taskTitle?: string
  ) => void;
  clearAIResponse: () => void;
  getTaskResponses: (taskId: string) => TaskConversation | null;
}

export const useAIStore = create<AIState>((set, get) => ({
  response: null,
  taskConversations: new Map(),
  
  setAIResponse: (response, taskId, parentTaskTitle, taskTitle) => {
    set(state => {
      const conversations = new Map(state.taskConversations);
      const existing = conversations.get(taskId) || {
        taskId,
        parentTaskTitle,
        responses: []
      };
      
      existing.responses.push({ ...response, taskTitle });
      conversations.set(taskId, existing);
      
      return {
        response,
        taskConversations: conversations
      };
    });
  },
  
  clearAIResponse: () => set({ response: null }),
  
  getTaskResponses: (taskId) => {
    return get().taskConversations.get(taskId) || null;
  }
})); 