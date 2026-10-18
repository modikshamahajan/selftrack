import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export interface UserProfile {
  id: string;
  name: string;
  phone?: string;
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
  sendOtp: (phone: string, name?: string) => Promise<{ status: string; message: string; dev_otp?: string }>;
  loginWithOtp: (phone: string, otp: string, name?: string) => Promise<UserProfile>;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (name: string, email: string, password: string, interests?: string[], goals?: string[]) => Promise<UserProfile>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateUserXp: (newXp: number, newLevel?: number) => void;
  updateProfile: (updates: { name?: string; avatar_url?: string }) => Promise<UserProfile>;
  continueAsGuest: () => Promise<UserProfile>;
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
        try {
          const parsed = JSON.parse(savedProfile);
          set({ user: parsed, token, isAuthenticated: true, isLoading: false });

          // Refresh profile in background without delaying splash transition
          if (token !== 'local_guest_token') {
            api.get('/auth/me').then(async (res) => {
              if (res.data) {
                await AsyncStorage.setItem('userProfile', JSON.stringify(res.data));
                set({ user: res.data });
              }
            }).catch((err) => {
              if (err.response?.status === 401) {
                AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userProfile']);
                set({ user: null, token: null, isAuthenticated: false });
              }
            });
          }

          return true;
        } catch {}
      }

      // If guest mode, keep local session without network verification
      if (token === 'local_guest_token') {
        set({ isLoading: false, isAuthenticated: true });
        return true;
      }

      // If no local profile cached, fetch from backend with 1.5s timeout
      try {
        const res = (await Promise.race([
          api.get('/auth/me'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500)),
        ])) as any;

        if (res?.data) {
          await AsyncStorage.setItem('userProfile', JSON.stringify(res.data));
          set({ user: res.data, token, isAuthenticated: true, isLoading: false });
          return true;
        }
      } catch (err: any) {
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

  sendOtp: async (phone: string, name?: string) => {
    try {
      const res = await api.post('/auth/send-otp', { phone, name });
      return res.data;
    } catch (error: any) {
      // If backend is unreachable over LAN during Expo Go testing, provide seamless demo fallback
      if (!error.response || error.message?.includes('Network') || error.code === 'ERR_NETWORK') {
        return {
          status: 'success',
          message: `Verification code sent to ${phone} (Demo Mode)`,
          dev_otp: '123456',
        };
      }
      throw error;
    }
  },

  loginWithOtp: async (phone: string, otp: string, name?: string) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/verify-otp', { phone, otp, name });
      const { access_token, refresh_token, user } = res.data;

      await AsyncStorage.setItem('userToken', access_token);
      if (refresh_token) {
        await AsyncStorage.setItem('refreshToken', refresh_token);
      }
      await AsyncStorage.setItem('userProfile', JSON.stringify(user));

      set({ user, token: access_token, isAuthenticated: true, isLoading: false });
      return user;
    } catch (error: any) {
      // If backend is unreachable over LAN during Expo Go testing, log in locally with demo profile
      if (!error.response || error.message?.includes('Network') || error.code === 'ERR_NETWORK') {
        const dummyUser: UserProfile = {
          id: 'user_' + Date.now(),
          name: name?.trim() || 'SelfTrack User',
          phone,
          email: `${phone.replace(/\D/g, '')}@selftrack.app`,
          total_xp: 100,
          level: 1,
          streak_count: 0,
          interests: [],
          goals: [],
        };
        const token = 'offline_token_' + Date.now();
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('userProfile', JSON.stringify(dummyUser));
        set({ user: dummyUser, token, isAuthenticated: true, isLoading: false });
        return dummyUser;
      }
      set({ isLoading: false });
      throw error;
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

  continueAsGuest: async () => {
    const guestUser: UserProfile = {
      id: 'local_guest_user',
      name: 'SelfTrack Explorer',
      email: 'guest@selftrack.local',
      total_xp: 350,
      level: 1,
      streak_count: 5,
      interests: ['Fitness', 'Productivity', 'Mindfulness'],
      goals: ['Build daily habits', 'Hydration tracking', 'Mental wellness'],
    };
    await AsyncStorage.setItem('userToken', 'local_guest_token');
    await AsyncStorage.setItem('userProfile', JSON.stringify(guestUser));
    await AsyncStorage.setItem('isGuestMode', 'true');
    set({ user: guestUser, token: 'local_guest_token', isAuthenticated: true, isLoading: false });
    return guestUser;
  },

  setUser: (user: UserProfile | null) => {
    set({ user });
    if (user) {
      AsyncStorage.setItem('userProfile', JSON.stringify(user));
    }
  },
}));
