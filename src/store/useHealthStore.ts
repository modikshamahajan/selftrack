import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { useAuthStore } from './useAuthStore';

export interface HealthMetrics {
  date: string;
  steps: number;
  step_goal: number;
  water_glasses: number;
  water_goal: number;
  sleep_hours: number;
  sleep_quality: number;
  calories_burned: number;
  distance_km: number;
}

export interface FoodItem {
  id: string;
  date: string;
  name: string;
  qty: number;
  calories: number;
  serving: string;
  category: string;
  image_url?: string;
}

interface HealthState {
  metrics: HealthMetrics;
  foodLogs: FoodItem[];
  customCalorieDb: any;
  customCategories: any;
  trends: { labels: string[]; datasets: { data: number[] }[] };
  isLoading: boolean;
  fetchMetricsByDate: (date?: string) => Promise<void>;
  syncSteps: (steps: number) => Promise<void>;
  updateWater: (delta: number, date?: string) => Promise<void>;
  fetchFoodLogs: (date?: string) => Promise<void>;
  addFoodLog: (item: { name: string; qty: number; calories: number; serving?: string; category?: string; date?: string, image_url?: string }) => Promise<void>;
  deleteFoodLog: (id: string) => Promise<void>;
  fetchTrends: () => Promise<void>;
  updateSleep: (hours: number, quality: number, date?: string) => Promise<void>;
  addCustomFoodItem: (name: string, cal: number, category: string) => void;
}

const defaultMetrics: HealthMetrics = {
  date: new Date().toISOString().split('T')[0],
  steps: 0,
  step_goal: 10000,
  water_glasses: 0,
  water_goal: 8,
  sleep_hours: 0,
  sleep_quality: 0,
  calories_burned: 0,
  distance_km: 0.0,
};

export const useHealthStore = create<HealthState>()(
  persist(
    (set, get) => ({
  metrics: defaultMetrics,
  foodLogs: [],
  customCalorieDb: {},
  customCategories: {},
  trends: {
    labels: [],
    datasets: [{ data: [] }],
  },
  isLoading: false,

  fetchMetricsByDate: async (date?: string) => {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const url = date ? `/health/metrics?date=${date}` : '/health/metrics';
      const res = await api.get(url);
      if (res.data) {
        set((state) => {
          const currentWater = (state.metrics?.date === targetDate || !state.metrics?.date)
            ? (state.metrics?.water_glasses || 0)
            : 0;
          return {
            metrics: {
              ...res.data,
              water_glasses: Math.max(res.data.water_glasses || 0, currentWater),
            },
          };
        });
      }
    } catch {
      // Keep state
    }
  },

  syncSteps: async (steps: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    // Optimistic
    set((state) => {
      if (state.metrics.date === todayStr) {
        return {
          metrics: {
            ...state.metrics,
            steps,
            distance_km: parseFloat((steps * 0.00078).toFixed(2)),
            calories_burned: Math.round(steps * 0.04),
          },
        };
      }
      return state;
    });
    
    try {
      const res = await api.post('/health/sync', { steps, date: todayStr });
      set((state) => {
        if (state.metrics.date === todayStr) {
          return { metrics: res.data };
        }
        return state;
      });
    } catch {
      // Keep optimistic
    }
  },

  updateWater: async (delta: number, date?: string) => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    set((state) => ({
      metrics: {
        ...state.metrics,
        date: targetDate,
        water_glasses: Math.max(0, (state.metrics?.water_glasses || 0) + delta),
      },
    }));
    try {
      const url = date ? `/health/water?delta=${delta}&date=${date}` : `/health/water?delta=${delta}`;
      const res = await api.post(url);
      if (res.data) {
        set((state) => ({
          metrics: {
            ...res.data,
            water_glasses: Math.max(res.data.water_glasses || 0, state.metrics?.water_glasses || 0),
          },
        }));
      }
      if (res.data?.water_glasses >= (res.data?.water_goal || 8)) {
        const authUser = useAuthStore.getState().user;
        if (authUser) {
          useAuthStore.getState().updateUserXp(authUser.total_xp + 15);
        }
      }
    } catch {
      // Keep optimistic
    }
  },

  fetchFoodLogs: async (date) => {
    try {
      const url = date ? `/health/food?date=${date}` : '/health/food';
      const res = await api.get(url);
      if (Array.isArray(res.data)) {
        set((state) => {
          const unsynced = (state.foodLogs || []).filter((f) => f.id && f.id.startsWith('food-'));
          const existingKeys = new Set(res.data.map((f: any) => `${f.name}-${f.date}`));
          const remainingUnsynced = unsynced.filter((f) => !existingKeys.has(`${f.name}-${f.date}`));
          return { foodLogs: [...res.data, ...remainingUnsynced] };
        });
      }
    } catch {
      // Keep state
    }
  },

  addFoodLog: async (item) => {
    const tempId = `food-${Date.now()}`;
    const optimisticFood = {
      id: tempId,
      date: item.date || new Date().toISOString().split('T')[0],
      name: item.name,
      qty: item.qty,
      calories: item.calories,
      serving: item.serving || '',
      category: item.category || '',
      image_url: item.image_url || '',
    };

    set((state) => ({
      foodLogs: [optimisticFood, ...state.foodLogs],
    }));

    const authUser = useAuthStore.getState().user;
    if (authUser) {
      useAuthStore.getState().updateUserXp(authUser.total_xp + 10);
    }

    try {
      const res = await api.post('/health/food', item);
      if (res.data?.id) {
        set((state) => ({
          foodLogs: state.foodLogs.map((f) => (f.id === tempId ? res.data : f)),
        }));
      }
    } catch (err) {
      // Offline fallback: retain optimistic food item locally, do not revert
    }
  },

  deleteFoodLog: async (id) => {
    set((state) => ({
      foodLogs: state.foodLogs.filter((f) => f.id !== id),
    }));

    try {
      await api.delete(`/health/food/${id}`);
    } catch (err) {
      // Offline fallback: retain deletion locally
    }
  },

  fetchTrends: async () => {
    try {
      const res = await api.get('/health/trends');
      if (res.data?.labels) {
        set({ trends: res.data });
      }
    } catch {
      // Keep state
    }
  },

  updateSleep: async (hours: number, quality: number, date?: string) => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    set((state) => ({
      metrics: {
        ...state.metrics,
        sleep_hours: hours,
        sleep_quality: quality,
      },
    }));

    try {
      const res = await api.post('/health/sync', {
        date: targetDate,
        sleep_hours: hours,
        sleep_quality: quality,
      });
      if (res.data) {
        set({ metrics: res.data });
      }
    } catch {
      // Keep optimistic
    }
  },

  addCustomFoodItem: (name: string, cal: number, category: string) => {
    set((state) => {
      const db = { ...state.customCalorieDb };
      db[name] = { calories: cal, serving: '1 portion', color: '#FFF6E8' };

      const cats = { ...state.customCategories };
      if (!cats[category]) {
        cats[category] = [];
      }
      if (!cats[category].includes(name)) {
        cats[category] = [...cats[category], name];
      }
      return { customCalorieDb: db, customCategories: cats };
    });
  },

    }),
    {
      name: 'health-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
