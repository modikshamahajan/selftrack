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
  dailyMetrics: Record<string, HealthMetrics>;
  foodLogs: FoodItem[];
  customCalorieDb: any;
  customCategories: any;
  trends: { labels: string[]; datasets: { data: number[] }[] };
  isLoading: boolean;
  fetchMetricsByDate: (date?: string) => Promise<void>;
  syncSteps: (steps: number, date?: string) => Promise<void>;
  updateWater: (delta: number, date?: string) => Promise<void>;
  fetchFoodLogs: (date?: string) => Promise<void>;
  addFoodLog: (item: { name: string; qty: number; calories: number; serving?: string; category?: string; date?: string; image_url?: string }) => Promise<void>;
  deleteFoodLog: (id: string) => Promise<void>;
  fetchTrends: () => Promise<void>;
  updateSleep: (hours: number, quality: number, date?: string) => Promise<void>;
  addCustomFoodItem: (name: string, cal: number, category: string, image_url?: string) => void;
}

const createDefaultMetricsForDate = (dateStr: string): HealthMetrics => ({
  date: dateStr,
  steps: 0,
  step_goal: 10000,
  water_glasses: 0,
  water_goal: 8,
  sleep_hours: 0,
  sleep_quality: 0,
  calories_burned: 0,
  distance_km: 0.0,
});

const todayDateStr = new Date().toISOString().split('T')[0];

export const useHealthStore = create<HealthState>()(
  persist(
    (set, get) => ({
      metrics: createDefaultMetricsForDate(todayDateStr),
      dailyMetrics: {},
      foodLogs: [],
      customCalorieDb: {},
      customCategories: {},
      trends: {
        labels: [],
        datasets: [{ data: [] }],
      },
      isLoading: false,

      fetchMetricsByDate: async (date?: string) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const targetDate = date || todayStr;

        // Immediately set the active metrics for targetDate (either from local store or fresh 0)
        set((state) => {
          const existing = state.dailyMetrics?.[targetDate];
          const initial = existing ? { ...existing, date: targetDate } : createDefaultMetricsForDate(targetDate);
          return { metrics: initial };
        });

        try {
          const url = date ? `/health/metrics?date=${date}` : '/health/metrics';
          const res = await api.get(url);
          if (res.data) {
            set((state) => {
              const glassesVal = Math.min(20, Math.max(0, res.data.water_glasses ?? 0));
              const updated: HealthMetrics = {
                ...createDefaultMetricsForDate(targetDate),
                ...res.data,
                date: targetDate,
                water_glasses: glassesVal,
              };
              return {
                metrics: updated,
                dailyMetrics: {
                  ...(state.dailyMetrics || {}),
                  [targetDate]: updated,
                },
              };
            });
          }
        } catch {
          // Offline fallback: keep the targetDate-specific metrics (starts at 0 if no entry made yet)
        }
      },

      syncSteps: async (steps: number, date?: string) => {
        const todayStr = date || new Date().toISOString().split('T')[0];
        set((state) => {
          const current = state.dailyMetrics?.[todayStr] ||
            (state.metrics?.date === todayStr ? state.metrics : createDefaultMetricsForDate(todayStr));
          const updated: HealthMetrics = {
            ...current,
            date: todayStr,
            steps,
            distance_km: parseFloat((steps * 0.00078).toFixed(2)),
            calories_burned: Math.round(steps * 0.04),
          };
          return {
            metrics: state.metrics?.date === todayStr ? updated : state.metrics,
            dailyMetrics: {
              ...(state.dailyMetrics || {}),
              [todayStr]: updated,
            },
          };
        });

        try {
          const res = await api.post('/health/sync', { steps, date: todayStr });
          if (res.data) {
            set((state) => {
              const finalMetrics = { ...res.data, date: todayStr };
              return {
                metrics: state.metrics?.date === todayStr ? finalMetrics : state.metrics,
                dailyMetrics: {
                  ...(state.dailyMetrics || {}),
                  [todayStr]: finalMetrics,
                },
              };
            });
          }
        } catch {
          // Keep optimistic
        }
      },

      updateWater: async (delta: number, date?: string) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const targetDate = date || get().metrics?.date || todayStr;
        const currentMetrics = get().dailyMetrics?.[targetDate] ||
          (get().metrics?.date === targetDate ? get().metrics : createDefaultMetricsForDate(targetDate));
        const current = Math.min(20, Math.max(0, currentMetrics.water_glasses || 0));

        // Strict boundary: cannot go below 0 and cannot exceed 20 glasses
        if (delta > 0 && current >= 20) return;
        if (delta < 0 && current <= 0) return;

        const newGlasses = Math.min(20, Math.max(0, current + delta));
        const updatedMetrics: HealthMetrics = {
          ...currentMetrics,
          date: targetDate,
          water_glasses: newGlasses,
        };

        set((state) => ({
          metrics: updatedMetrics,
          dailyMetrics: {
            ...(state.dailyMetrics || {}),
            [targetDate]: updatedMetrics,
          },
        }));

        try {
          const url = date ? `/health/water?delta=${delta}&date=${date}` : `/health/water?delta=${delta}`;
          const res = await api.post(url);
          if (res.data) {
            const finalGlasses = Math.min(20, Math.max(0, res.data.water_glasses ?? newGlasses));
            const finalMetrics: HealthMetrics = {
              ...updatedMetrics,
              ...res.data,
              date: targetDate,
              water_glasses: finalGlasses,
            };
            set((state) => ({
              metrics: finalMetrics,
              dailyMetrics: {
                ...(state.dailyMetrics || {}),
                [targetDate]: finalMetrics,
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
        const todayStr = new Date().toISOString().split('T')[0];
        const targetDate = item.date || todayStr;
        const tempId = `food-${Date.now()}`;
        const optimisticFood = {
          id: tempId,
          date: targetDate,
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
          const res = await api.post('/health/food', { ...item, date: targetDate });
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
        const todayStr = new Date().toISOString().split('T')[0];
        const targetDate = date || get().metrics?.date || todayStr;
        const current = get().dailyMetrics?.[targetDate] ||
          (get().metrics?.date === targetDate ? get().metrics : createDefaultMetricsForDate(targetDate));
        const updated: HealthMetrics = {
          ...current,
          date: targetDate,
          sleep_hours: hours,
          sleep_quality: quality,
        };
        set((state) => ({
          metrics: state.metrics?.date === targetDate ? updated : state.metrics,
          dailyMetrics: {
            ...(state.dailyMetrics || {}),
            [targetDate]: updated,
          },
        }));

        try {
          const res = await api.post('/health/sync', {
            date: targetDate,
            sleep_hours: hours,
            sleep_quality: quality,
          });
          if (res.data) {
            const finalMetrics = { ...res.data, date: targetDate };
            set((state) => ({
              metrics: state.metrics?.date === targetDate ? finalMetrics : state.metrics,
              dailyMetrics: {
                ...(state.dailyMetrics || {}),
                [targetDate]: finalMetrics,
              },
            }));
          }
        } catch {
          // Keep optimistic
        }
      },

      addCustomFoodItem: (name: string, cal: number, category: string, image_url?: string) => {
        set((state) => {
          const db = { ...state.customCalorieDb };
          db[name] = { calories: cal, serving: '1 portion', color: '#FFF6E8', image_url };

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
