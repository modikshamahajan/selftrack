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
  loginWithPhonePin: (name: string, phone: string, pin: string, isRegistration?: boolean) => Promise<UserProfile>;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (name: string, email: string, password: string, interests?: string[], goals?: string[]) => Promise<UserProfile>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateUserXp: (newXp: number, newLevel?: number) => void;
  updateProfile: (updates: { name?: string; avatar_url?: string }) => Promise<UserProfile>;
  continueAsGuest: () => Promise<UserProfile>;
  hasPendingWelcomeBonus: boolean;
  setHasPendingWelcomeBonus: (hasBonus: boolean) => void;
  setUser: (user: UserProfile | null) => void;
  setToken: (token: string | null) => void;
}

import { resetAppDataForNewUser } from './resetAppData';
export { resetAppDataForNewUser };

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  hasPendingWelcomeBonus: false,

  setHasPendingWelcomeBonus: (hasBonus) => set({ hasPendingWelcomeBonus: hasBonus }),
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setToken: (token) => set({ token }),

  // Hydrate user session from AsyncStorage on app launch
  initializeAuth: async () => {
    set({ isLoading: true });
    try {
      // First-launch fresh start check: ensure clean state on install
      const hasFreshStart = await AsyncStorage.getItem('@selftrack_fresh_install_v1');
      if (!hasFreshStart) {
        await AsyncStorage.multiRemove([
          'userToken',
          'userProfile',
          'refreshToken',
          'isGuestMode',
          'selftrack_registered_users',
        ]);
        await resetAppDataForNewUser();
        await AsyncStorage.setItem('@selftrack_fresh_install_v1', 'true');
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        return false;
      }

      const [token, userProfileRaw] = await AsyncStorage.multiGet(['userToken', 'userProfile']);
      const storedToken = token[1];
      const storedUser = userProfileRaw[1] ? JSON.parse(userProfileRaw[1]) : null;

      // Do not auto-login guest users on app launch; require explicit sign-in/registration
      if (
        storedToken &&
        storedUser &&
        storedUser.id !== 'local_guest_user' &&
        storedToken !== 'local_guest_token'
      ) {
        set({ user: storedUser, token: storedToken, isAuthenticated: true, isLoading: false });
        return true;
      }
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return false;
    } catch (_err) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return false;
    }
  },

  sendOtp: async (phone: string, name?: string) => {
    const res = await api.post('/auth/send-otp', { phone, name });
    return res.data;
  },

  loginWithOtp: async (phone: string, otp: string, name?: string) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/verify-otp', { phone, otp, name });
      const { access_token, refresh_token, user } = res.data;

      const storageItems: [string, string][] = [
        ['userToken', access_token],
        ['userProfile', JSON.stringify(user)],
      ];
      if (refresh_token) {
        storageItems.push(['refreshToken', refresh_token]);
      }
      await AsyncStorage.multiSet(storageItems);

      set({ user, token: access_token, isAuthenticated: true, isLoading: false });
      return user;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  loginWithPhonePin: async (name: string, phone: string, pin: string, isRegistration: boolean = false) => {
    set({ isLoading: true });
    const digits = phone.replace(/\D/g, '');
    const normalizedPhone = digits.length >= 10 ? digits.slice(-10) : digits;
    const cleanPin = pin.trim().slice(0, 4);

    try {
      const res = await api.post('/auth/phone-pin', {
        name,
        phone,
        pin: cleanPin,
        is_registration: isRegistration,
      });
      const { access_token, refresh_token, user } = res.data;

      if (isRegistration) {
        await resetAppDataForNewUser();
      }

      set({
        user,
        token: access_token,
        isAuthenticated: true,
        isLoading: false,
        hasPendingWelcomeBonus: Boolean(isRegistration),
      });

      try {
        const storedUsersRaw = await AsyncStorage.getItem('selftrack_registered_users');
        const storedUsers = storedUsersRaw ? JSON.parse(storedUsersRaw) : {};
        storedUsers[normalizedPhone] = {
          user,
          pin: cleanPin,
          name: user.name,
          phone,
        };
        await AsyncStorage.setItem('selftrack_registered_users', JSON.stringify(storedUsers));
      } catch (_err) { }

      const storageItems: [string, string][] = [
        ['userToken', access_token],
        ['userProfile', JSON.stringify(user)],
      ];
      if (refresh_token) {
        storageItems.push(['refreshToken', refresh_token]);
      }
      AsyncStorage.multiSet(storageItems).catch(() => { });

      return user;
    } catch (error: any) {
      if (error.response) {
        set({ isLoading: false });
        throw error;
      }

      if (!error.response || error.message?.includes('Network') || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
        try {
          const storedUsersRaw = await AsyncStorage.getItem('selftrack_registered_users');
          const storedUsers = storedUsersRaw ? JSON.parse(storedUsersRaw) : {};
          const existingRecord = storedUsers[normalizedPhone];

          if (isRegistration) {
            if (existingRecord) {
              set({ isLoading: false });
              const err: any = new Error(`An account with mobile number ${phone} is already registered. Please switch to Sign In and enter your PIN.`);
              err.response = {
                status: 400,
                data: { detail: `An account with mobile number ${phone} is already registered. Please switch to Sign In and enter your PIN.` }
              };
              throw err;
            }

            await resetAppDataForNewUser();

            const newUser: UserProfile = {
              id: 'user_' + normalizedPhone,
              name: name.trim() || 'SelfTrack User',
              phone,
              email: `${normalizedPhone}@selftrack.app`,
              total_xp: 100,
              level: 1,
              streak_count: 0,
              interests: [],
              goals: [],
            };
            storedUsers[normalizedPhone] = {
              user: newUser,
              pin: cleanPin,
              name: newUser.name,
              phone,
            };
            await AsyncStorage.setItem('selftrack_registered_users', JSON.stringify(storedUsers));
            const token = 'offline_token_' + Date.now();
            await AsyncStorage.setItem('userToken', token);
            await AsyncStorage.setItem('userProfile', JSON.stringify(newUser));
            set({
              user: newUser,
              token,
              isAuthenticated: true,
              isLoading: false,
              hasPendingWelcomeBonus: true,
            });
            return newUser;
          } else {
            if (!existingRecord) {
              set({ isLoading: false });
              const err: any = new Error(`No registered account found with this mobile number. Either check your number or tap "Register" to create a new account.`);
              err.response = {
                status: 404,
                data: { detail: `No registered account found with this mobile number. Either check your number or tap "Register" to create a new account.` }
              };
              throw err;
            }

            if (existingRecord.pin !== cleanPin) {
              set({ isLoading: false });
              const err: any = new Error(`The PIN you entered does not match this mobile number. Either the mobile number or PIN is not correct, or please register as a new user.`);
              err.response = {
                status: 401,
                data: { detail: `The PIN you entered does not match this mobile number. Either the mobile number or PIN is not correct, or please register as a new user.` }
              };
              throw err;
            }

            const token = 'offline_token_' + Date.now();
            await AsyncStorage.setItem('userToken', token);
            await AsyncStorage.setItem('userProfile', JSON.stringify(existingRecord.user));
            set({ user: existingRecord.user, token, isAuthenticated: true, isLoading: false });
            return existingRecord.user;
          }
        } catch (localErr: any) {
          set({ isLoading: false });
          throw localErr;
        }
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

  register: async (name: string, email: string, password: string, interests: string[] = [], goals: string[] = []) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/register', { name, email, password, interests, goals });
      const { access_token, refresh_token, user } = res.data;

      await resetAppDataForNewUser();

      await AsyncStorage.setItem('userToken', access_token);
      if (refresh_token) {
        await AsyncStorage.setItem('refreshToken', refresh_token);
      }
      await AsyncStorage.setItem('userProfile', JSON.stringify(user));

      set({
        user,
        token: access_token,
        isAuthenticated: true,
        isLoading: false,
        hasPendingWelcomeBonus: true,
      });
      return user;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userProfile']);
    await resetAppDataForNewUser();
    set({ user: null, token: null, isAuthenticated: false });
  },

  deleteAccount: async () => {
    try {
      await api.delete('/auth/account');
    } catch (_e) { }
    await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userProfile']);
    await resetAppDataForNewUser();
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
      if (updates.avatar_url) updated.avatar_url = updates.avatar_url;
      set({ user: updated });
      await AsyncStorage.setItem('userProfile', JSON.stringify(updated));
      return updated;
    } catch (error) {
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
      streak_count: 0,
      interests: ['Fitness', 'Productivity', 'Mindfulness'],
      goals: ['Build daily habits', 'Hydration tracking', 'Mental wellness'],
    };
    await AsyncStorage.setItem('userToken', 'local_guest_token');
    await AsyncStorage.setItem('userProfile', JSON.stringify(guestUser));
    await AsyncStorage.setItem('isGuestMode', 'true');
    set({ user: guestUser, token: 'local_guest_token', isAuthenticated: true, isLoading: false });
    return guestUser;
  },
}));
