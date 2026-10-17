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

import { Platform } from 'react-native';
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
  try {
    const current = await getScheduledReminders();
    const updated = current.map((r) => (r.id === id ? { ...r, enabled } : r));
    await AsyncStorage.setItem('scheduled_reminders', JSON.stringify(updated));
    await syncDeviceNotifications();
  } catch {
    // Graceful fallback
  }
};

export const syncDeviceNotifications = async (): Promise<void> => {
  try {
    const pushEnabled = useSettingsStore.getState().settings.push_notifications;
    
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {
      // Ignored if cancel fails
    }

    if (!pushEnabled) return;

    await registerForPushNotificationsAsync();
    
    const reminders = await getScheduledReminders();

    for (const r of reminders) {
      if (r.enabled) {
        try {
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
              channelId: Platform.OS === 'android' ? 'default' : undefined,
            },
          });
        } catch {
          // Fallback if platform prevents recurring alarm scheduling
        }
      }
    }

    // Sync Special Event Notifications (Birthdays, Anniversaries, Meetings, Special Occasions)
    try {
      const { syncAllSpecialEventNotifications } = await import('./specialEvents');
      await syncAllSpecialEventNotifications();
    } catch {
      // Ignored if special events sync fails
    }
  } catch {
    // Catch-all prevents uncaught notification errors from surfacing to the user
  }
};

export const triggerDailyReminderCheck = async (): Promise<void> => {
  try {
    // Sync the actual local device notifications when the app starts
    await syncDeviceNotifications();

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

    // Check upcoming special events (birthdays, anniversaries, meetings, occasions)
    try {
      const { checkAndCreateInAppEventAlerts } = await import('./specialEvents');
      await checkAndCreateInAppEventAlerts();
    } catch {
      // Ignored if in-app alerts check fails
    }
  } catch {
    // Ignore reminder sync error on startup
  }
};
