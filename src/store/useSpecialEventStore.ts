import { create } from 'zustand';
import {
  SpecialEvent,
  SpecialEventType,
  EVENT_TYPE_METAS,
} from '../types/specialEvents';
import {
  getStoredSpecialEvents,
  saveAllSpecialEvents,
  scheduleSpecialEventNotification,
  triggerInstantTestNotification,
  cancelSpecialEventNotifications,
  triggerAutomatedTestAlertCycle,
  getNextOccurrenceDate,
} from '../services/specialEvents';

interface SpecialEventState {
  events: SpecialEvent[];
  isLoading: boolean;
  selectedFilter: SpecialEventType | 'all';

  loadEvents: () => Promise<void>;
  addEvent: (eventData: Omit<SpecialEvent, 'id' | 'createdAt'>) => Promise<SpecialEvent>;
  updateEvent: (id: string, updates: Partial<SpecialEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  toggleEvent: (id: string) => Promise<void>;
  triggerTestNotification: (event: SpecialEvent) => Promise<void>;
  triggerTestSms: (event: SpecialEvent) => Promise<void>;
  setSelectedFilter: (filter: SpecialEventType | 'all') => void;
  getFilteredEvents: () => SpecialEvent[];
  getStats: () => {
    total: number;
    birthdays: number;
    anniversaries: number;
    meetings: number;
    occasions: number;
    upcomingNext7Days: number;
  };
}

export const useSpecialEventStore = create<SpecialEventState>((set, get) => ({
  events: [],
  isLoading: false,
  selectedFilter: 'all',

  loadEvents: async () => {
    set({ isLoading: true });
    try {
      const items = await getStoredSpecialEvents();
      set({ events: items, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addEvent: async (eventData) => {
    const meta = EVENT_TYPE_METAS[eventData.type] || EVENT_TYPE_METAS.occasion;
    const newEvent: SpecialEvent = {
      ...eventData,
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      autoPhoneAlerts: eventData.autoPhoneAlerts ?? true,
      alertTimesCount: eventData.alertTimesCount ?? 2,
      color: eventData.color || meta.color,
      icon: eventData.icon || meta.icon,
      createdAt: new Date().toISOString(),
    };

    // Schedule 2x automated phone notifications if enabled
    if (newEvent.enabled) {
      const res = await scheduleSpecialEventNotification(newEvent);
      newEvent.scheduledNotificationId = res.primaryId;
      newEvent.scheduledNotificationIds = res.allIds;
    }

    const updated = [newEvent, ...get().events];
    set({ events: updated });
    await saveAllSpecialEvents(updated);
    return newEvent;
  },

  updateEvent: async (id, updates) => {
    const current = get().events;
    const index = current.findIndex((e) => e.id === id);
    if (index === -1) return;

    let target = { ...current[index], ...updates };

    // Reschedule 2x automated notifications
    if (target.enabled) {
      const res = await scheduleSpecialEventNotification(target);
      target.scheduledNotificationId = res.primaryId;
      target.scheduledNotificationIds = res.allIds;
    } else {
      await cancelSpecialEventNotifications(target);
      target.scheduledNotificationId = undefined;
      target.scheduledNotificationIds = [];
    }

    const updated = [...current];
    updated[index] = target;
    set({ events: updated });
    await saveAllSpecialEvents(updated);
  },

  deleteEvent: async (id) => {
    const current = get().events;
    const target = current.find((e) => e.id === id);
    if (target) {
      await cancelSpecialEventNotifications(target);
    }

    const updated = current.filter((e) => e.id !== id);
    set({ events: updated });
    await saveAllSpecialEvents(updated);
  },

  toggleEvent: async (id) => {
    const current = get().events;
    const target = current.find((e) => e.id === id);
    if (!target) return;

    const nextEnabled = !target.enabled;
    let nextScheduledId = target.scheduledNotificationId;
    let nextScheduledIds = target.scheduledNotificationIds || [];

    if (nextEnabled) {
      const res = await scheduleSpecialEventNotification({ ...target, enabled: true });
      nextScheduledId = res.primaryId;
      nextScheduledIds = res.allIds;
    } else {
      await cancelSpecialEventNotifications(target);
      nextScheduledId = undefined;
      nextScheduledIds = [];
    }

    const updated = current.map((e) =>
      e.id === id
        ? {
            ...e,
            enabled: nextEnabled,
            scheduledNotificationId: nextScheduledId,
            scheduledNotificationIds: nextScheduledIds,
          }
        : e
    );

    set({ events: updated });
    await saveAllSpecialEvents(updated);
  },

  triggerTestNotification: async (event) => {
    await triggerInstantTestNotification(event);
  },

  triggerTestSms: async (event) => {
    await triggerAutomatedTestAlertCycle(event);
  },

  setSelectedFilter: (filter) => {
    set({ selectedFilter: filter });
  },

  getFilteredEvents: () => {
    const { events, selectedFilter } = get();
    let list = events;
    if (selectedFilter !== 'all') {
      list = events.filter((e) => e.type === selectedFilter);
    }
    // Sort by next occurrence date
    return [...list].sort((a, b) => {
      const dateA = getNextOccurrenceDate(a).getTime();
      const dateB = getNextOccurrenceDate(b).getTime();
      return dateA - dateB;
    });
  },

  getStats: () => {
    const events = get().events;
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let birthdays = 0;
    let anniversaries = 0;
    let meetings = 0;
    let occasions = 0;
    let upcomingNext7Days = 0;

    for (const evt of events) {
      if (evt.type === 'birthday') birthdays++;
      else if (evt.type === 'anniversary') anniversaries++;
      else if (evt.type === 'meeting') meetings++;
      else if (evt.type === 'occasion') occasions++;

      if (evt.enabled) {
        const nextDate = getNextOccurrenceDate(evt);
        if (nextDate.getTime() >= now.getTime() - 3600 * 1000 * 24 && nextDate.getTime() <= sevenDaysLater.getTime()) {
          upcomingNext7Days++;
        }
      }
    }

    return {
      total: events.length,
      birthdays,
      anniversaries,
      meetings,
      occasions,
      upcomingNext7Days,
    };
  },
}));
