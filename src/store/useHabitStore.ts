import { create } from 'zustand';
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

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  isLoading: false,
  error: null,

  fetchHabits: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/habits');
      set({ habits: res.data, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Failed to fetch habits' });
    }
  },

  addHabit: async (data) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/habits', data);
      const newHabit = res.data;
      set((state) => ({
        habits: [newHabit, ...state.habits],
        isLoading: false,
      }));
      // Award XP in auth store (+20 XP)
      const authUser = useAuthStore.getState().user;
      if (authUser) {
        useAuthStore.getState().updateUserXp(authUser.total_xp + 20);
      }
      return newHabit;
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  updateHabit: async (id, data) => {
    set({ isLoading: true });
    try {
      const res = await api.put(`/habits/${id}`, data);
      const updated = res.data;
      set((state) => ({
        habits: state.habits.map((h) => (h.id === id ? updated : h)),
        isLoading: false,
      }));
      return updated;
    } catch (err: any) {
      set({ isLoading: false });
      throw err;
    }
  },

  deleteHabit: async (id) => {
    try {
      await api.delete(`/habits/${id}`);
      set((state) => ({
        habits: state.habits.filter((h) => h.id !== id),
      }));
    } catch (err: any) {
      throw err;
    }
  },

  toggleHabit: async (id, date) => {
    // Optimistic UI update
    const previousHabits = get().habits;
    const todayStr = date || new Date().toISOString().split('T')[0];

    set((state) => ({
      habits: state.habits.map((h) => {
        if (h.id === id) {
          const isCurrentlyCompleted = h.completed_days?.[todayStr] ?? h.completed;
          const nextCompleted = !isCurrentlyCompleted;
          const newCompletedDays = { ...(h.completed_days || {}), [todayStr]: nextCompleted };
          return {
            ...h,
            completed: nextCompleted,
            current_streak: nextCompleted ? h.current_streak + 1 : Math.max(0, h.current_streak - 1),
            completed_days: newCompletedDays,
          };
        }
        return h;
      }),
    }));

    try {
      const res = await api.post(`/habits/${id}/toggle`, { date: todayStr });
      const updated = res.data;
      set((state) => ({
        habits: state.habits.map((h) => (h.id === id ? updated : h)),
      }));

      // Update XP in auth store
      const authUser = useAuthStore.getState().user;
      if (authUser) {
        const xpDelta = updated.completed ? 20 : -20;
        useAuthStore.getState().updateUserXp(Math.max(0, authUser.total_xp + xpDelta));
      }

      if (updated.completed && updated.current_streak === updated.streak_target && updated.streak_target > 0) {
        try {
          const { scheduleLocalNotification } = require('../utils/notifications');
          scheduleLocalNotification(
            'Streak Target Reached! 🏆',
            `You hit your ${updated.streak_target}-day streak goal for ${updated.name}. Incredible work!`,
            1
          );
        } catch (e) {}
      }

      return updated;
    } catch (err: any) {
      // Rollback on error
      set({ habits: previousHabits });
      throw err;
    }
  },
}));
