jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('mock_notif_id_123'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  setNotificationHandler: jest.fn(),
  SchedulableTriggerInputTypes: {
    DATE: 'date',
    TIME_INTERVAL: 'timeInterval',
    DAILY: 'daily',
  },
}));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle: { Medium: 'medium', Heavy: 'heavy' },
}));

import {
  getNextOccurrenceDate,
  getAdvanceOffsetMs,
  buildEventNotificationContent,
  getEventCountdownLabel,
  buildSmsPreviewMessage,
  triggerInstantTestSms,
  formatIndianPhoneNumber,
  isValidIndianMobile,
  scheduleSpecialEventNotification,
  cancelSpecialEventNotifications,
  triggerAutomatedTestAlertCycle,
} from '../specialEvents';
import { playCelebrationSound, stopCelebrationSound } from '../../utils/celebrationSound';
import { SpecialEvent } from '../../types/specialEvents';

describe('Special Events Notification Service', () => {
  const sampleBirthday: SpecialEvent = {
    id: 'evt_test_1',
    title: "Alice's Birthday",
    type: 'birthday',
    date: '1995-12-25',
    time: '09:00',
    repeat: 'yearly',
    reminderAdvance: '1_day_before',
    notes: 'Send birthday card and call early',
    sendSms: true,
    smsPhoneNumber: '+91 98765 43210',
    smsFrequencyCount: 3,
    enabled: true,
    createdAt: new Date().toISOString(),
  };

  const sampleMeeting: SpecialEvent = {
    id: 'evt_test_2',
    title: 'Product Review',
    type: 'meeting',
    date: '2026-11-15',
    time: '14:30',
    repeat: 'none',
    reminderAdvance: '15_min_before',
    locationOrLink: 'https://meet.google.com/test',
    sendSms: false,
    enabled: true,
    createdAt: new Date().toISOString(),
  };

  it('calculates the correct advance offset in milliseconds', () => {
    expect(getAdvanceOffsetMs('at_time')).toBe(0);
    expect(getAdvanceOffsetMs('15_min_before')).toBe(15 * 60 * 1000);
    expect(getAdvanceOffsetMs('1_hour_before')).toBe(60 * 60 * 1000);
    expect(getAdvanceOffsetMs('1_day_before')).toBe(24 * 60 * 60 * 1000);
    expect(getAdvanceOffsetMs('2_days_before')).toBe(48 * 60 * 60 * 1000);
  });

  it('calculates next occurrence for yearly repeating birthdays', () => {
    const nextDate = getNextOccurrenceDate(sampleBirthday);
    expect(nextDate.getMonth()).toBe(11); // December (0-indexed 11)
    expect(nextDate.getDate()).toBe(25);
    expect(nextDate.getHours()).toBe(9);
    expect(nextDate.getMinutes()).toBe(0);
    // Year must be current year or later
    expect(nextDate.getFullYear()).toBeGreaterThanOrEqual(new Date().getFullYear());
  });

  it('builds appropriate notification content for birthdays', () => {
    const advanceContent = buildEventNotificationContent(sampleBirthday, true);
    expect(advanceContent.title).toContain("Alice's Birthday");
    expect(advanceContent.title).toContain('Upcoming Birthday');
    expect(advanceContent.body).toContain('Send birthday card');

    const dayOfContent = buildEventNotificationContent(sampleBirthday, false);
    expect(dayOfContent.title).toContain('Happy Birthday!');
  });

  it('builds appropriate notification content for meetings', () => {
    const advanceContent = buildEventNotificationContent(sampleMeeting, true);
    expect(advanceContent.title).toContain('Product Review');
    expect(advanceContent.title).toContain('Upcoming Meeting');
    expect(advanceContent.body).toContain('14:30');
    expect(advanceContent.body).toContain('https://meet.google.com/test');
  });

  it('determines countdown label correctly', () => {
    const countdown = getEventCountdownLabel(sampleMeeting);
    expect(countdown).toHaveProperty('label');
    expect(typeof countdown.label).toBe('string');
    expect(countdown).toHaveProperty('isToday');
    expect(countdown).toHaveProperty('isPast');
  });

  it('builds realistic SMS message preview including frequency and notes', () => {
    const sms = buildSmsPreviewMessage(sampleBirthday);
    expect(sms).toContain("[SelfTrack Alert]");
    expect(sms).toContain("(SMS 1/3)");
    expect(sms).toContain("Alice's Birthday");
    expect(sms).toContain("Send birthday card and call early");
  });

  it('triggers test SMS and handles fallback notification', async () => {
    const result = await triggerInstantTestSms(sampleBirthday);
    expect(result).toBe(true);
  });

  it('formats Indian 10-digit mobile numbers cleanly as XXXXX XXXXX', () => {
    expect(formatIndianPhoneNumber('9876543210')).toBe('98765 43210');
    expect(formatIndianPhoneNumber('+91 9876543210')).toBe('98765 43210');
    expect(formatIndianPhoneNumber('98765 43210')).toBe('98765 43210');
  });

  it('validates standard Indian mobile numbers starting with 6, 7, 8, 9', () => {
    expect(isValidIndianMobile('9876543210')).toBe(true);
    expect(isValidIndianMobile('8123456789')).toBe(true);
    expect(isValidIndianMobile('7001234567')).toBe(true);
    expect(isValidIndianMobile('6398765432')).toBe(true);
    expect(isValidIndianMobile('+91 98765 43210')).toBe(true);
    // Invalid cases: starts with 1-5 or wrong length
    expect(isValidIndianMobile('5123456789')).toBe(false);
    expect(isValidIndianMobile('123456')).toBe(false);
  });

  it('schedules automated 2x phone alerts without needing mobile number', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const dateStr = futureDate.toISOString().split('T')[0];

    const eventWithoutPhone: SpecialEvent = {
      id: 'evt_no_phone',
      title: 'Auto Alert Test',
      type: 'birthday',
      date: dateStr,
      time: '10:00',
      repeat: 'yearly',
      reminderAdvance: '1_day_before',
      autoPhoneAlerts: true,
      alertTimesCount: 2,
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    const res = await scheduleSpecialEventNotification(eventWithoutPhone);
    expect(res).toBeDefined();
    expect(Array.isArray(res.allIds)).toBe(true);
    expect(res.allIds.length).toBeGreaterThanOrEqual(1);
  });

  it('cancels all scheduled device notification IDs on demand', async () => {
    const eventWithIds: SpecialEvent = {
      id: 'evt_cancel_test',
      title: 'Cancel Test',
      type: 'meeting',
      date: '2026-12-01',
      time: '15:00',
      repeat: 'none',
      reminderAdvance: '15_min_before',
      enabled: false,
      scheduledNotificationId: 'mock_id_1',
      scheduledNotificationIds: ['mock_id_1', 'mock_id_2'],
      createdAt: new Date().toISOString(),
    };

    await expect(cancelSpecialEventNotifications(eventWithIds)).resolves.not.toThrow();
  });

  it('triggers automated test alert cycle without error', async () => {
    await expect(triggerAutomatedTestAlertCycle(sampleBirthday, { skipDelay: true })).resolves.not.toThrow();
  });

  it('plays celebration sound and stops without error', async () => {
    await expect(playCelebrationSound()).resolves.not.toThrow();
    await expect(stopCelebrationSound()).resolves.not.toThrow();
  });
});

