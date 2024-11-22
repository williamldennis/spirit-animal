import { OpenAI } from 'openai';
import { Task } from '../../tasks/types';
import { Message } from '../../chat/types';
import { AIResponse, AIAction } from '../types';
import { ENV } from '../../../config/env';
import { Contact } from '../../../types/contact';
import { chatService } from '../../chat/services/chatService';
import { userService } from '../../auth/services/userService';
import { CalendarEventResponse } from '../../calendar/services/calendarService';
import { 
  isSameDay, 
  isAfter, 
  format, 
  addDays, 
  startOfTomorrow, 
  endOfTomorrow, 
  parse, 
  isValid 
} from 'date-fns';
import { logger } from '../../../utils/logger';
import { taskService } from '../../tasks/services/taskService';
import { Timestamp } from 'firebase/firestore';

export class AIService {
  private openai: OpenAI;
  private messageContainsTomorrow: boolean = false;
  
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
      events?: CalendarEventResponse[];
      conversationHistory?: Message[];
    }
  ): Promise<AIResponse> {
    try {
      if (!ENV.OPENAI_API_KEY) {
        throw new Error('OpenAI API key is not configured');
      }

      const systemPrompt = this.getSystemPrompt({
        tasksContext: this.formatTasksContext(context.tasks || []),
        messagesContext: this.formatAllMessagesContext(context.allChats || {}, context.currentChatId),
        contactsContext: this.formatContactsContext(context.contacts || [], context.currentContact),
        eventsContext: this.formatEventsContext(context.events || [])
      });

      // Convert conversation history to OpenAI message format
      const conversationMessages = (context.conversationHistory || []).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          // Include all previous messages in the conversation
          ...conversationMessages,
          // Add the current user message
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
                title: { 
                  type: "string",
                  description: "The title of the task"
                },
                description: { 
                  type: "string",
                  description: "Optional description of the task"
                },
                dueDate: { 
                  type: "string", 
                  format: "date-time",
                  description: "When the task is due (ISO string)"
                },
                priority: { 
                  type: "string", 
                  enum: ["low", "medium", "high"],
                  description: "Task priority level"
                }
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
          },
          {
            name: "create_event",
            description: "Create a new calendar event",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string" },
                description: { type: "string" },
                start: { 
                  type: "object",
                  properties: {
                    dateTime: { type: "string", format: "date-time" },
                    timeZone: { type: "string" }
                  },
                  required: ["dateTime", "timeZone"]
                },
                end: {
                  type: "object",
                  properties: {
                    dateTime: { type: "string", format: "date-time" },
                    timeZone: { type: "string" }
                  },
                  required: ["dateTime", "timeZone"]
                }
              },
              required: ["summary", "start", "end"]
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

      // Handle task creation
      if (parsedResponse.action?.type === 'create_task' && context.userId) {
        await this.handleTaskCreation(context.userId, parsedResponse.action.parameters);
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
    if (!tasks || tasks.length === 0) {
      return "No tasks available.";
    }

    logger.debug('AIService.formatTasksContext', 'Formatting tasks', { 
      taskCount: tasks.length,
      taskSample: tasks.slice(0, 3).map(t => t.title)
    });

    const incompleteTasks = tasks.filter(task => !task.completed);
    const completedTasks = tasks.filter(task => task.completed);

    let context = `You have ${tasks.length} total tasks (${incompleteTasks.length} incomplete, ${completedTasks.length} completed).\n\n`;
    context += 'Incomplete Tasks:\n';

    if (incompleteTasks.length === 0) {
      context += 'No incomplete tasks.\n';
    } else {
      context += incompleteTasks.map(task => {
        let taskStr = `- ${task.title}\n`;
        
        if (task.description) {
          taskStr += `  Description: ${task.description}\n`;
        }
        
        if (task.dueDate) {
          try {
            // Handle Firestore Timestamp
            const date = task.dueDate.toDate();
            taskStr += `  Due: ${format(date, 'PPP')}\n`;
          } catch (error) {
            logger.error('AIService.formatTasksContext', 'Failed to format due date', {
              taskId: task.id,
              dueDate: task.dueDate,
              error
            });
          }
        } else {
          taskStr += '  No due date\n';
        }
        
        taskStr += `  Priority: ${task.priority || 'none'}\n`;
        taskStr += '  Status: Not completed\n';
        
        return taskStr;
      }).join('\n');
    }

    if (completedTasks.length > 0) {
      context += '\nRecently Completed Tasks:\n';
      context += completedTasks.slice(0, 5).map(task => {
        let taskStr = `- ${task.title}\n`;
        if (task.description) {
          taskStr += `  Description: ${task.description}\n`;
        }
        taskStr += '  Completed\n';
        return taskStr;
      }).join('\n');
    }

    return context;
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

  private formatEventsContext(events: CalendarEventResponse[]): string {
    if (events.length === 0) return "No upcoming events.";

    const today = new Date();
    const todayEvents = events.filter(event => 
      isSameDay(new Date(event.start.dateTime), today)
    );
    
    const upcomingEvents = events.filter(event => 
      isAfter(new Date(event.start.dateTime), today)
    ).slice(0, 5);

    return `
Today's Events:
${todayEvents.map(event => `
- ${format(new Date(event.start.dateTime), 'h:mm a')}: ${event.summary}
`).join('')}

Upcoming Events:
${upcomingEvents.map(event => `
- ${format(new Date(event.start.dateTime), 'EEE, MMM d h:mm a')}: ${event.summary}
`).join('')}
    `;
  }

  private getSystemPrompt(context: { 
    tasksContext: string; 
    messagesContext: string;
    contactsContext: string;
    eventsContext: string;
    currentContact?: { name: string; email: string; };
  }): string {
    const now = new Date();
    const prompt = `You are an AI assistant in a productivity app. Here is your current context:

Current date and time: ${format(now, 'PPpp')}

Tasks:
${context.tasksContext}

Calendar:
${context.eventsContext}

Messages:
${context.messagesContext}

Contacts:
${context.contactsContext}

You can:
1. Answer questions about tasks, messages, and calendar events
2. Create new tasks using create_task
3. Send messages using send_message
4. Create calendar events using create_event

When creating calendar events:
- Use the create_event function
- Always use absolute dates and times
- When user mentions "tomorrow", use the next day from current date
- When user mentions "next week", add 7 days to current date
- Include timezone information
- Ensure start time is before end time
- Default to 1 hour duration if not specified

Keep responses concise and action-oriented.
Maintain conversation context and refer to previous messages when appropriate.
If a user asks about "that" or "it", look at previous messages for context.`;

    return prompt;
  }

  private getActionConfirmation(action: AIAction): string {
    switch (action.type) {
      case 'send_message':
        return `I've sent your message: "${action.parameters.content}"`;
      case 'create_task':
        return `I've created a task: "${action.parameters.title}"${
          action.parameters.dueDate ? ` due on ${new Date(action.parameters.dueDate).toLocaleDateString()}` : ''
        }`;
      case 'create_event':
        return `I've created an event: "${action.parameters.summary}" on ${
          format(new Date(action.parameters.start.dateTime), 'PPp')
        }`;
      default:
        return 'Action completed successfully.';
    }
  }

  private parseAIResponse(response: any): AIResponse {
    const message = response.choices[0].message;
    const functionCall = message.function_call;

    if (functionCall) {
      try {
        const parameters = JSON.parse(functionCall.arguments);
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        // Set the flag based on message content
        this.messageContainsTomorrow = message.content?.toLowerCase().includes('tomorrow') || false;

        // Add timezone to event parameters if it's a create_event action
        if (functionCall.name === 'create_event') {
          // Handle relative dates for events
          const now = new Date();
          let startDateTime = new Date(parameters.start.dateTime);
          let endDateTime = new Date(parameters.end.dateTime);

          // If the date is in the past, assume it means next occurrence
          if (startDateTime < now) {
            // If it's for "tomorrow" but date is wrong
            if (message.content.toLowerCase().includes('tomorrow')) {
              const tomorrow = startOfTomorrow();
              startDateTime = new Date(
                tomorrow.getFullYear(),
                tomorrow.getMonth(),
                tomorrow.getDate(),
                startDateTime.getHours(),
                startDateTime.getMinutes()
              );
              
              // Adjust end time to maintain duration
              const duration = endDateTime.getTime() - new Date(parameters.start.dateTime).getTime();
              endDateTime = new Date(startDateTime.getTime() + duration);
            }
          }

          parameters.start = {
            dateTime: startDateTime.toISOString(),
            timeZone: timezone
          };
          parameters.end = {
            dateTime: endDateTime.toISOString(),
            timeZone: timezone
          };

          logger.debug('AIService.parseAIResponse', 'Adjusted event dates', {
            originalStart: parameters.start.dateTime,
            originalEnd: parameters.end.dateTime,
            adjustedStart: startDateTime.toISOString(),
            adjustedEnd: endDateTime.toISOString(),
            messageContent: message.content
          });
        }

        // Add special handling for create_task
        if (functionCall.name === 'create_task') {
          logger.debug('AIService.parseAIResponse', 'Creating task with parameters', {
            parameters,
            messageContent: message.content,
            containsTomorrow: this.messageContainsTomorrow
          });
        }

        const action: AIAction = {
          type: functionCall.name as 'create_task' | 'send_message' | 'create_event',
          parameters: this.formatActionParameters(functionCall.name, parameters)
        };

        logger.debug('AIService.parseAIResponse', 'Parsed action', {
          type: action.type,
          parameters: action.parameters
        });

        // Reset the flag after use
        this.messageContainsTomorrow = false;

        return {
          text: message.content || '',
          action,
          confirmation: this.getActionConfirmation(action)
        };
      } catch (error) {
        logger.error('AIService.parseAIResponse', 'Failed to parse response', {
          error,
          functionCall,
          messageContent: message.content
        });
        throw error;
      }
    }

    return {
      text: message.content || ''
    };
  }

  private formatActionParameters(actionType: string, parameters: any) {
    switch (actionType) {
      case 'create_task':
        // Convert the date string to a Firestore Timestamp
        let dueDate = undefined;
        
        if (parameters.dueDate) {
          dueDate = new Date(parameters.dueDate);
        } else if (this.messageContainsTomorrow) { // Add this property to track "tomorrow" mentions
          dueDate = startOfTomorrow();
        }

        return {
          title: parameters.title,
          description: parameters.description || '',
          dueDate: dueDate,
          priority: parameters.priority || 'medium',
        };
      case 'create_event':
        return {
          summary: parameters.summary,
          description: parameters.description,
          start: parameters.start,
          end: parameters.end,
        };
      default:
        return parameters;
    }
  }

  private async handleTaskCreation(userId: string, parameters: any): Promise<void> {
    try {
      // Convert date to Firestore Timestamp if it exists
      const dueDate = parameters.dueDate ? 
        Timestamp.fromDate(new Date(parameters.dueDate)) : 
        this.messageContainsTomorrow ? 
          Timestamp.fromDate(startOfTomorrow()) : 
          undefined;

      const taskData = {
        title: parameters.title,
        description: parameters.description || '',
        dueDate,
        priority: parameters.priority || 'medium',
      };

      await taskService.createTask(userId, taskData);
      logger.debug('AIService.handleTaskCreation', 'Task created successfully', {
        taskData
      });
    } catch (error) {
      logger.error('AIService.handleTaskCreation', 'Failed to create task', { error });
      throw new Error('Failed to create task');
    }
  }
} 