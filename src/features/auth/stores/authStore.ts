import { create } from 'zustand';
import { authService } from '../services/authService';
import type { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,
  setUser: (user) => set({ user }),
  signUp: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const user = await authService.signUp(email, password);
      set({ user, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const user = await authService.signIn(email, password);
      set({ user, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  signOut: async () => {
    set({ loading: true, error: null });
    try {
      await authService.signOut();
      set({ user: null, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
})); 