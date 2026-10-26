import AsyncStorage from '@react-native-async-storage/async-storage';

export const resetAppDataForNewUser = async (): Promise<void> => {
  const keysToRemove = [
    'selftrack_habits',
    'selftrack_completed_routines',
    'selftrack_journals',
    'health-storage',
    'quest-storage',
    '@selftrack_special_events_v2',
    'scheduled_reminders',
    '@selftrack_menstrual_data',
    'selftrack_menstrual_cycle_v1',
    'social-storage',
  ];
  try {
    await AsyncStorage.multiRemove(keysToRemove);
    const allKeys = await AsyncStorage.getAllKeys();
    const bonusKeys = allKeys.filter((k) => k.includes('welcome_bonus_seen'));
    if (bonusKeys.length > 0) {
      await AsyncStorage.multiRemove(bonusKeys);
    }
  } catch (_e) {}

  try {
    const { useHabitStore } = require('./useHabitStore');
    await useHabitStore.getState().clearAllHabits();
  } catch (_e) {}

  try {
    const { useJournalStore } = require('./useJournalStore');
    await useJournalStore.getState().clearAllEntries();
  } catch (_e) {}

  try {
    const { useHealthStore } = require('./useHealthStore');
    useHealthStore.getState().resetHealthState();
  } catch (_e) {}

  try {
    const { useQuestStore } = require('./useQuestStore');
    useQuestStore.getState().resetQuests();
  } catch (_e) {}

  try {
    const { useNotificationStore } = require('./useNotificationStore');
    useNotificationStore.getState().clearNotifications();
  } catch (_e) {}

  try {
    const { useSpecialEventStore } = require('./useSpecialEventStore');
    await useSpecialEventStore.getState().clearAllEvents();
  } catch (_e) {}

  try {
    const { useSocialStore } = require('./useSocialStore');
    useSocialStore.getState().resetSocialState();
  } catch (_e) {}

  try {
    const { useRewardsStore } = require('./useRewardsStore');
    useRewardsStore.getState().resetRewardsState();
  } catch (_e) {}

  try {
    const { useMenstrualStore } = require('./useMenstrualStore');
    await useMenstrualStore.getState().clearMenstrualData();
  } catch (_e) {}
};
