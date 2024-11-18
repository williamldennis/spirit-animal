import { OpenAI } from 'openai';
import { Task } from '../../tasks/types';
import { Message } from '../../chat/types';
import { AIResponse, AIAction } from '../types';
import { ENV } from '../../../config/env';
import { format } from 'date-fns';
import { Contact } from '../../../types/contact';
import { chatService } from '../../chat/services/chatService';
import { userService } from '../../auth/services/userService';

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
      allChats?: { [chatId: string]: Message[] };
      contacts?: Contact[];
      tasks?: Task[];
      userId: string;
      currentChatId?: string;
      currentContact?: { name: string; email: string; };
    }
  ): Promise<AIResponse> {
    try {
      if (!ENV.OPENAI_API_KEY) {
        throw new Error('OpenAI API key is not configured');
      }

      const tasksContext = this.formatTasksContext(context.tasks || []);
      const messagesContext = this.formatAllMessagesContext(context.allChats || {}, context.currentChatId);
      const contactsContext = this.formatContactsContext(context.contacts || [], context.currentContact);

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt({
              tasksContext,
              messagesContext,
              contactsContext,
              currentContact: context.currentContact
            })
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

      // If the response includes a send_message action, process it
      const parsedResponse = this.parseAIResponse(response);
      if (parsedResponse.action?.type === 'send_message') {
        // If we're in a chat context, use that chat ID
        if (context.currentChatId) {
          parsedResponse.action.parameters.chatId = context.currentChatId;
        }
        // Otherwise, try to find the chat from the email
        else {
          const emailMatch = input.match(/send.*message.*to\s+(\S+@\S+\.\S+)/i);
          if (emailMatch) {
            const email = emailMatch[1];
            const chatId = await this.chatService.findOrCreateChatWithEmail(
              context.userId,
              email
            );
            parsedResponse.action.parameters.chatId = chatId;
          }
        }
      }

      return parsedResponse;
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

  private formatTasksContext(tasks: Task[]): string {
    if (tasks.length === 0) return "No tasks available.";

    const incompleteTasks = tasks.filter(task => !task.completed);
    const completedTasks = tasks.filter(task => task.completed);

    return `
Current Tasks:
${incompleteTasks.map(task => `
- ${task.title}
  Priority: ${task.priority}
  ${task.dueDate ? `Due: ${format(task.dueDate, 'PPP')}` : 'No due date'}
  ${task.description ? `Description: ${task.description}` : ''}
`).join('')}

Recently Completed Tasks:
${completedTasks.slice(0, 5).map(task => `
- ${task.title} (Completed)
`).join('')}
    `;
  }

  private formatAllMessagesContext(chats: { [chatId: string]: Message[] }, currentChatId?: string): string {
    if (Object.keys(chats).length === 0) return "No messages available.";

    let context = '';
    
    // First show current chat if available
    if (currentChatId && chats[currentChatId]) {
      const currentMessages = chats[currentChatId].slice(-5).reverse();
      context += `
Current Chat Messages:
${currentMessages.map(msg => `
- ${format(msg.timestamp, 'PPp')}: ${msg.text}
`).join('')}
`;
    }

    // Then show other recent chats
    const otherChats = Object.entries(chats)
      .filter(([chatId]) => chatId !== currentChatId)
      .slice(0, 3);

    if (otherChats.length > 0) {
      context += `
Recent Chats:
${otherChats.map(([chatId, messages]) => {
        const recentMessages = messages.slice(-3).reverse();
        return `
Chat ${chatId}:
${recentMessages.map(msg => `
- ${format(msg.timestamp, 'PPp')}: ${msg.text}
`).join('')}`;
      }).join('\n')}`;
    }

    return context;
  }

  private formatContactsContext(contacts: Contact[], currentContact?: { name: string; email: string; }): string {
    if (contacts.length === 0 && !currentContact) return "No contacts available.";

    let context = '';
    
    if (currentContact) {
      context += `
Current Chat Contact:
- ${currentContact.name} (${currentContact.email})
`;
    }

    if (contacts.length > 0) {
      context += `
Available Contacts:
${contacts.map(contact => `
- ${contact.name}${contact.email ? ` (${contact.email})` : ''}
`).join('')}`;
    }

    return context;
  }

  private getSystemPrompt(context: { 
    tasksContext: string; 
    messagesContext: string;
    contactsContext: string;
    currentContact?: { name: string; email: string; };
  }): string {
    return `You are an AI assistant in a productivity app. Here is your current context:

${context.contactsContext}

${context.messagesContext}

${context.tasksContext}

You can:
1. Answer questions about tasks and messages
2. Create new tasks using create_task
3. Send messages using send_message

When sending messages:
${context.currentContact 
  ? `- You are currently chatting with ${context.currentContact.name} (${context.currentContact.email})`
  : '- First verify the recipient\'s email is in the available contacts'}
- Keep messages professional and concise
- Include relevant task or calendar information if applicable

If a contact is not found, inform the user that you need a valid contact email address.

Keep responses concise and action-oriented.`;
  }

  private getActionConfirmation(action: AIAction): string {
    switch (action.type) {
      case 'send_message':
        return `I've sent your message: "${action.parameters.content}"`;
      case 'create_task':
        return `I've created a task: "${action.parameters.title}"${
          action.parameters.dueDate ? ` due on ${new Date(action.parameters.dueDate).toLocaleDateString()}` : ''
        }`;
      default:
        return 'Action completed successfully.';
    }
  }

  private parseAIResponse(response: any): AIResponse {
    const message = response.choices[0].message;
    const functionCall = message.function_call;

    if (functionCall) {
      const parameters = JSON.parse(functionCall.arguments);
      const action: AIAction = {
        type: functionCall.name as 'create_task' | 'send_message',
        parameters: this.formatActionParameters(functionCall.name, parameters)
      };

      return {
        text: message.content,
        action,
        confirmation: this.getActionConfirmation(action)
      };
    }

    return {
      text: message.content
    };
  }

  private formatActionParameters(actionType: string, parameters: any) {
    switch (actionType) {
      case 'create_task':
        return {
          title: parameters.title,
          description: parameters.description || '',
          dueDate: parameters.dueDate ? new Date(parameters.dueDate) : undefined,
          priority: parameters.priority || 'medium',
        };
      default:
        return parameters;
    }
  }
} 