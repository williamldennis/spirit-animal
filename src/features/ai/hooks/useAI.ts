import { useState } from 'react';
import { useTaskStore } from '../../tasks/stores/taskStore';
import { useChatStore } from '../../chat/stores/chatStore';
import { AIService } from '../services/aiService';
import { AIResponse } from '../types';

const aiService = new AIService();

export const useAI = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const { tasks, createTask } = useTaskStore();
  const { messages, sendMessage } = useChatStore();

  const processUserInput = async (input: string): Promise<AIResponse> => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await aiService.processUserInput(input, {
        tasks,
        recentMessages: messages,
        userId: 'current-user-id' // Get from auth context
      });

      if (response.action) {
        switch (response.action.type) {
          case 'create_task':
            await createTask(response.action.parameters);
            break;
          case 'send_message':
            await sendMessage(
              response.action.parameters.chatId,
              response.action.parameters.content
            );
            break;
        }
      }

      return response;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processUserInput,
    isProcessing,
    error
  };
}; 