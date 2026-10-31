import { create } from 'zustand';
import { api } from '@/lib/api';

interface User {
  id: string;
  handle: string;
  email: string;
  role: string;
  rating: number;
  maxRating: number;
  avatar: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;

  login: (login: string, password: string) => Promise<void>;
  register: (handle: string, email: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  isAuthenticated: false,

  setAuth: (user, accessToken) => {
    set({ user, accessToken, isAuthenticated: true, isLoading: false });
  },

  clearAuth: () => {
    set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  login: async (login: string, password: string) => {
    const data = await api.post<{ accessToken: string; user: User }>('/auth/login', {
      login,
      password,
    });
    get().setAuth(data.user, data.accessToken);
  },

  register: async (handle: string, email: string, password: string) => {
    const data = await api.post<{ message: string }>('/auth/register', {
      handle,
      email,
      password,
    });
    return data.message;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Clear local state even if server logout fails
    }
    get().clearAuth();
  },

  refreshToken: async () => {
    try {
      const data = await api.post<{ accessToken: string }>('/auth/refresh');
      set({ accessToken: data.accessToken });
      return true;
    } catch {
      get().clearAuth();
      return false;
    }
  },

  fetchMe: async () => {
    try {
      // Try to refresh the token first (uses HTTP-only cookie)
      const refreshed = await get().refreshToken();
      if (!refreshed) return;

      const data = await api.get<{ user: User }>('/auth/me');
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch {
      get().clearAuth();
    }
  },
}));
