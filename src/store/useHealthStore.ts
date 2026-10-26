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
  setWaterGlasses: (count: number, date?: string) => Promise<void>;
  fetchFoodLogs: (date?: string) => Promise<void>;
  addFoodLog: (item: { name: string; qty: number; calories: number; serving?: string; category?: string; date?: string; image_url?: string }) => Promise<void>;
  deleteFoodLog: (id: string) => Promise<void>;
  updateFoodCalories: (id: string, calories: number) => void;
  updateFoodLogItem: (id: string, updates: { calories?: number; qty?: number; serving?: string }) => void;
  clearFoodLogsForDate: (date: string) => Promise<void>;
  fetchTrends: () => Promise<void>;
  updateSleep: (hours: number, quality: number, date?: string) => Promise<void>;
  addCustomFoodItem: (name: string, cal: number, category: string, image_url?: string) => void;
  syncDevicePedometer: () => Promise<void>;
  resetHealthState: () => void;
}

export const createDefaultMetricsForDate = (dateStr: string): HealthMetrics => ({
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

export const getLocalTodayDateString = (d: Date = new Date()): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const todayDateStr = getLocalTodayDateString();

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

      resetHealthState: () => {
        const todayStr = getLocalTodayDateString();
        set({
          metrics: createDefaultMetricsForDate(todayStr),
          dailyMetrics: {},
          foodLogs: [],
          customCalorieDb: {},
          customCategories: {},
          trends: {
            labels: [],
            datasets: [{ data: [] }],
          },
          isLoading: false,
        });
      },

      fetchMetricsByDate: async (date?: string) => {
        const todayStr = getLocalTodayDateString();
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
        const todayStr = date || getLocalTodayDateString();
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
        const todayStr = getLocalTodayDateString();
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

      setWaterGlasses: async (count: number, date?: string) => {
        const targetDate = date || get().metrics?.date || getLocalTodayDateString();
        const currentMetrics = get().dailyMetrics?.[targetDate] ||
          (get().metrics?.date === targetDate ? get().metrics : createDefaultMetricsForDate(targetDate));
        const current = Math.min(20, Math.max(0, currentMetrics.water_glasses || 0));
        const target = Math.min(20, Math.max(0, count));
        const delta = target - current;
        if (delta !== 0) {
          await get().updateWater(delta, targetDate);
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
        const todayStr = getLocalTodayDateString();
        const targetDate = item.date || todayStr;
        const tempId = `food-${Date.now()}`;
        const cleanImageUrl = typeof item.image_url === 'string' ? item.image_url : '';
        const optimisticFood = {
          id: tempId,
          date: targetDate,
          name: item.name,
          qty: item.qty || 1,
          calories: item.calories || 0,
          serving: item.serving || '',
          category: item.category || '',
          image_url: cleanImageUrl,
        };

        set((state) => ({
          foodLogs: [
            optimisticFood,
            ...(state.foodLogs || []).map((f: any) => ({
              ...f,
              image_url: typeof f.image_url === 'string' ? f.image_url : '',
            })),
          ],
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

      updateFoodLogItem: (id: string, updates: { calories?: number; qty?: number; serving?: string }) => {
        set((state) => ({
          foodLogs: state.foodLogs.map((f) => {
            if (f.id !== id) return f;
            const newCal = updates.calories !== undefined ? Math.max(0, Math.round(updates.calories)) : f.calories;
            const newQty = updates.qty !== undefined ? Math.max(0, Math.round(updates.qty)) : (typeof f.qty === 'number' ? f.qty : 1);
            const newServing = updates.serving !== undefined ? updates.serving : f.serving;
            return { ...f, calories: newCal, qty: newQty, serving: newServing };
          }),
        }));

        try {
          const payload: any = {};
          if (updates.calories !== undefined) payload.calories = Math.max(0, Math.round(updates.calories));
          if (updates.qty !== undefined) payload.qty = Math.max(1, Math.round(updates.qty));
          if (updates.serving !== undefined) payload.serving = updates.serving;
          api.patch(`/health/food/${id}`, payload).catch(() => {});
        } catch {}
      },

      updateFoodCalories: (id: string, calories: number) => {
        get().updateFoodLogItem(id, { calories });
      },

      clearFoodLogsForDate: async (date: string) => {
        const toDelete = (get().foodLogs || []).filter((f) => f.date === date || f.date?.startsWith(date));
        set((state) => ({
          foodLogs: (state.foodLogs || []).filter((f) => !(f.date === date || f.date?.startsWith(date))),
        }));

        for (const item of toDelete) {
          try {
            api.delete(`/health/food/${item.id}`).catch(() => {});
          } catch {}
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
        const todayStr = getLocalTodayDateString();
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

      syncDevicePedometer: async () => {
        try {
          const { Pedometer } = require('expo-sensors');
          const available = await Pedometer.isAvailableAsync();
          if (!available) return;
          const perm = await Pedometer.getPermissionsAsync();
          if (!perm.granted) {
            const req = await Pedometer.requestPermissionsAsync();
            if (!req.granted) return;
          }
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const result = await Pedometer.getStepCountAsync(start, new Date());
          if (typeof result?.steps === 'number') {
            await get().syncSteps(result.steps);
          }
        } catch (e) {
          // Graceful fallback if sensor unavailable
        }
      },
    }),
    {
      name: 'health-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.foodLogs && Array.isArray(state.foodLogs)) {
          state.foodLogs = state.foodLogs.map((f: any) => ({
            ...f,
            image_url: typeof f.image_url === 'string' ? f.image_url : '',
          }));
        }
        if (state) {
          const currentToday = getLocalTodayDateString();
          if (state.metrics && state.metrics.date !== currentToday) {
            state.metrics = state.dailyMetrics?.[currentToday] || createDefaultMetricsForDate(currentToday);
          }
        }
      },
    }
  )
);
