jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { useQuestStore } from '../useQuestStore';
import { useFocusStore } from '../useFocusStore';
import { useAuthStore } from '../useAuthStore';

describe('Life Companion Stores: Quests and Focus', () => {
  beforeEach(() => {
    // Reset stores
    useQuestStore.setState({
      date: '2026-10-16',
      quests: [
        {
          id: 'q-water-2026-10-16',
          title: 'Hydration Charge',
          description: 'Drink at least 4 glasses',
          icon: 'droplet',
          category: 'water',
          target: 4,
          current: 0,
          completed: false,
          xpReward: 30,
        },
        {
          id: 'q-habits-2026-10-16',
          title: 'Habit Mastery',
          description: 'Complete 2 habits',
          icon: 'check-circle',
          category: 'habits',
          target: 2,
          current: 0,
          completed: false,
          xpReward: 40,
        },
        {
          id: 'q-activity-2026-10-16',
          title: 'Mind & Movement',
          description: 'Walk or journal',
          icon: 'activity',
          category: 'activity',
          target: 1,
          current: 0,
          completed: false,
          xpReward: 30,
        },
      ],
      chestClaimed: false,
      streakShields: 0,
    });

    useAuthStore.setState({
      user: {
        id: 'user-1',
        name: 'Tester',
        email: 'test@example.com',
        total_xp: 500,
        level: 1,
        streak_count: 3,
      },
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
    });
  });

  describe('useQuestStore', () => {
    it('syncs daily quest progress correctly and marks quests completed', () => {
      const { syncDailyQuests } = useQuestStore.getState();

      syncDailyQuests({
        waterGlasses: 5,
        habitsDone: 2,
        steps: 4000,
        hasJournal: true,
      });

      const updatedQuests = useQuestStore.getState().quests;
      expect(updatedQuests[0].completed).toBe(true);
      expect(updatedQuests[1].completed).toBe(true);
      expect(updatedQuests[2].completed).toBe(true);
    });

    it('prevents claiming Mystery Chest if not all quests are completed', () => {
      const { syncDailyQuests, claimMysteryChest } = useQuestStore.getState();

      // Only water completed
      syncDailyQuests({
        waterGlasses: 4,
        habitsDone: 0,
        steps: 1000,
        hasJournal: false,
      });

      const reward = claimMysteryChest();
      expect(reward).toBeNull();
      expect(useQuestStore.getState().chestClaimed).toBe(false);
    });

    it('successfully unlocks and claims Mystery Chest with XP and Streak Shield', () => {
      const { syncDailyQuests, claimMysteryChest } = useQuestStore.getState();

      // Complete all 3
      syncDailyQuests({
        waterGlasses: 6,
        habitsDone: 3,
        steps: 5000,
        hasJournal: true,
      });

      const reward = claimMysteryChest();
      expect(reward).not.toBeNull();
      expect(reward?.xp).toBeGreaterThanOrEqual(50);
      expect(useQuestStore.getState().chestClaimed).toBe(true);
      expect(useQuestStore.getState().streakShields).toBe(reward?.shieldAdded ? 1 : 0);

      // Verify user received bonus XP
      const user = useAuthStore.getState().user;
      expect(user?.total_xp).toBeGreaterThan(500);
    });
  });

  describe('useFocusStore', () => {
    it('records completed Pomodoro session and credits focus minutes & XP', () => {
      const { recordCompletedSession } = useFocusStore.getState();

      const xpEarned = recordCompletedSession(25, 'pomodoro');
      expect(xpEarned).toBe(20); // Math.round(25 * 0.8)

      const state = useFocusStore.getState();
      expect(state.todayFocusMinutes).toBe(25);
      expect(state.sessionsCompletedToday).toBe(1);
      expect(state.history.length).toBe(1);
      expect(state.history[0].type).toBe('pomodoro');
    });

    it('records completed 1-Minute Box Breathing session and rewards 15 XP', () => {
      const { recordCompletedSession } = useFocusStore.getState();

      const xpEarned = recordCompletedSession(1, 'breathing');
      expect(xpEarned).toBe(15);

      const state = useFocusStore.getState();
      expect(state.todayFocusMinutes).toBeGreaterThanOrEqual(1);
    });
  });
});
