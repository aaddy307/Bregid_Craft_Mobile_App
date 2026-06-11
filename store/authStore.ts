import { create } from 'zustand';

export interface User {
  _id: string;
  name: string;
  phone: string;
  email: string;
  role: 'owner' | 'manager' | 'worker';
  isActive: boolean;
  dailyTarget: number;
  expoPushToken?: string;
  createdAt: string;
  createdBy: string;
  passwordHash?: string;
  passwordSalt?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  isOwner: () => boolean;
  isManager: () => boolean;
  isWorker: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setToken: (token) => set({ token }),

  setLoading: (isLoading) => set({ isLoading }),

  logout: () => set({ user: null, token: null, isAuthenticated: false }),

  isOwner: () => get().user?.role === 'owner',
  isManager: () => get().user?.role === 'manager',
  isWorker: () => get().user?.role === 'worker',
}));