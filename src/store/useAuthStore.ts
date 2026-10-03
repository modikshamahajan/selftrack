import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  total_xp: number;
  level: number;
  streak_count: number;
  interests?: string[];
  goals?: string[];
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initializeAuth: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (name: string, email: string, password: string, interests?: string[], goals?: string[]) => Promise<UserProfile>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateUserXp: (newXp: number, newLevel?: number) => void;
  updateProfile: (updates: { name?: string; avatar_url?: string }) => Promise<UserProfile>;
  setUser: (user: UserProfile | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  initializeAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await AsyncStorage.getItem('userToken');
      const savedProfile = await AsyncStorage.getItem('userProfile');
      
      if (!token) {
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        return false;
      }

      if (savedProfile) {
        set({ user: JSON.parse(savedProfile), token, isAuthenticated: true });
      }

      // Re-verify with backend
      try {
        const res = await api.get('/auth/me');
        if (res.data) {
          await AsyncStorage.setItem('userProfile', JSON.stringify(res.data));
          set({ user: res.data, token, isAuthenticated: true, isLoading: false });
          return true;
        }
      } catch (err: any) {
        // If 401, token expired and refresh failed
        if (err.response?.status === 401) {
          await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userProfile']);
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          return false;
        }
      }

      set({ isLoading: false });
      return true;
    } catch {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return false;
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/login', { email, password });
      const { access_token, refresh_token, user } = res.data;
      
      await AsyncStorage.setItem('userToken', access_token);
      if (refresh_token) {
        await AsyncStorage.setItem('refreshToken', refresh_token);
      }
      await AsyncStorage.setItem('userProfile', JSON.stringify(user));
      
      set({ user, token: access_token, isAuthenticated: true, isLoading: false });
      return user;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (name: string, email: string, password: string, interests = [], goals = []) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/register', { name, email, password, interests, goals });
      const { access_token, refresh_token, user } = res.data;
      
      await AsyncStorage.setItem('userToken', access_token);
      if (refresh_token) {
        await AsyncStorage.setItem('refreshToken', refresh_token);
      }
      await AsyncStorage.setItem('userProfile', JSON.stringify(user));
      
      set({ user, token: access_token, isAuthenticated: true, isLoading: false });
      return user;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userProfile']);
    set({ user: null, token: null, isAuthenticated: false });
  },

  deleteAccount: async () => {
    try {
      await api.delete('/auth/account');
    } catch (e) {
      // Continue cleanup regardless
    }
    await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userProfile']);
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUserXp: (newXp: number, newLevel?: number) => {
    const currentUser = get().user;
    if (currentUser) {
      const updated = {
        ...currentUser,
        total_xp: newXp,
        level: newLevel || Math.floor(newXp / 1000) + 1,
      };
      set({ user: updated });
      AsyncStorage.setItem('userProfile', JSON.stringify(updated));
    }
  },

  updateProfile: async (updates: { name?: string; avatar_url?: string }) => {
    try {
      const currentUser = get().user;
      const res = await api.put('/users/profile', updates);
      const updated = { ...currentUser, ...updates, ...res.data };
      if (updates.avatar_url) updated.avatar_url = updates.avatar_url; // Ensure avatar_url is retained even if backend omits it
      set({ user: updated });
      await AsyncStorage.setItem('userProfile', JSON.stringify(updated));
      return updated;
    } catch (error) {
      // Fallback: update local profile state optimistically
      const currentUser = get().user;
      if (currentUser) {
        const fallback = { ...currentUser, ...updates };
        set({ user: fallback });
        await AsyncStorage.setItem('userProfile', JSON.stringify(fallback));
        return fallback;
      }
      throw error;
    }
  },

  setUser: (user: UserProfile | null) => {
    set({ user });
    if (user) {
      AsyncStorage.setItem('userProfile', JSON.stringify(user));
    }
  },
}));
