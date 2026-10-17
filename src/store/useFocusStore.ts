import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './useAuthStore';

export interface FocusSessionRecord {
  id: string;
  date: string;
  minutes: number;
  type: 'pomodoro' | 'breathing';
  xpEarned: number;
  timestamp: string;
}

interface FocusState {
  totalFocusMinutes: number;
  sessionsCompletedToday: number;
  todayFocusMinutes: number;
  lastDateStr: string;
  history: FocusSessionRecord[];
  recordCompletedSession: (minutes: number, type: 'pomodoro' | 'breathing') => number;
  resetDailyIfNewDate: () => void;
}

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const useFocusStore = create<FocusState>()(
  persist(
    (set, get) => ({
      totalFocusMinutes: 0,
      sessionsCompletedToday: 0,
      todayFocusMinutes: 0,
      lastDateStr: getTodayStr(),
      history: [],

      resetDailyIfNewDate: () => {
        const today = getTodayStr();
        if (get().lastDateStr !== today) {
          set({
            lastDateStr: today,
            sessionsCompletedToday: 0,
            todayFocusMinutes: 0,
          });
        }
      },

      recordCompletedSession: (minutes: number, type: 'pomodoro' | 'breathing') => {
        get().resetDailyIfNewDate();
        const today = getTodayStr();
        const xpEarned = type === 'pomodoro' ? Math.max(10, Math.round(minutes * 0.8)) : 15;

        const newRecord: FocusSessionRecord = {
          id: `focus-${Date.now()}`,
          date: today,
          minutes,
          type,
          xpEarned,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          totalFocusMinutes: state.totalFocusMinutes + minutes,
          todayFocusMinutes: state.todayFocusMinutes + minutes,
          sessionsCompletedToday: state.sessionsCompletedToday + 1,
          history: [newRecord, ...state.history.slice(0, 49)],
        }));

        // Reward user in auth store
        try {
          const authUser = useAuthStore.getState().user;
          if (authUser) {
            const nextXp = (authUser.total_xp || 0) + xpEarned;
            useAuthStore.getState().updateUserXp(nextXp);
          }
        } catch (e) {}

        return xpEarned;
      },
    }),
    {
      name: 'selftrack-focus-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
