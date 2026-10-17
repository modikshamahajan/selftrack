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
    waterGlasses: number;
    habitsDone: number;
    steps: number;
    hasJournal: boolean;
  }) => void;
  claimMysteryChest: () => { xp: number; shieldAdded: boolean; message: string } | null;
  addStreakShield: (count?: number) => void;
  useStreakShield: () => boolean;
}

const generateDailyQuests = (dateStr: string): QuestItem[] => [
  {
    id: `q-water-${dateStr}`,
    title: 'Hydration Charge',
    description: 'Drink at least 4 glasses of water today',
    icon: 'droplet',
    category: 'water',
    target: 4,
    current: 0,
    completed: false,
    xpReward: 30,
  },
  {
    id: `q-habits-${dateStr}`,
    title: 'Habit Mastery',
    description: 'Complete at least 2 habits from your daily focus',
    icon: 'check-circle',
    category: 'habits',
    target: 2,
    current: 0,
    completed: false,
    xpReward: 40,
  },
  {
    id: `q-mind-${dateStr}`,
    title: 'Mind & Movement',
    description: 'Walk 3,000 steps or write a daily journal reflection',
    icon: 'zap',
    category: 'activity',
    target: 1,
    current: 0,
    completed: false,
    xpReward: 35,
  },
];

export const useQuestStore = create<QuestState>()(
  persist(
    (set, get) => ({
      date: new Date().toISOString().split('T')[0],
      quests: generateDailyQuests(new Date().toISOString().split('T')[0]),
      chestClaimed: false,
      streakShields: 1, // Start with 1 complimentary shield

      syncDailyQuests: ({ waterGlasses, habitsDone, steps, hasJournal }) => {
        const todayStr = new Date().toISOString().split('T')[0];
        let currentQuests = get().quests;
        let isNewDay = get().date !== todayStr;

        if (isNewDay || !currentQuests || currentQuests.length === 0) {
          currentQuests = generateDailyQuests(todayStr);
          set({
            date: todayStr,
            quests: currentQuests,
            chestClaimed: false,
          });
        }

        const updated = currentQuests.map((q) => {
          let currentVal = 0;
          let isDone = false;

          if (q.category === 'water') {
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
    }),
    {
      name: 'quest-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
