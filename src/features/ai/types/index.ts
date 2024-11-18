export interface AIAction {
  type: 'create_task' | 'send_message';
  parameters: any;
}

export interface AIResponse {
  text: string;
  action?: AIAction;
}

export interface AIState {
  isProcessing: boolean;
  error: Error | null;
  lastResponse?: AIResponse;
} 