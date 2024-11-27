import { create } from 'zustand';
import { AIResponse } from '../types';

interface AIState {
  response: AIResponse | null;
  setAIResponse: (response: AIResponse) => void;
  clearAIResponse: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  response: null,
  setAIResponse: (response) => set({ response }),
  clearAIResponse: () => set({ response: null }),
})); 