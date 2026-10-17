export type SpecialEventType = 'birthday' | 'anniversary' | 'meeting' | 'occasion';

export type EventRecurrence = 'none' | 'yearly' | 'monthly' | 'weekly';

export type EventReminderAdvance =
  | 'at_time'
  | '15_min_before'
  | '1_hour_before'
  | '1_day_before'
  | '2_days_before';

export interface SpecialEvent {
  id: string;
  title: string;
  type: SpecialEventType;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm (24-hour e.g. "09:00" or "18:30")
  repeat: EventRecurrence;
  reminderAdvance: EventReminderAdvance;
  notes?: string;
  locationOrLink?: string;
  enabled: boolean;
  color?: string;
  icon?: string;
  sendSms?: boolean;
  smsPhoneNumber?: string;
  smsFrequencyCount?: number; // Kept for backward compatibility
  autoPhoneAlerts?: boolean; // Automatic 2x alerts to phone (same as health notifications)
  alertTimesCount?: number;  // 2 times automated phone alerts
  scheduledNotificationId?: string;
  scheduledNotificationIds?: string[]; // IDs for the 2 scheduled phone alerts (Advance + Day-Of)
  createdAt: string;
}

export interface EventTypeMeta {
  type: SpecialEventType;
  label: string;
  emoji: string;
  icon: string;
  color: string;
  bgLight: string;
  defaultRepeat: EventRecurrence;
  defaultAdvance: EventReminderAdvance;
  placeholder: string;
  sampleDescription: string;
}

export const EVENT_TYPE_METAS: Record<SpecialEventType, EventTypeMeta> = {
  birthday: {
    type: 'birthday',
    label: 'Birthday',
    emoji: '🎂',
    icon: 'gift',
    color: '#EC4899', // Pink
    bgLight: '#FDF2F8',
    defaultRepeat: 'yearly',
    defaultAdvance: '1_day_before',
    placeholder: "e.g. Mom's Birthday, Alex's 25th",
    sampleDescription: 'Send heartfelt wishes, gifts, or plan a party',
  },
  anniversary: {
    type: 'anniversary',
    label: 'Anniversary',
    emoji: '💍',
    icon: 'heart',
    color: '#E11D48', // Rose / Ruby
    bgLight: '#FFF1F2',
    defaultRepeat: 'yearly',
    defaultAdvance: '1_day_before',
    placeholder: "e.g. Wedding Anniversary, 3rd Work Anniversary",
    sampleDescription: 'Celebrate milestones and shared achievements',
  },
  meeting: {
    type: 'meeting',
    label: 'Meeting',
    emoji: '💼',
    icon: 'briefcase',
    color: '#2563EB', // Blue
    bgLight: '#EFF6FF',
    defaultRepeat: 'none',
    defaultAdvance: '15_min_before',
    placeholder: "e.g. Q4 Sprint Planning, 1-on-1 with Lead",
    sampleDescription: 'Synchronize discussions, agendas, and interviews',
  },
  occasion: {
    type: 'occasion',
    label: 'Special Occasion',
    emoji: '🎉',
    icon: 'star',
    color: '#8B5CF6', // Purple
    bgLight: '#F5F3FF',
    defaultRepeat: 'none',
    defaultAdvance: '1_day_before',
    placeholder: "e.g. Graduation Gala, Housewarming Party",
    sampleDescription: 'Notable dates, festivals, celebrations, and appointments',
  },
};

export const ADVANCE_NOTICE_LABELS: Record<EventReminderAdvance, string> = {
  at_time: 'At event time',
  '15_min_before': '15 minutes before',
  '1_hour_before': '1 hour before',
  '1_day_before': '1 day before',
  '2_days_before': '2 days before',
};

export const RECURRENCE_LABELS: Record<EventRecurrence, string> = {
  none: 'Once (No repeat)',
  yearly: 'Every Year',
  monthly: 'Every Month',
  weekly: 'Every Week',
};
