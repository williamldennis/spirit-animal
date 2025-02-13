import { OpenAI } from 'openai';
import { Task } from '../../tasks/types';
import { Message } from '../../chat/types';
import { AIResponse, AIAction } from '../types';
import { ENV } from '../../../config/env';
import { Contact } from '../../../types/contact';
import { chatService } from '../../chat/services/chatService';
import { userService } from '../../auth/services/userService';
import { calendarService } from '../../calendar/services/calendarService';
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
import { useAuthStore } from '../../auth/stores/authStore';
import { useAIStore } from '../../ai/stores/aiStore';
import { webBrowsingService } from './webBrowsingService';
import { flightSearchService, FlightSearchParams } from './flightSearchService';

interface MessageContext {
  role: 'user' | 'assistant';
  content: string;
}

export class AIService {
  private openai: OpenAI;
  private messageContainsTomorrow: boolean = false;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: ENV.OPENAI_API_KEY,
    });
  }

  async processMessage(
    message: string, 
    context: MessageContext[] = []
  ): Promise<AIResponse> {
    try {
      logger.debug('AIService', 'Processing message', { 
        input: message, 
        contextLength: context.length 
      });

      const response = await this.makeAPIRequest([
        ...context,
        { role: 'user', content: message }
      ]);

      return response;
    } catch (error) {
      logger.error('AIService', 'Failed to process message', { error });
      throw error;
    }
  }

  private async makeAPIRequest(messages: MessageContext[]): Promise<AIResponse> {
    try {
      const tomorrow = startOfTomorrow();
      const systemPrompt = `You are a helpful AI assistant that creates calendar events and tasks. 

Current date: ${format(new Date(), 'yyyy-MM-dd')}
Tomorrow's date: ${format(tomorrow, 'yyyy-MM-dd')}

Guidelines for creating tasks vs events:
- Use create_task for:
  • To-do items without specific times (e.g., "take a shower", "buy groceries")
  • Personal reminders
  • Simple activities that don't need scheduling
  • Flexible tasks that can be done anytime
  
- Use create_event for:
  • Scheduled meetings or appointments
  • Activities with specific start and end times
  • Calendar-based activities
  • Activities involving other people/attendees
  • Time-sensitive commitments

Be concise and direct.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          ...messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        ],
        functions: [
          {
            name: "create_task",
            description: "Create a task or to-do item that doesn't require specific timing",
            parameters: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "Title of the task"
                },
                description: {
                  type: "string",
                  description: "Description of the task (optional)"
                },
                dueDate: {
                  type: "string",
                  format: "date-time",
                  description: "Due date for the task (optional)"
                },
                priority: {
                  type: "string",
                  enum: ["low", "medium", "high"],
                  description: "Priority level of the task"
                }
              },
              required: ["title"]
            }
          },
          {
            name: "create_event",
            description: "Create a calendar event with specific start and end times",
            parameters: {
              type: "object",
              properties: {
                summary: {
                  type: "string",
                  description: "Title of the event"
                },
                description: {
                  type: "string",
                  description: "Description of the event (optional)"
                },
                start: {
                  type: "object",
                  properties: {
                    dateTime: {
                      type: "string",
                      format: "date-time",
                      description: "Start time of the event (ISO 8601)"
                    }
                  },
                  required: ["dateTime"]
                },
                end: {
                  type: "object",
                  properties: {
                    dateTime: {
                      type: "string",
                      format: "date-time",
                      description: "End time of the event (ISO 8601)"
                    }
                  },
                  required: ["dateTime"]
                }
              },
              required: ["summary", "start", "end"]
            }
          },
          {
            name: "web_search",
            description: "Search the internet for information",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search query"
                },
                numResults: {
                  type: "number",
                  description: "Number of results to return (max 10)",
                  default: 5
                }
              },
              required: ["query"]
            }
          },
          {
            name: "browse_webpage",
            description: "Fetch and read content from a specific webpage",
            parameters: {
              type: "object",
              properties: {
                url: {
                  type: "string",
                  description: "URL of the webpage to browse"
                }
              },
              required: ["url"]
            }
          },
          {
            name: "search_flights",
            description: "Search for available flights",
            parameters: {
              type: "object",
              properties: {
                from: {
                  type: "string",
                  description: "Departure city or airport code"
                },
                to: {
                  type: "string",
                  description: "Destination city or airport code"
                },
                departureDate: {
                  type: "string",
                  format: "date",
                  description: "Departure date (YYYY-MM-DD)"
                },
                returnDate: {
                  type: "string",
                  format: "date",
                  description: "Return date for round trips (YYYY-MM-DD)"
                },
                passengers: {
                  type: "number",
                  description: "Number of passengers",
                  default: 1
                },
                cabinClass: {
                  type: "string",
                  enum: ["economy", "premium_economy", "business", "first"],
                  description: "Preferred cabin class"
                }
              },
              required: ["from", "to", "departureDate"]
            }
          }
        ],
        function_call: "auto"
      });

      const aiMessage = response.choices[0]?.message;

      if (!aiMessage) {
        throw new Error('No response from AI');
      }

      logger.debug('AIService.makeAPIRequest', 'Received AI response', {
        content: aiMessage.content,
        functionCall: aiMessage.function_call
      });

      if (aiMessage.function_call) {
        const functionCall = aiMessage.function_call;
        const parameters = JSON.parse(functionCall.arguments);
        const userId = useAuthStore.getState().user?.uid;

        if (!userId) {
          throw new Error('User not authenticated');
        }

        // Handle different function calls
        if (functionCall.name === 'create_task') {
          await this.handleTaskCreation(userId, parameters);
          const action: AIAction = {
            type: 'create_task',
            parameters
          };
          return {
            text: aiMessage.content || 'Creating your task...',
            confirmation: this.getActionConfirmation(action),
            action
          };
        } else if (functionCall.name === 'create_event') {
          await this.handleEventCreation(userId, parameters);
          const action: AIAction = {
            type: 'create_event',
            parameters
          };
          return {
            text: aiMessage.content || 'Creating your event...',
            confirmation: this.getActionConfirmation(action),
            action
          };
        } else if (functionCall.name === 'web_search') {
          const searchResults = await webBrowsingService.search(
            parameters.query
          );
          
          // Send search results back to AI for processing
          const searchResponse = await this.openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              ...messages,
              {
                role: "function",
                name: "web_search",
                content: JSON.stringify(searchResults)
              }
            ]
          });

          return {
            text: searchResponse.choices[0]?.message?.content || 'No results found',
            action: {
              type: 'web_search',
              parameters: {
                query: parameters.query,
                results: searchResults
              }
            }
          };
        } else if (functionCall.name === 'browse_webpage') {
          const pageContent = await webBrowsingService.fetchWebPage(
            parameters.url
          );

          // Send page content back to AI for processing
          const browseResponse = await this.openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              ...messages,
              {
                role: "function",
                name: "browse_webpage",
                content: pageContent
              }
            ]
          });

          return {
            text: browseResponse.choices[0]?.message?.content || 'Failed to process webpage',
            action: {
              type: 'browse_webpage',
              parameters: {
                url: parameters.url,
                content: pageContent.substring(0, 200) + '...' // Preview only
              }
            }
          };
        } else if (functionCall.name === 'search_flights') {
          const flightOptions = await flightSearchService.searchFlights(parameters);
          const recommendedFlights = flightSearchService.getRecommendedFlights(flightOptions);

          const flightResults = recommendedFlights.map(flight => `
✈️ ${flight.airline} ${flight.flightNumber || ''}
💺 ${parameters.cabinClass || 'economy'} class
🛫 Depart: ${flight.departureTime} ${flight.terminal ? `(${flight.terminal})` : ''}
🛬 Arrive: ${flight.arrivalTime}
⏱️ Duration: ${flight.duration}
✈️ Aircraft: ${flight.aircraft || 'Various'}
${flight.stops === 0 ? '✅ Nonstop' : `🛑 ${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}

💰 Price Breakdown:
  Base Fare: $${flight.priceBreakdown?.base || flight.price}
  Taxes & Fees: $${flight.priceBreakdown?.taxes || 'Varies'}
  Total: ${flight.price}

🔗 Book here: ${flight.link}
  `).join('\n\n───────────────\n\n');

          return {
            text: `Here are the best flight options I found for ${parameters.from} to ${parameters.to} on ${parameters.departureDate}:\n\n${flightResults}`,
            action: {
              type: 'search_flights',
              parameters: {
                ...parameters,
                results: recommendedFlights
              }
            },
            confirmation: `I've found ${recommendedFlights.length} flight options for your trip, sorted by stops and price.`
          };
        }
      }

      return {
        text: aiMessage.content || 'I apologize, I could not process that request.'
      };

    } catch (error) {
      logger.error('AIService.makeAPIRequest', 'API request failed', { error });
      throw error;
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
      case 'create_event': {
        const startDate = new Date(action.parameters.start.dateTime);
        const endDate = new Date(action.parameters.end.dateTime);
        return `I've created the event:
Title: ${action.parameters.summary}
Date: ${format(startDate, 'EEEE, MMMM d, yyyy')}
Time: ${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}
${action.parameters.description ? `Description: ${action.parameters.description}` : ''}`;
      }
      case 'create_task': {
        let confirmation = `I've created the task:
Title: ${action.parameters.title}`;
        if (action.parameters.description) {
          confirmation += `\nDescription: ${action.parameters.description}`;
        }
        if (action.parameters.dueDate) {
          confirmation += `\nDue: ${format(new Date(action.parameters.dueDate), 'PPP')}`;
        }
        if (action.parameters.priority) {
          confirmation += `\nPriority: ${action.parameters.priority}`;
        }
        return confirmation;
      }
      case 'send_message':
        return `I've sent your message: "${action.parameters.content}"`;
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
        
        // Create action object
        const action: AIAction = {
          type: functionCall.name as 'create_task' | 'send_message' | 'create_event',
          parameters: this.formatActionParameters(functionCall.name, parameters)
        };

        logger.debug('AIService.parseAIResponse', 'Parsed action', {
          type: action.type,
          parameters: action.parameters
        });

        // Execute the action immediately
        if (action.type === 'create_event') {
          // Get the user ID from the auth store
          const userId = useAuthStore.getState().user?.uid;
          if (userId) {
            this.handleEventCreation(userId, action.parameters)
              .catch(error => {
                logger.error('AIService.parseAIResponse', 'Failed to create event', { error });
              });
          }
        }

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
      // Create task data without dueDate first
      const taskData: any = {
        title: parameters.title,
        description: parameters.description || '',
        priority: parameters.priority || 'medium',
        completed: false,
        createdAt: Timestamp.now() // Add createdAt timestamp
      };

      // Only add dueDate if it exists
      if (parameters.dueDate) {
        taskData.dueDate = Timestamp.fromDate(new Date(parameters.dueDate));
      } else if (this.messageContainsTomorrow) {
        taskData.dueDate = Timestamp.fromDate(startOfTomorrow());
      }
      // If no dueDate is specified, we don't include the field at all

      logger.debug('AIService.handleTaskCreation', 'Creating task with data', {
        taskData
      });

      await taskService.createTask(userId, taskData);
      
      logger.debug('AIService.handleTaskCreation', 'Task created successfully', {
        taskData
      });
    } catch (error) {
      logger.error('AIService.handleTaskCreation', 'Failed to create task', { error });
      throw new Error('Failed to create task');
    }
  }

  private async handleEventCreation(userId: string, parameters: any): Promise<AIResponse> {
    try {
      logger.debug('AIService.handleEventCreation', 'Creating event with parameters', { parameters });
      
      const { summary, start, end, description, attendees } = parameters;
      
      // Adjust the dates to proper timezone
      const adjustedStart = new Date(start.dateTime);
      const adjustedEnd = new Date(end.dateTime);
      
      logger.debug('AIService.handleEventCreation', 'Adjusted event data', {
        adjustedStart,
        adjustedEnd,
        originalStart: start.dateTime,
        originalEnd: end.dateTime
      });

      const event = await calendarService.createEvent(userId, {
        title: summary,
        start: adjustedStart,
        end: adjustedEnd,
        description,
        attendees
      });

      return {
        text: `I've created an event "${summary}" for ${adjustedStart.toLocaleString()} to ${adjustedEnd.toLocaleString()}.`,
        event
      };
    } catch (error) {
      logger.error('AIService.handleEventCreation', 'Failed to create event', { error });
      throw new Error('Failed to create event');
    }
  }

  private async breakdownTask(task: Task): Promise<AIResponse> {
    try {
      const systemPrompt = `You are a helpful AI assistant that breaks down tasks into logical subtasks.
      
Guidelines for breaking down tasks:
- Create 3-5 sequential steps
- Each step should be clear and actionable
- Consider prerequisites and dependencies
- Focus on practical, achievable steps
- Keep steps concise but descriptive
- Ensure all criteria are addressed in the subtasks

Current task to breakdown: "${task.title}"
${task.criteria ? `Required Criteria:\n${task.criteria}` : ''}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Please break down this task into subtasks: ${task.title}`
          }
        ],
        functions: [
          {
            name: "create_subtasks",
            description: "Create subtasks for the main task",
            parameters: {
              type: "object",
              properties: {
                subtasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: {
                        type: "string",
                        description: "Title of the subtask"
                      },
                      description: {
                        type: "string",
                        description: "Optional description of the subtask"
                      }
                    },
                    required: ["title"]
                  }
                }
              },
              required: ["subtasks"]
            }
          }
        ],
        function_call: { name: "create_subtasks" }
      });

      const aiMessage = response.choices[0]?.message;

      if (!aiMessage?.function_call) {
        throw new Error('No response from AI');
      }

      const parameters = JSON.parse(aiMessage.function_call.arguments);
      
      // Create subtasks
      const userId = useAuthStore.getState().user?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Create all subtasks with parentTaskId
      for (const subtask of parameters.subtasks) {
        await taskService.createTask(userId, {
          title: subtask.title,
          description: subtask.description,
          parentTaskId: task.id, // Ensure this is set
          dueDate: task.dueDate,
          priority: task.priority
        });
      }

      return {
        text: aiMessage.content || 'Breaking down your task...',
        action: {
          type: 'create_subtasks',
          parameters
        },
        confirmation: `I've broken down "${task.title}" into ${parameters.subtasks.length} subtasks.`
      };

    } catch (error) {
      logger.error('AIService.breakdownTask', 'Failed to break down task', { error });
      throw error;
    }
  }

  public async expandTaskIntoSubtasks(task: Task): Promise<AIResponse> {
    return this.breakdownTask(task);
  }

  public async attemptAutoComplete(task: Task): Promise<AIResponse> {
    try {
      const userId = useAuthStore.getState().user?.uid;
      if (!userId) throw new Error('User not authenticated');

      let contextualTasks: Task[] = [];
      let parentTask: Task | null = null;
      let completedSubtaskResults: string = '';
      
      if (task.parentTaskId) {
        // Get all related tasks
        const tasks = await this.getTasks(userId);
        parentTask = tasks.find(t => t.id === task.parentTaskId) || null;
        
        // Get sibling tasks and their results
        const siblingTasks = tasks.filter(t => t.parentTaskId === task.parentTaskId);
        contextualTasks = siblingTasks;

        // Get completed subtask results from AIStore
        const completedResults = siblingTasks
          .filter(t => t.completed)
          .map(t => {
            const conversation = useAIStore.getState().getTaskResponses(t.id);
            if (conversation && conversation.responses.length > 0) {
              const lastResponse = conversation.responses[conversation.responses.length - 1];
              return {
                task: t.title,
                output: lastResponse.text,
                content: lastResponse.generatedContent
              };
            }
            return null;
          })
          .filter(result => result !== null);

        if (completedResults.length > 0) {
          completedSubtaskResults = `
Completed Subtask Results:
${completedResults.map(result => `
Task: ${result?.task}
Output: ${result?.output}
${result?.content ? `Generated Content: ${JSON.stringify(result.content, null, 2)}` : ''}`
          ).join('\n')}`;
        }
      }

      const systemPrompt = `You are an advanced AI executive assistant with comprehensive capabilities. You have access to the following context:

${parentTask ? `Parent Task: "${parentTask.title}"
${parentTask.criteria ? `Required Criteria:\n${parentTask.criteria}` : ''}` : ''}

${contextualTasks.length > 0 ? `Related Subtasks:
${contextualTasks.map(t => `- ${t.title}${t.completed ? ' (Completed)' : ''}
  ${t.criteria ? `  Criteria: ${t.criteria}` : ''}`).join('\n')}` : ''}

${completedSubtaskResults}

Guidelines for Task Completion:
1. Always provide a best-effort initial solution
2. Make reasonable assumptions when information is missing
3. Clearly state any assumptions made
4. Suggest areas that might need refinement
5. Be ready to modify the solution based on user feedback
6. Ensure all specified criteria are met

Current Task: "${task.title}"
${task.criteria ? `Required Criteria:\n${task.criteria}` : ''}

When completing this task:
1. Review and address each criterion specifically
2. Highlight how each requirement is being met
3. Flag any criteria that need clarification
4. Suggest additional criteria that might be helpful`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Please complete this task: ${task.title}`
          }
        ],
        functions: [
          {
            name: "complete_task",
            description: "Complete the task if possible",
            parameters: {
              type: "object",
              properties: {
                canComplete: {
                  type: "boolean",
                  description: "Whether the AI can complete this task"
                },
                output: {
                  type: "string",
                  description: "The result or output of completing the task"
                },
                reason: {
                  type: "string",
                  description: "Explanation of why the task can or cannot be completed"
                },
                generatedContent: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: [
                        "menu",
                        "shopping_list",
                        "schedule",
                        "guest_list",
                        "invitation",
                        "checklist",
                        "budget",
                        "itinerary",
                        "email",
                        "workout_plan",
                        "meal_plan",
                        "project_plan",
                        "comparison",
                        "research",
                        "other"
                      ],
                      description: "Type of content generated"
                    },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          category: { type: "string" },
                          items: {
                            type: "array",
                            items: { type: "string" }
                          },
                          notes: { type: "string" },
                          timing: { type: "string" },
                          cost: { type: "number" },
                          priority: { type: "string" },
                          status: { type: "string" }
                        }
                      },
                      description: "Structured content items"
                    },
                    summary: { type: "string" },
                    nextSteps: {
                      type: "array",
                      items: { type: "string" },
                      description: "Suggested next actions"
                    },
                    alternatives: {
                      type: "array",
                      items: { type: "string" },
                      description: "Alternative options or approaches"
                    }
                  }
                }
              },
              required: ["canComplete", "reason"]
            }
          }
        ],
        function_call: { name: "complete_task" }
      });

      const aiMessage = response.choices[0]?.message;

      if (!aiMessage?.function_call) {
        throw new Error('No response from AI');
      }

      const parameters = JSON.parse(aiMessage.function_call.arguments);
      
      if (parameters.canComplete) {
        // Format the output based on the content type
        let formattedOutput = parameters.output || '';
        
        if (parameters.generatedContent) {
          const content = parameters.generatedContent;
          switch (content.type) {
            case 'menu':
              formattedOutput = `📋 Suggested Menu:\n\n${content.items?.map(category => 
                `${category.category}:\n${category.items?.map(item => `• ${item}`).join('\n') || 'No items'}`
              ).join('\n\n') || 'No menu items available'}

🤔 Assumptions Made:
- Standard portion sizes
- No specific dietary restrictions
- Traditional preferences

✏️ Areas to Refine:
- Adjust portions based on guest count
- Add dietary restrictions/preferences
- Modify based on kitchen equipment
- Consider budget constraints

💬 Chat with me to refine this menu!`;
              break;
            case 'shopping_list':
              formattedOutput = `🛒 Shopping List:\n\n${content.items?.map(category =>
                `${category.category}:\n${category.items?.map(item => `• ${item}`).join('\n') || 'No items'}`
              ).join('\n\n') || 'No shopping items available'}

🤔 Assumptions Made:
- Standard portion sizes
- No specific dietary restrictions
- Traditional preferences

✏️ Areas to Refine:
- Adjust portions based on guest count
- Add dietary restrictions/preferences
- Modify based on kitchen equipment
- Consider budget constraints

💬 Chat with me to refine this shopping list!`;
              break;
            case 'schedule':
              formattedOutput = `⏰ Schedule:\n\n${content.items?.map(timeSlot =>
                `${timeSlot.category}:\n${timeSlot.items?.map(item => `• ${item}`).join('\n') || 'No items'}`
              ).join('\n\n') || 'No schedule items available'}

🤔 Assumptions Made:
- Standard time slots
- No specific timing preferences
- Traditional preferences

✏️ Areas to Refine:
- Adjust time slots based on guest count
- Add specific timing preferences
- Modify based on venue availability
- Consider budget constraints

💬 Chat with me to refine this schedule!`;
              break;
            default:
              // For any other content type, use the raw output
              formattedOutput = parameters.output || 'Task completed successfully';
              break;
          }
        }

        return {
          text: formattedOutput,
          completed: true,
          confirmation: `I've completed "${task.title}" with an initial proposal.\n\nLet's refine it together to make it perfect for your needs!`,
          generatedContent: parameters.generatedContent
        };
      } else {
        return {
          text: "I haven't learned to complete this task yet.",
          completed: false,
          confirmation: parameters.reason
        };
      }

    } catch (error) {
      logger.error('AIService.attemptAutoComplete', 'Failed to auto-complete task', { error });
      throw error;
    }
  }

  private async getTasks(userId: string): Promise<Task[]> {
    try {
      return await taskService.getTasks(userId);
    } catch (error) {
      logger.error('AIService.getTasks', 'Failed to fetch tasks', { error });
      throw error;
    }
  }
}

// Create and export a single instance
export const aiService = new AIService(); 