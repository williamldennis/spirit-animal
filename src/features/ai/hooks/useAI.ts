import { useState } from 'react';
import { aiService } from '../services/aiService';
import { logger } from '../../../utils/logger';

interface MessageContext {
  role: 'user' | 'assistant';
  content: string;
}

export const useAI = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const processUserInput = async (
    input: string, 
    context: MessageContext[] = []
  ) => {
    setIsProcessing(true);
    try {
      logger.info('useAI', 'Processing user input with context', { 
        input, 
        contextLength: context.length 
      });
      
      const response = await aiService.processMessage(input, context);
      return response;
    } catch (error) {
      logger.error('useAI', 'Error processing AI request', { error });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processUserInput,
    isProcessing
  };
}; 