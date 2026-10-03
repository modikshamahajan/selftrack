import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotificationStore } from '../store/useNotificationStore';
import { useSettingsStore } from '../store/useSettingsStore';

export interface ScheduledReminder {
  id: string;
  type: 'habit' | 'water' | 'reflection';
  title: string;
  message: string;
  hour: number;
  minute: number;
  enabled: boolean;
}

const DEFAULT_REMINDERS: ScheduledReminder[] = [
  {
    id: 'reminder_daily_habits',
    type: 'habit',
    title: 'Daily Habit Check-in',
    message: 'Take a moment to review and complete your habits today! Keep your streak burning 🔥',
    hour: 20,
    minute: 0,
    enabled: true,
  },
  {
    id: 'reminder_hydration',
    type: 'water',
    title: 'Hydration Reminder',
    message: 'Time for a glass of water! Stay energized and hydrated 💧',
    hour: 14,
    minute: 30,
    enabled: true,
  },
  {
    id: 'reminder_reflection',
    type: 'reflection',
    title: 'Evening Journal',
    message: 'How was your day? Record a quick reflection in your journal 📖',
    hour: 21,
    minute: 30,
    enabled: true,
  },
];

import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '../utils/notifications';

export const getScheduledReminders = async (): Promise<ScheduledReminder[]> => {
  try {
    const raw = await AsyncStorage.getItem('scheduled_reminders');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Fallback
  }
  return DEFAULT_REMINDERS;
};

export const updateReminderStatus = async (id: string, enabled: boolean): Promise<void> => {
  const current = await getScheduledReminders();
  const updated = current.map((r) => (r.id === id ? { ...r, enabled } : r));
  await AsyncStorage.setItem('scheduled_reminders', JSON.stringify(updated));
  await syncDeviceNotifications();
};

export const syncDeviceNotifications = async (): Promise<void> => {
  const pushEnabled = useSettingsStore.getState().settings.push_notifications;
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!pushEnabled) return;

  const permission = await registerForPushNotificationsAsync();
  
  const reminders = await getScheduledReminders();

  for (const r of reminders) {
    if (r.enabled) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: r.title,
          body: r.message,
          sound: true,
          data: { category: r.type },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: r.hour,
          minute: r.minute,
        },
      });
    }
  }
};

export const triggerDailyReminderCheck = async (): Promise<void> => {
  // Sync the actual local device notifications when the app starts
  await syncDeviceNotifications();

  // We can still optionally generate the mock in-app notification list for the Notification Tab
  const pushEnabled = useSettingsStore.getState().settings.push_notifications;
  if (!pushEnabled) return;

  const reminders = await getScheduledReminders();
  const now = new Date();
  const currentHour = now.getHours();

  for (const r of reminders) {
    if (r.enabled && Math.abs(currentHour - r.hour) <= 1) {
      const existing = useNotificationStore.getState().notifications;
      const alreadyNotified = existing.some(
        (n) => n.title === r.title && n.time.includes('min')
      );
      if (!alreadyNotified) {
        useNotificationStore.setState((s) => ({
          notifications: [
            {
              id: `notif_${Date.now()}_${r.id}`,
              title: r.title,
              message: r.message,
              category: r.type,
              icon: r.type === 'water' ? 'droplet' : r.type === 'habit' ? 'check-circle' : 'book',
              color: r.type === 'water' ? '#00B4D8' : '#2ECC71',
              time: 'Just now',
              read: false,
            },
            ...s.notifications,
          ],
        }));
      }
    }
  }
};
