import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './useAuthStore';

export interface QuestItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'water' | 'habits' | 'activity' | 'mind';
  target: number;
  current: number;
  completed: boolean;
  xpReward: number;
  habitId?: string;
}

interface QuestState {
  date: string;
  quests: QuestItem[];
  chestClaimed: boolean;
  streakShields: number; // 0 to 2
  lastClaimedReward?: {
    xp: number;
    shieldAdded: boolean;
    timestamp: string;
  };
  syncDailyQuests: (metrics: {
    habits?: any[];
    waterGlasses: number;
    habitsDone: number;
    steps: number;
    hasJournal: boolean;
  }) => void;
  claimMysteryChest: () => { xp: number; shieldAdded: boolean; message: string } | null;
  addStreakShield: (count?: number) => void;
  useStreakShield: () => boolean;
  resetQuests: () => void;
}

export const generateDailyQuests = (dateStr: string, habitsList: any[] = []): QuestItem[] => {
  if (!habitsList || habitsList.length === 0) {
    return [
      {
        id: `q-starter-${dateStr}`,
        title: 'Starter Momentum',
        description: 'Add your first personal habit to begin your journey',
        icon: 'plus-circle',
        category: 'habits',
        target: 1,
        current: 0,
        completed: false,
        xpReward: 50,
      },
      {
        id: `q-reflect-${dateStr}`,
        title: 'Mindful Spark',
        description: 'Write a journal reflection or walk 1,500 steps',
        icon: 'zap',
        category: 'activity',
        target: 1,
        current: 0,
        completed: false,
        xpReward: 35,
      },
    ];
  }

  const generated: QuestItem[] = [];

  // Quest 1: Priority Habit
  const primaryHabit = habitsList[0];
  generated.push({
    id: `q-focus-${dateStr}`,
    title: `Focus: ${primaryHabit.name}`,
    description: `Complete "${primaryHabit.name}" today`,
    icon: primaryHabit.icon || 'check-circle',
    category: 'habits',
    habitId: primaryHabit.id,
    target: 1,
    current: primaryHabit.completed ? 1 : 0,
    completed: Boolean(primaryHabit.completed),
    xpReward: 35,
  });

  // Quest 2: Habit Consistency
  const habitTarget = Math.min(habitsList.length, 2);
  generated.push({
    id: `q-habits-${dateStr}`,
    title: 'Habit Mastery',
    description: `Complete ${habitTarget} of your personal habit${habitTarget > 1 ? 's' : ''}`,
    icon: 'target',
    category: 'habits',
    target: habitTarget,
    current: 0,
    completed: false,
    xpReward: 40,
  });

  // Quest 3: Only add Hydration if the user tracks water, otherwise Mind & Movement
  const hasWaterHabit = habitsList.some(
    (h: any) =>
      h.name?.toLowerCase().includes('water') ||
      h.name?.toLowerCase().includes('hydrat') ||
      h.category?.toLowerCase() === 'health'
  );

  if (hasWaterHabit) {
    generated.push({
      id: `q-water-${dateStr}`,
      title: 'Hydration Target',
      description: 'Drink at least 4 glasses of water today',
      icon: 'droplet',
      category: 'water',
      target: 4,
      current: 0,
      completed: false,
      xpReward: 30,
    });
  } else {
    generated.push({
      id: `q-mind-${dateStr}`,
      title: 'Mind & Movement',
      description: 'Walk 3,000 steps or write a daily journal reflection',
      icon: 'zap',
      category: 'activity',
      target: 1,
      current: 0,
      completed: false,
      xpReward: 35,
    });
  }

  return generated;
};

export const getLocalTodayDateString = (d: Date = new Date()): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const useQuestStore = create<QuestState>()(
  persist(
    (set, get) => ({
      date: getLocalTodayDateString(),
      quests: [],
      chestClaimed: false,
      streakShields: 1, // Start with 1 complimentary shield

      syncDailyQuests: ({ habits = [], waterGlasses, habitsDone, steps, hasJournal }) => {
        const todayStr = getLocalTodayDateString();
        let currentQuests = get().quests;
        let isNewDay = get().date !== todayStr;

        if (isNewDay || !currentQuests || currentQuests.length === 0) {
          currentQuests = generateDailyQuests(todayStr, habits);
          set({
            date: todayStr,
            quests: currentQuests,
            chestClaimed: false,
          });
        }

        const updated = currentQuests.map((q) => {
          let currentVal = 0;
          let isDone = false;

          if (q.habitId) {
            const h = habits.find((item: any) => item.id === q.habitId);
            currentVal = h?.completed ? 1 : 0;
            isDone = currentVal >= 1;
          } else if (q.category === 'water') {
            currentVal = waterGlasses;
            isDone = currentVal >= q.target;
          } else if (q.category === 'habits') {
            currentVal = habitsDone;
            isDone = currentVal >= q.target;
          } else if (q.category === 'activity') {
            const stepsGoalHit = steps >= 3000;
            currentVal = (stepsGoalHit || hasJournal) ? 1 : 0;
            isDone = currentVal >= 1;
          }

          return {
            ...q,
            current: Math.min(q.target, currentVal),
            completed: isDone,
          };
        });

        set({ quests: updated });
      },

      claimMysteryChest: () => {
        const state = get();
        if (state.chestClaimed) return null;

        const allCompleted = state.quests.length > 0 && state.quests.every((q) => q.completed);
        if (!allCompleted) return null;

        // Randomized bonus XP between 60 and 100
        const xpEarned = Math.floor(Math.random() * 41) + 60;
        let shieldAdded = false;

        // 75% chance to award a streak shield if user has < 2
        if (state.streakShields < 2 && Math.random() < 0.75) {
          shieldAdded = true;
        }

        const newShields = shieldAdded ? Math.min(2, state.streakShields + 1) : state.streakShields;

        // Award XP to user account
        const authUser = useAuthStore.getState().user;
        if (authUser) {
          useAuthStore.getState().updateUserXp(authUser.total_xp + xpEarned);
        }

        set({
          chestClaimed: true,
          streakShields: newShields,
          lastClaimedReward: {
            xp: xpEarned,
            shieldAdded,
            timestamp: new Date().toISOString(),
          },
        });

        return {
          xp: xpEarned,
          shieldAdded,
          message: shieldAdded
            ? `Earned +${xpEarned} XP and a Streak Shield 🛡️!`
            : `Earned +${xpEarned} XP!`,
        };
      },

      addStreakShield: (count = 1) => {
        set((state) => ({
          streakShields: Math.min(2, state.streakShields + count),
        }));
      },

      useStreakShield: () => {
        const state = get();
        if (state.streakShields > 0) {
          set({ streakShields: state.streakShields - 1 });
          return true;
        }
        return false;
      },

      resetQuests: () => {
        const todayStr = getLocalTodayDateString();
        set({
          date: todayStr,
          quests: generateDailyQuests(todayStr, []),
          chestClaimed: false,
          streakShields: 1,
          lastClaimedReward: undefined,
        });
      },
    }),
    {
      name: 'quest-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
