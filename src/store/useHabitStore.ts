import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { useAuthStore } from './useAuthStore';

export interface HabitItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: string;
  streak_target: number;
  current_streak: number;
  completed: boolean;
  completed_days?: Record<string, boolean>;
}

interface HabitState {
  habits: HabitItem[];
  isLoading: boolean;
  error: string | null;
  fetchHabits: () => Promise<void>;
  addHabit: (data: { name: string; icon?: string; color?: string; category?: string; streak_target?: number }) => Promise<HabitItem>;
  updateHabit: (id: string, data: Partial<HabitItem>) => Promise<HabitItem>;
  deleteHabit: (id: string) => Promise<void>;
  toggleHabit: (id: string, date?: string) => Promise<HabitItem>;
}

const STORAGE_KEY = 'selftrack_habits';

const DEFAULT_HABITS: HabitItem[] = [
  {
    id: 'habit_1',
    name: 'Drink 8 Glasses of Water',
    icon: 'droplet',
    color: '#3498DB',
    category: 'Health',
    streak_target: 7,
    current_streak: 5,
    completed: true,
    completed_days: { [new Date().toISOString().split('T')[0]]: true },
  },
  {
    id: 'habit_2',
    name: 'Morning 20-min Walk',
    icon: 'activity',
    color: '#2ECC71',
    category: 'Fitness',
    streak_target: 10,
    current_streak: 3,
    completed: false,
    completed_days: {},
  },
  {
    id: 'habit_3',
    name: 'Evening Reflection & Gratitude',
    icon: 'book-open',
    color: '#9B59B6',
    category: 'Mindfulness',
    streak_target: 7,
    current_streak: 4,
    completed: false,
    completed_days: {},
  },
  {
    id: 'habit_4',
    name: 'Read 15 Pages',
    icon: 'bookmark',
    color: '#F39C12',
    category: 'Productivity',
    streak_target: 5,
    current_streak: 2,
    completed: false,
    completed_days: {},
  },
];

const saveToStorage = async (habits: HabitItem[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  } catch (e) {}
};

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: DEFAULT_HABITS,
  isLoading: false,
  error: null,

  fetchHabits: async () => {
    set({ isLoading: true, error: null });

    // Load from local storage first for instant rendering
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        set({ habits: JSON.parse(stored) });
      } else {
        await saveToStorage(DEFAULT_HABITS);
      }
    } catch (e) {}

    // Try syncing with API
    try {
      const res = await api.get('/habits');
      if (Array.isArray(res.data) && res.data.length > 0) {
        set({ habits: res.data, isLoading: false });
        await saveToStorage(res.data);
      } else {
        set({ isLoading: false });
      }
    } catch (err: any) {
      // Offline fallback: keep local habits
      set({ isLoading: false, error: null });
    }
  },

  addHabit: async (data) => {
    set({ isLoading: true });

    // Create local habit
    const localId = 'habit_' + Date.now();
    const newHabit: HabitItem = {
      id: localId,
      name: data.name,
      icon: data.icon || 'check-circle',
      color: data.color || '#2ECC71',
      category: data.category || 'General',
      streak_target: data.streak_target || 7,
      current_streak: 0,
      completed: false,
      completed_days: {},
    };

    // Update state locally first
    const updatedHabits = [newHabit, ...get().habits];
    set({ habits: updatedHabits, isLoading: false });
    await saveToStorage(updatedHabits);

    // Award XP
    const authUser = useAuthStore.getState().user;
    if (authUser) {
      useAuthStore.getState().updateUserXp(authUser.total_xp + 20);
    }

    // Try backend sync in background
    try {
      const res = await api.post('/habits', data);
      if (res.data?.id) {
        const syncedHabit = res.data;
        const finalized = get().habits.map((h) => (h.id === localId ? syncedHabit : h));
        set({ habits: finalized });
        await saveToStorage(finalized);
        return syncedHabit;
      }
    } catch (e) {
      // Offline mode: local habit remains saved
    }

    return newHabit;
  },

  updateHabit: async (id, data) => {
    const updatedHabits = get().habits.map((h) => (h.id === id ? { ...h, ...data } : h));
    set({ habits: updatedHabits });
    await saveToStorage(updatedHabits);

    try {
      const res = await api.put(`/habits/${id}`, data);
      if (res.data) {
        const synced = get().habits.map((h) => (h.id === id ? res.data : h));
        set({ habits: synced });
        await saveToStorage(synced);
        return res.data;
      }
    } catch (e) {}

    return updatedHabits.find((h) => h.id === id) || ({} as HabitItem);
  },

  deleteHabit: async (id) => {
    const filtered = get().habits.filter((h) => h.id !== id);
    set({ habits: filtered });
    await saveToStorage(filtered);

    try {
      await api.delete(`/habits/${id}`);
    } catch (e) {}
  },

  toggleHabit: async (id, date) => {
    const todayStr = date || new Date().toISOString().split('T')[0];

    let toggledHabit: HabitItem | null = null;
    const updatedHabits = get().habits.map((h) => {
      if (h.id === id) {
        const isCurrentlyCompleted = h.completed_days?.[todayStr] ?? h.completed;
        const nextCompleted = !isCurrentlyCompleted;
        const newCompletedDays = { ...(h.completed_days || {}), [todayStr]: nextCompleted };
        const updated: HabitItem = {
          ...h,
          completed: nextCompleted,
          current_streak: nextCompleted ? h.current_streak + 1 : Math.max(0, h.current_streak - 1),
          completed_days: newCompletedDays,
        };
        toggledHabit = updated;
        return updated;
      }
      return h;
    });

    set({ habits: updatedHabits });
    await saveToStorage(updatedHabits);

    // Update XP in auth store
    const authUser = useAuthStore.getState().user;
    if (authUser && toggledHabit) {
      const xpDelta = (toggledHabit as HabitItem).completed ? 20 : -20;
      useAuthStore.getState().updateUserXp(Math.max(0, authUser.total_xp + xpDelta));
    }

    if (toggledHabit && (toggledHabit as HabitItem).completed && (toggledHabit as HabitItem).current_streak === (toggledHabit as HabitItem).streak_target && (toggledHabit as HabitItem).streak_target > 0) {
      try {
        const { scheduleLocalNotification } = require('../utils/notifications');
        scheduleLocalNotification(
          'Streak Target Reached! 🏆',
          `You hit your ${(toggledHabit as HabitItem).streak_target}-day streak goal for ${(toggledHabit as HabitItem).name}. Incredible work!`,
          1
        );
      } catch (e) {}
    }

    // Try backend sync
    try {
      await api.post(`/habits/${id}/toggle`, { date: todayStr });
    } catch (e) {
      // Offline fallback: keep local state
    }

    return toggledHabit || get().habits.find((h) => h.id === id)!;
  },
}));
