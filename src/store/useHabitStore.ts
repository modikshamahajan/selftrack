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
  reminder_enabled?: boolean;
  reminder_frequency?: 'daily' | 'interval' | 'weekly' | 'smart';
  reminder_time?: string;
  reminder_interval_hours?: number;
  reminder_interval_unit?: 'hours' | 'minutes';
  reminder_interval_value?: number;
  reminder_weekly_days?: string[];
  reminder_days?: number[];
  routine_type?: 'morning' | 'evening' | 'none';
}

interface HabitState {
  habits: HabitItem[];
  isLoading: boolean;
  error: string | null;
  completedRoutines: Record<string, string>;
  fetchHabits: () => Promise<void>;
  addHabit: (data: Partial<HabitItem> & { name: string }) => Promise<HabitItem>;
  updateHabit: (id: string, data: Partial<HabitItem>) => Promise<HabitItem>;
  deleteHabit: (id: string) => Promise<void>;
  toggleHabit: (id: string, date?: string) => Promise<HabitItem>;
  claimRoutineReward: (routineType: string) => { alreadyClaimed: boolean; xpAwarded: number };
  clearAllHabits: () => Promise<void>;
}

const STORAGE_KEY = 'selftrack_habits';
const DUMMY_HABIT_IDS = new Set(['habit_1', 'habit_2', 'habit_3', 'habit_4']);

export const getLocalTodayDateString = (d: Date = new Date()): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const DEFAULT_HABITS: HabitItem[] = [];

const saveToStorage = async (habits: HabitItem[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  } catch (e) {}
};

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  isLoading: false,
  error: null,
  completedRoutines: {},

  fetchHabits: async () => {
    set({ isLoading: true, error: null });
    const todayStr = getLocalTodayDateString();

    // Load from local storage first for instant rendering
    try {
      const storedRoutines = await AsyncStorage.getItem('selftrack_completed_routines');
      if (storedRoutines) {
        set({ completedRoutines: JSON.parse(storedRoutines) });
      }

      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: HabitItem[] = JSON.parse(stored);
        const filtered = Array.isArray(parsed) ? parsed.filter((h) => !DUMMY_HABIT_IDS.has(h.id)) : [];
        const normalized = filtered.map((h) => ({
          ...h,
          completed: Boolean(h.completed_days?.[todayStr]),
        }));
        set({ habits: normalized });
        if (Array.isArray(parsed) && parsed.length !== filtered.length) {
          await saveToStorage(filtered);
        }
      } else {
        await saveToStorage([]);
      }
    } catch (e) {}

    // Try syncing with API
    try {
      const res = await api.get('/habits');
      if (Array.isArray(res.data) && res.data.length > 0) {
        const normalizedApi = res.data.map((h: any) => ({
          ...h,
          completed: Boolean(h.completed_days?.[todayStr]),
        }));
        set({ habits: normalizedApi, isLoading: false });
        await saveToStorage(normalizedApi);
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
    const localToday = getLocalTodayDateString();
    const todayStr = date || localToday;

    let toggledHabit: HabitItem | null = null;
    const isToday = todayStr === localToday;
    const updatedHabits = get().habits.map((h) => {
      if (h.id === id) {
        const isCurrentlyCompleted = Boolean(h.completed_days?.[todayStr]);
        const nextCompleted = !isCurrentlyCompleted;
        const newCompletedDays = { ...(h.completed_days || {}), [todayStr]: nextCompleted };
        const updated: HabitItem = {
          ...h,
          completed: isToday ? nextCompleted : h.completed,
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
      const isDateCompleted = Boolean((toggledHabit as HabitItem).completed_days?.[todayStr]);
      const xpDelta = isDateCompleted ? 20 : -20;
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

  claimRoutineReward: (routineType: string) => {
    const todayStr = getLocalTodayDateString();
    const routines = get().completedRoutines || {};
    const lastClaimDate = routines[routineType];

    if (lastClaimDate === todayStr) {
      return { alreadyClaimed: true, xpAwarded: 0 };
    }

    const updated = { ...routines, [routineType]: todayStr };
    set({ completedRoutines: updated });
    AsyncStorage.setItem('selftrack_completed_routines', JSON.stringify(updated)).catch(() => {});

    // Award +50 XP
    try {
      const authUser = useAuthStore.getState().user;
      if (authUser) {
        useAuthStore.getState().updateUserXp((authUser.total_xp || 0) + 50);
      }
    } catch (e) {}

    return { alreadyClaimed: false, xpAwarded: 50 };
  },

  clearAllHabits: async () => {
    set({ habits: [], completedRoutines: {} });
    await saveToStorage([]);
    try {
      await AsyncStorage.removeItem('selftrack_completed_routines');
    } catch (e) {}
  },
}));
