import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import {
  SpecialEvent,
  SpecialEventType,
  EVENT_TYPE_METAS,
  ADVANCE_NOTICE_LABELS,
} from '../types/specialEvents';
import { useNotificationStore } from '../store/useNotificationStore';
import { scheduleLocalNotification } from '../utils/notifications';

const STORAGE_KEY = '@selftrack_special_events_v2';

// Helper to format ISO date YYYY-MM-DD
export const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to format a target date offset
const getDateOffsetString = (daysOffset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats a 10-digit Indian mobile number cleanly as "XXXXX XXXXX"
 */
export const formatIndianPhoneNumber = (digits: string): string => {
  const clean = digits.replace(/\D/g, '');
  const ten = clean.length > 10 ? clean.slice(-10) : clean;
  if (ten.length <= 5) return ten;
  return `${ten.slice(0, 5)} ${ten.slice(5, 10)}`;
};

/**
 * Validates whether the given input is a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)
 */
export const isValidIndianMobile = (phone: string): boolean => {
  const clean = phone.replace(/\D/g, '');
  const ten = clean.length > 10 ? clean.slice(-10) : clean;
  return /^[6-9]\d{9}$/.test(ten);
};

export const INITIAL_SPECIAL_EVENTS: SpecialEvent[] = [
  {
    id: 'evt_sample_birthday_1',
    title: "Mom's Birthday",
    type: 'birthday',
    date: getDateOffsetString(3),
    time: '09:00',
    repeat: 'yearly',
    reminderAdvance: '1_day_before',
    notes: 'Order fresh flowers, pick up custom cake, and call in the morning! 🎂💐',
    enabled: true,
    autoPhoneAlerts: true,
    alertTimesCount: 2,
    color: EVENT_TYPE_METAS.birthday.color,
    icon: EVENT_TYPE_METAS.birthday.icon,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'evt_sample_anniversary_1',
    title: 'Wedding Anniversary',
    type: 'anniversary',
    date: getDateOffsetString(14),
    time: '19:00',
    repeat: 'yearly',
    reminderAdvance: '2_days_before',
    notes: 'Reserve candle-light table at rooftop bistro & get gift ready 💍✨',
    enabled: true,
    autoPhoneAlerts: true,
    alertTimesCount: 2,
    color: EVENT_TYPE_METAS.anniversary.color,
    icon: EVENT_TYPE_METAS.anniversary.icon,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'evt_sample_meeting_1',
    title: 'Product Strategy & Roadmap Sync',
    type: 'meeting',
    date: getDateOffsetString(1),
    time: '14:30',
    repeat: 'none',
    reminderAdvance: '15_min_before',
    notes: 'Present Q4 user retention metrics & notification roadmap 💼📊',
    locationOrLink: 'https://meet.google.com/xyz-selftrack',
    enabled: true,
    autoPhoneAlerts: true,
    alertTimesCount: 2,
    color: EVENT_TYPE_METAS.meeting.color,
    icon: EVENT_TYPE_METAS.meeting.icon,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'evt_sample_occasion_1',
    title: 'Annual Tech & Wellness Gala',
    type: 'occasion',
    date: getDateOffsetString(7),
    time: '18:00',
    repeat: 'none',
    reminderAdvance: '1_day_before',
    notes: 'Dress code: Formal / Cocktail. Keynote at 7:00 PM 🎉🥂',
    enabled: true,
    autoPhoneAlerts: true,
    alertTimesCount: 2,
    color: EVENT_TYPE_METAS.occasion.color,
    icon: EVENT_TYPE_METAS.occasion.icon,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Calculates the next occurrence Date for an event based on recurrence
 */
export const getNextOccurrenceDate = (event: SpecialEvent): Date => {
  const [yearStr, monthStr, dayStr] = event.date.split('-');
  const [hourStr, minStr] = (event.time || '09:00').split(':');

  const baseYear = parseInt(yearStr, 10);
  const baseMonth = parseInt(monthStr, 10) - 1; // 0-indexed
  const baseDay = parseInt(dayStr, 10);
  const hour = parseInt(hourStr, 10) || 9;
  const minute = parseInt(minStr, 10) || 0;

  const now = new Date();

  if (event.repeat === 'yearly') {
    const currentYear = now.getFullYear();
    let target = new Date(currentYear, baseMonth, baseDay, hour, minute, 0, 0);
    // If it already passed this year, schedule for next year
    if (target.getTime() < now.getTime()) {
      target = new Date(currentYear + 1, baseMonth, baseDay, hour, minute, 0, 0);
    }
    return target;
  }

  if (event.repeat === 'monthly') {
    let target = new Date(now.getFullYear(), now.getMonth(), baseDay, hour, minute, 0, 0);
    if (target.getTime() < now.getTime()) {
      target = new Date(now.getFullYear(), now.getMonth() + 1, baseDay, hour, minute, 0, 0);
    }
    return target;
  }

  if (event.repeat === 'weekly') {
    const originalDate = new Date(baseYear, baseMonth, baseDay, hour, minute, 0, 0);
    const targetDayOfWeek = originalDate.getDay();
    const currentDayOfWeek = now.getDay();
    let diffDays = targetDayOfWeek - currentDayOfWeek;
    if (diffDays < 0 || (diffDays === 0 && now.getTime() > originalDate.getTime())) {
      diffDays += 7;
    }
    const target = new Date(now);
    target.setDate(now.getDate() + diffDays);
    target.setHours(hour, minute, 0, 0);
    return target;
  }

  // Once / No repeat
  return new Date(baseYear, baseMonth, baseDay, hour, minute, 0, 0);
};

/**
 * Calculates advance offset in milliseconds
 */
export const getAdvanceOffsetMs = (advance: SpecialEvent['reminderAdvance']): number => {
  switch (advance) {
    case '15_min_before':
      return 15 * 60 * 1000;
    case '1_hour_before':
      return 60 * 60 * 1000;
    case '1_day_before':
      return 24 * 60 * 60 * 1000;
    case '2_days_before':
      return 48 * 60 * 60 * 1000;
    case 'at_time':
    default:
      return 0;
  }
};

/**
 * Calculates the exact timestamp when the notification should fire
 */
export const getNotificationTriggerDate = (event: SpecialEvent): Date => {
  const occurrence = getNextOccurrenceDate(event);
  const offsetMs = getAdvanceOffsetMs(event.reminderAdvance);
  return new Date(occurrence.getTime() - offsetMs);
};

/**
 * Formats a friendly countdown or date badge
 */
export const getEventCountdownLabel = (event: SpecialEvent): { label: string; isToday: boolean; isPast: boolean } => {
  const occurrence = getNextOccurrenceDate(event);
  const now = new Date();

  // Compare year, month, date
  const isToday =
    occurrence.getFullYear() === now.getFullYear() &&
    occurrence.getMonth() === now.getMonth() &&
    occurrence.getDate() === now.getDate();

  if (isToday) {
    return { label: 'Today! 🎉', isToday: true, isPast: false };
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    occurrence.getFullYear() === tomorrow.getFullYear() &&
    occurrence.getMonth() === tomorrow.getMonth() &&
    occurrence.getDate() === tomorrow.getDate();

  if (isTomorrow) {
    return { label: 'Tomorrow', isToday: false, isPast: false };
  }

  const diffMs = occurrence.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0 && event.repeat === 'none') {
    return { label: 'Passed', isToday: false, isPast: true };
  }

  if (diffDays <= 7) {
    return { label: `In ${diffDays} days`, isToday: false, isPast: false };
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return {
    label: `${monthNames[occurrence.getMonth()]} ${occurrence.getDate()}`,
    isToday: false,
    isPast: false,
  };
};

/**
 * Get all stored special events from AsyncStorage
 */
export const getStoredSpecialEvents = async (): Promise<SpecialEvent[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: SpecialEvent[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[SpecialEvents] Error reading storage:', err);
  }
  // Fallback to initial seeded events and persist them
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SPECIAL_EVENTS));
  } catch {}
  return INITIAL_SPECIAL_EVENTS;
};

/**
 * Save all special events to AsyncStorage
 */
export const saveAllSpecialEvents = async (events: SpecialEvent[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (err) {
    console.warn('[SpecialEvents] Error saving storage:', err);
  }
};

/**
 * Generates notification title & message for an event
 */
export const buildEventNotificationContent = (
  event: SpecialEvent,
  isAdvanceNotice = false
): { title: string; body: string } => {
  const meta = EVENT_TYPE_METAS[event.type] || EVENT_TYPE_METAS.occasion;
  const advanceText = ADVANCE_NOTICE_LABELS[event.reminderAdvance];

  let title = '';
  let body = '';

  switch (event.type) {
    case 'birthday':
      title = isAdvanceNotice
        ? `🎂 Upcoming Birthday: ${event.title}`
        : `🎂 Happy Birthday! ${event.title}`;
      body = isAdvanceNotice
        ? `Reminder (${advanceText}): ${event.title} is coming up. ${event.notes ? `Note: ${event.notes}` : "Don't forget to send wishes and celebrate!"}`
        : `Today is ${event.title}! Celebrate and make it an unforgettable day! 🥳🎈`;
      break;

    case 'anniversary':
      title = isAdvanceNotice
        ? `💍 Upcoming Anniversary: ${event.title}`
        : `💍 Happy Anniversary! ${event.title}`;
      body = isAdvanceNotice
        ? `Reminder (${advanceText}): ${event.title} is just around the corner! ${event.notes || ''}`
        : `Celebrating a wonderful milestone today: ${event.title}. Cheers to many more! ✨🥂`;
      break;

    case 'meeting':
      title = isAdvanceNotice
        ? `💼 Upcoming Meeting: ${event.title}`
        : `💼 Meeting Starting Now: ${event.title}`;
      body = isAdvanceNotice
        ? `Scheduled for ${event.time}. ${event.notes ? `Agenda: ${event.notes}` : ''} ${event.locationOrLink ? `(${event.locationOrLink})` : ''}`
        : `Time for your meeting: ${event.title}. Be ready and sharp! 🚀`;
      break;

    case 'occasion':
    default:
      title = isAdvanceNotice
        ? `🎉 Upcoming Event: ${event.title}`
        : `🎉 Special Occasion: ${event.title}`;
      body = isAdvanceNotice
        ? `Reminder (${advanceText}): ${event.title} is coming up. ${event.notes || ''}`
        : `Today is ${event.title}! Enjoy the celebration to the fullest! ⭐🎊`;
      break;
  }

  return { title, body };
};

/**
 * Cancels all scheduled device notifications associated with a special event
 */
export const cancelSpecialEventNotifications = async (event: SpecialEvent): Promise<void> => {
  const idsToCancel = new Set<string>();
  if (event.scheduledNotificationId) idsToCancel.add(event.scheduledNotificationId);
  if (Array.isArray(event.scheduledNotificationIds)) {
    event.scheduledNotificationIds.forEach((id) => idsToCancel.add(id));
  }

  for (const id of idsToCancel) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {}
  }
};

/**
 * Schedules 2 automated local device notifications for an event:
 * - Alert 1: Advance Heads-up Alert (e.g. 1 day or 15 mins before)
 * - Alert 2: Day-of Celebration Alert (on the exact event date & time)
 * Exactly identical to how health and habit notifications are scheduled automatically.
 */
export const scheduleSpecialEventNotification = async (
  event: SpecialEvent
): Promise<{ primaryId?: string; allIds: string[] }> => {
  const scheduledIds: string[] = [];
  try {
    // 1. Cancel existing notifications for this event
    await cancelSpecialEventNotifications(event);

    if (!event.enabled) {
      return { allIds: [] };
    }

    const now = new Date();
    const occurrenceDate = getNextOccurrenceDate(event);
    const advanceTriggerDate = getNotificationTriggerDate(event);

    // Alert 1: Advance Heads-up Reminder
    if (advanceTriggerDate.getTime() > now.getTime() && advanceTriggerDate.getTime() !== occurrenceDate.getTime()) {
      try {
        const { title, body } = buildEventNotificationContent(event, true);
        const id1 = await Notifications.scheduleNotificationAsync({
          content: {
            title: `🔔 [1/2 Advance Alert] ${title}`,
            body,
            sound: true,
            data: {
              eventId: event.id,
              eventType: event.type,
              alertIndex: 1,
              category: 'special_event',
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: advanceTriggerDate,
            channelId: Platform.OS === 'android' ? 'default' : undefined,
          },
        });
        if (id1) scheduledIds.push(id1);
      } catch (err) {
        console.warn('[SpecialEvents] Failed to schedule advance alert:', err);
      }
    }

    // Alert 2: Day-of Event Celebration Alert
    if (occurrenceDate.getTime() > now.getTime()) {
      try {
        const { title, body } = buildEventNotificationContent(event, false);
        const id2 = await Notifications.scheduleNotificationAsync({
          content: {
            title: `🎉 [2/2 Celebration Alert] ${title}`,
            body,
            sound: true,
            data: {
              eventId: event.id,
              eventType: event.type,
              alertIndex: 2,
              category: 'special_event',
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: occurrenceDate,
            channelId: Platform.OS === 'android' ? 'default' : undefined,
          },
        });
        if (id2) scheduledIds.push(id2);
      } catch (err) {
        console.warn('[SpecialEvents] Failed to schedule day-of alert:', err);
      }
    }

    return {
      primaryId: scheduledIds[0],
      allIds: scheduledIds,
    };
  } catch (err) {
    console.warn('[SpecialEvents] Error in scheduleSpecialEventNotification:', err);
    return { allIds: [] };
  }
};

/**
 * Syncs and reschedules all enabled event notifications (2x automated cycle)
 */
export const syncAllSpecialEventNotifications = async (): Promise<void> => {
  try {
    const events = await getStoredSpecialEvents();
    let hasChanges = false;

    const updatedEvents = await Promise.all(
      events.map(async (evt) => {
        if (evt.enabled) {
          const res = await scheduleSpecialEventNotification(evt);
          if (
            res.primaryId !== evt.scheduledNotificationId ||
            JSON.stringify(res.allIds) !== JSON.stringify(evt.scheduledNotificationIds)
          ) {
            hasChanges = true;
            return {
              ...evt,
              scheduledNotificationId: res.primaryId,
              scheduledNotificationIds: res.allIds,
            };
          }
        } else if (evt.scheduledNotificationId || evt.scheduledNotificationIds?.length) {
          await cancelSpecialEventNotifications(evt);
          hasChanges = true;
          return {
            ...evt,
            scheduledNotificationId: undefined,
            scheduledNotificationIds: [],
          };
        }
        return evt;
      })
    );

    if (hasChanges) {
      await saveAllSpecialEvents(updatedEvents);
    }
  } catch (err) {
    console.warn('[SpecialEvents] Error syncing event notifications:', err);
  }
};

/**
 * Checks for events occurring Today or within the advance window,
 * and pushes an in-app notification to the notifications inbox if not already added.
 */
export const checkAndCreateInAppEventAlerts = async (): Promise<void> => {
  try {
    const events = await getStoredSpecialEvents();
    const existingNotifications = useNotificationStore.getState().notifications;
    const todayStr = getTodayDateString();

    for (const evt of events) {
      if (!evt.enabled) continue;

      const countdown = getEventCountdownLabel(evt);
      const isAdvance = evt.reminderAdvance !== 'at_time';
      const triggerDate = getNotificationTriggerDate(evt);
      const now = new Date();

      // Check if trigger time is reached or event is today
      const isToday = countdown.isToday;
      const isDue = Math.abs(triggerDate.getTime() - now.getTime()) <= 3600 * 1000 * 12; // Within 12h window

      if (isToday || isDue) {
        const notifUniqueId = `notif_event_${evt.id}_${todayStr}`;
        const alreadyExists = existingNotifications.some((n) => n.id === notifUniqueId);

        if (!alreadyExists) {
          const { title, body } = buildEventNotificationContent(evt, !isToday && isAdvance);
          const meta = EVENT_TYPE_METAS[evt.type] || EVENT_TYPE_METAS.occasion;

          useNotificationStore.setState((s) => ({
            notifications: [
              {
                id: notifUniqueId,
                title,
                message: body,
                category: evt.type,
                icon: meta.icon,
                color: meta.color,
                time: 'Just now',
                read: false,
              },
              ...s.notifications,
            ],
          }));
        }
      }
    }
  } catch (err) {
    console.warn('[SpecialEvents] Error checking in-app alerts:', err);
  }
};

/**
 * Fires an instant test notification so the user can experience the alert preview
 */
export const triggerInstantTestNotification = async (event: SpecialEvent): Promise<void> => {
  try {
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }

    const meta = EVENT_TYPE_METAS[event.type] || EVENT_TYPE_METAS.occasion;
    const { title, body } = buildEventNotificationContent(event, false);

    // Schedule local notification in 1 second
    await scheduleLocalNotification(title, body, 1);

    // Also inject into in-app notification inbox
    const testNotifId = `test_event_${Date.now()}`;
    useNotificationStore.setState((s) => ({
      notifications: [
        {
          id: testNotifId,
          title: `[Test] ${title}`,
          message: body,
          category: event.type,
          icon: meta.icon,
          color: meta.color,
          time: 'Just now',
          read: false,
        },
        ...s.notifications,
      ],
    }));
  } catch (err) {
    console.warn('[SpecialEvents] Test notification failed:', err);
  }
};

/**
 * Builds the simulated SMS message text that will be sent to the user's phone
 */
export const buildSmsPreviewMessage = (
  event: SpecialEvent,
  smsIndex = 1,
  totalSms?: number
): string => {
  const meta = EVENT_TYPE_METAS[event.type] || EVENT_TYPE_METAS.occasion;
  const actualTotal = totalSms ?? (event.smsFrequencyCount || 1);
  const countTag = actualTotal > 1 ? ` (SMS ${smsIndex}/${actualTotal})` : '';

  switch (event.type) {
    case 'birthday':
      return `[SelfTrack Alert] ${meta.emoji}${countTag} Reminder: ${event.title} is coming up! Celebrate and wish them a wonderful day. ${event.notes ? `(${event.notes})` : ''}`.trim();
    case 'anniversary':
      return `[SelfTrack Alert] ${meta.emoji}${countTag} Milestone Reminder: ${event.title} is today at ${event.time}! Cherish the memories.`.trim();
    case 'meeting':
      return `[SelfTrack Alert] ${meta.emoji}${countTag} Meeting Reminder: ${event.title} starts at ${event.time}. ${event.locationOrLink ? `Join: ${event.locationOrLink}` : ''}`.trim();
    case 'occasion':
    default:
      return `[SelfTrack Alert] ${meta.emoji}${countTag} Special Occasion: ${event.title} on ${event.date} at ${event.time}. Enjoy the celebration!`.trim();
  }
};

/**
 * Fires a simulated SMS test alert to the phone number and in-app feed
 */
export const triggerInstantTestSms = async (event: SpecialEvent): Promise<boolean> => {
  try {
    if (Platform.OS !== 'web' && Haptics?.notificationAsync) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    const phone = event.smsPhoneNumber || 'Your Phone';
    const totalCount = event.smsFrequencyCount || 1;
    const smsBody = buildSmsPreviewMessage(event, 1, totalCount);

    // Schedule local notification with SMS styling
    const notifTitle = `💬 SMS Delivered (1/${totalCount}): ${event.title}`;
    const notifBody = `Delivered to ${phone}: "${smsBody}"`;
    await scheduleLocalNotification(notifTitle, notifBody, 1);

    // In-app log
    const testSmsId = `sms_log_${Date.now()}`;
    useNotificationStore.setState((s) => ({
      notifications: [
        {
          id: testSmsId,
          title: `💬 SMS Alert Sent (${phone})`,
          message: smsBody,
          category: 'sms',
          icon: 'message-square',
          color: '#10B981',
          time: 'Just now',
          read: false,
        },
        ...s.notifications,
      ],
    }));
    return true;
  } catch (err) {
    console.warn('[SpecialEvents] Test SMS failed:', err);
    return false;
  }
};

/**
 * Simulates the 2x automated phone alert cycle:
 * Alert 1: Advance Heads-up Reminder
 * Alert 2: Day-of Event Celebration Alert
 * Delivered automatically to the device without requiring any phone number.
 */
export const triggerAutomatedTestAlertCycle = async (
  event: SpecialEvent,
  options?: { skipDelay?: boolean }
): Promise<void> => {
  try {
    if (Platform.OS !== 'web' && Haptics?.notificationAsync) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    const { title: advTitle, body: advBody } = buildEventNotificationContent(event, true);
    const { title: dayTitle, body: dayBody } = buildEventNotificationContent(event, false);
    const meta = EVENT_TYPE_METAS[event.type] || EVENT_TYPE_METAS.occasion;

    // Trigger local push notification for Alert 1
    await scheduleLocalNotification(`🔔 [1/2 Advance Alert] ${advTitle}`, advBody, 1);

    // Trigger Alert 2 shortly after for simulation
    if (options?.skipDelay) {
      await scheduleLocalNotification(`🎉 [2/2 Celebration Alert] ${dayTitle}`, dayBody, 1);
    } else {
      setTimeout(async () => {
        try {
          await scheduleLocalNotification(`🎉 [2/2 Celebration Alert] ${dayTitle}`, dayBody, 1);
        } catch {}
      }, 1500);
    }

    const now = Date.now();
    useNotificationStore.setState((s) => ({
      notifications: [
        {
          id: `test_adv_${now}`,
          title: `🔔 [1/2 Advance Phone Alert] ${advTitle}`,
          message: advBody,
          category: event.type,
          icon: meta.icon,
          color: '#3B82F6',
          time: 'Just now',
          read: false,
        },
        {
          id: `test_day_${now}`,
          title: `🎉 [2/2 Day-of Phone Alert] ${dayTitle}`,
          message: dayBody,
          category: event.type,
          icon: meta.icon,
          color: meta.color,
          time: 'Just now',
          read: false,
        },
        ...s.notifications,
      ],
    }));
  } catch (err) {
    console.warn('[SpecialEvents] Automated test alert failed:', err);
  }
};
