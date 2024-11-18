import { OpenAI } from 'openai';
import { Task } from '../../tasks/types';
import { Message } from '../../chat/types';
import { AIResponse, AIAction } from '../types';
import { ENV } from '../../../config/env';

export class AIService {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: ENV.OPENAI_API_KEY,
    });
  }

  async processUserInput(
    input: string,
    context: {
      recentMessages?: Message[];
      tasks?: Task[];
      userId: string;
    }
  ): Promise<AIResponse> {
    try {
      if (!ENV.OPENAI_API_KEY) {
        throw new Error('OpenAI API key is not configured');
      }

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt(context)
          },
          {
            role: "user",
            content: input
          }
        ],
        functions: [
          {
            name: "create_task",
            description: "Create a new task",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                dueDate: { type: "string", format: "date-time" },
                priority: { type: "string", enum: ["low", "medium", "high"] }
              },
              required: ["title"]
            }
          },
          {
            name: "send_message",
            description: "Send a message in a chat",
            parameters: {
              type: "object",
              properties: {
                content: { type: "string" },
                chatId: { type: "string" }
              },
              required: ["content", "chatId"]
            }
          }
        ]
      });

      return this.parseAIResponse(response);
    } catch (error: any) {
      console.error('AI Processing Error:', {
        message: error.message,
        status: error.status,
        code: error.code,
        type: error.type,
        hasApiKey: !!ENV.OPENAI_API_KEY
      });

      if (error.code === 'mismatched_organization') {
        throw new Error(
          "API key configuration error. Please check your OpenAI project settings."
        );
      }
      if (error.status === 429) {
        throw new Error(
          "AI service quota exceeded. Please try again later."
        );
      }
      if (error.status === 401) {
        throw new Error(
          "Invalid API key. Please check your configuration."
        );
      }
      throw new Error(
        error.message || "Something went wrong with the AI service. Please try again."
      );
    }
  }

  private getSystemPrompt(context: any): string {
    return `You are an AI assistant in a productivity app. You have access to:
    ${context.tasks ? `- ${context.tasks.length} tasks` : ''}
    ${context.recentMessages ? `- Recent chat messages` : ''}

    You can:
    1. Answer questions about tasks and messages
    2. Create new tasks using create_task
    3. Send messages using send_message
    
    Keep responses concise and action-oriented.`;
  }

  private parseAIResponse(response: any): AIResponse {
    const message = response.choices[0].message;
    const functionCall = message.function_call;

    if (functionCall) {
      const action: AIAction = {
        type: functionCall.name as 'create_task' | 'send_message',
        parameters: JSON.parse(functionCall.arguments)
      };

      return {
        text: message.content,
        action
      };
    }

    return {
      text: message.content
    };
  }
} 