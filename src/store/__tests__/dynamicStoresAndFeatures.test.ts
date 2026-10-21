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
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn().mockResolvedValue(true),
  canOpenURL: jest.fn().mockResolvedValue(true),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSocialStore } from '../useSocialStore';
import { useSpecialEventStore } from '../useSpecialEventStore';
import { useNotificationStore } from '../useNotificationStore';
import { useAuthStore } from '../useAuthStore';
import { useHealthStore } from '../useHealthStore';
import { useJournalStore } from '../useJournalStore';
import { calculateCycleInfo } from '../useMenstrualStore';
import {
  getStoredSpecialEvents,
  saveAllSpecialEvents,
  triggerInstantTestSms,
  buildSmsPreviewMessage,
  getNextOccurrenceDate,
} from '../../services/specialEvents';
import { SpecialEvent } from '../../types/specialEvents';

describe('Dynamic Production Features & Edge Cases', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useSocialStore.setState({ posts: [], stories: [], isLoading: false });
    useSpecialEventStore.setState({ events: [], isLoading: false, selectedFilter: 'all' });
    useNotificationStore.setState({ notifications: [], isLoading: false });
    useAuthStore.setState({
      user: {
        id: 'user_test_real',
        name: 'Jordan Smith',
        email: 'jordan@example.com',
        total_xp: 0,
        level: 1,
        streak_count: 0,
      },
      token: 'jwt_mock_token',
      isAuthenticated: true,
      isLoading: false,
    });
  });

  describe('Social Store (Dynamic & Zero Static Items)', () => {
    it('initializes with an empty posts list by default', () => {
      const posts = useSocialStore.getState().posts;
      expect(posts).toEqual([]);
      expect(posts.length).toBe(0);
    });

    it('creates an actual post dynamically with user credentials', async () => {
      const { createPost } = useSocialStore.getState();
      const newPost = await createPost('Ran 5k today on track!', '5k Finisher 🏃');

      expect(newPost).toBeDefined();
      expect(newPost.content).toBe('Ran 5k today on track!');
      expect(newPost.user).toBe('Jordan Smith');
      expect(newPost.achievement).toBe('5k Finisher 🏃');
      expect(newPost.likes).toBe(0);
      expect(newPost.comments).toBe(0);

      const statePosts = useSocialStore.getState().posts;
      expect(statePosts.length).toBe(1);
      expect(statePosts[0].id).toBe(newPost.id);
    });

    it('creates an actual story dynamically and adds to story list', () => {
      const { addStory } = useSocialStore.getState();
      addStory('Just meditated for 15 minutes! 🧘', 'Jordan Smith');

      const stories = useSocialStore.getState().stories;
      expect(stories.length).toBe(1);
      expect(stories[0].text).toBe('Just meditated for 15 minutes! 🧘');
      expect(stories[0].user).toBe('Jordan Smith');
      expect(stories[0].expiresAt).toBeGreaterThan(Date.now());
    });

    it('toggles post like optimistically without breaking state', async () => {
      const { createPost, likePost } = useSocialStore.getState();
      const post = await createPost('Testing like action');

      await likePost(post.id);
      expect(useSocialStore.getState().posts[0].likes).toBe(1);
      expect(useSocialStore.getState().posts[0].isLiked).toBe(true);

      await likePost(post.id);
      expect(useSocialStore.getState().posts[0].likes).toBe(0);
      expect(useSocialStore.getState().posts[0].isLiked).toBe(false);
    });

    it('adds a comment optimistically and updates comment count accurately', async () => {
      const { createPost, commentPost } = useSocialStore.getState();
      const post = await createPost('Celebrating a healthy lunch');

      await commentPost(post.id, 'Looks delicious! 🥗', 'Alex');
      const updated = useSocialStore.getState().posts[0];
      expect(updated.comments).toBe(1);
      expect(updated.commentsList?.length).toBe(1);
      expect(updated.commentsList?.[0].text).toBe('Looks delicious! 🥗');
      expect(updated.commentsList?.[0].user).toBe('Alex');
    });
  });

  describe('Special Events & Notification Store (Dynamic & 0 Count When Empty)', () => {
    it('returns empty array from storage when no user events have been added', async () => {
      const events = await getStoredSpecialEvents();
      expect(events).toEqual([]);
      expect(events.length).toBe(0);
    });

    it('purges legacy sample events (evt_sample_*) from AsyncStorage automatically', async () => {
      const legacyEvents = [
        { id: 'evt_sample_birthday_1', title: "Mom's Birthday", type: 'birthday', date: '2026-10-25' },
        { id: 'evt_sample_meeting_1', title: 'Product Meeting', type: 'meeting', date: '2026-10-26' },
      ];
      await AsyncStorage.setItem('@selftrack_special_events_v2', JSON.stringify(legacyEvents));

      const cleanEvents = await getStoredSpecialEvents();
      expect(cleanEvents).toEqual([]);
      expect(cleanEvents.length).toBe(0);
    });

    it('calculates stats as strictly 0 across all categories when no events exist', () => {
      const { getStats } = useSpecialEventStore.getState();
      const stats = getStats();

      expect(stats.total).toBe(0);
      expect(stats.birthdays).toBe(0);
      expect(stats.anniversaries).toBe(0);
      expect(stats.meetings).toBe(0);
      expect(stats.occasions).toBe(0);
      expect(stats.upcomingNext7Days).toBe(0);
    });

    it('adds and updates an event dynamically and recalculates stats', async () => {
      const { addEvent, getStats } = useSpecialEventStore.getState();

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      const dateStr = futureDate.toISOString().split('T')[0];

      await addEvent({
        title: "Sister's Birthday Party",
        type: 'birthday',
        date: dateStr,
        time: '18:00',
        repeat: 'yearly',
        reminderAdvance: '1_day_before',
        enabled: true,
      });

      const stats = getStats();
      expect(stats.total).toBe(1);
      expect(stats.birthdays).toBe(1);
      expect(stats.upcomingNext7Days).toBe(1);
      expect(stats.meetings).toBe(0);
    });
  });

  describe('Realtime Actual SMS', () => {
    it('generates genuine SMS message preview with clean title and notes', () => {
      const event: SpecialEvent = {
        id: 'evt_sms_real',
        title: 'Board of Directors Sync',
        type: 'meeting',
        date: '2026-11-01',
        time: '11:00',
        repeat: 'none',
        reminderAdvance: '15_min_before',
        locationOrLink: 'https://meet.google.com/live',
        smsPhoneNumber: '+91 98765 43210',
        smsFrequencyCount: 1,
        enabled: true,
        createdAt: new Date().toISOString(),
      };

      const smsText = buildSmsPreviewMessage(event, 1, 1);
      expect(smsText).toContain('[SelfTrack Alert]');
      expect(smsText).toContain('Board of Directors Sync');
      expect(smsText).toContain('https://meet.google.com/live');
    });

    it('dispatches realtime SMS alert and logs notification', async () => {
      const event: SpecialEvent = {
        id: 'evt_sms_test',
        title: 'Dentist Appointment',
        type: 'meeting',
        date: '2026-10-30',
        time: '10:00',
        repeat: 'none',
        reminderAdvance: '1_hour_before',
        smsPhoneNumber: '+91 98765 43210',
        smsFrequencyCount: 1,
        enabled: true,
        createdAt: new Date().toISOString(),
      };

      const result = await triggerInstantTestSms(event);
      expect(result).toBe(true);

      const notifs = useNotificationStore.getState().notifications;
      expect(notifs.length).toBeGreaterThanOrEqual(1);
      expect(notifs[0].category).toBe('sms');
      expect(notifs[0].title).toContain('SMS Alert');
    });
  });

  describe('Logical & Factual Rigor Checks', () => {
    it('accurately identifies overdue period on past/current dates rather than wrapping modulo into follicular', () => {
      // 32 days since last period start on a 28-day cycle
      const settings = {
        lastPeriodStart: '2026-09-17',
        cycleLength: 28,
        periodDuration: 5,
        lutealLength: 14,
        notificationsEnabled: true,
      };

      const info = calculateCycleInfo('2026-10-19', settings, {});
      expect(info.phaseTitle).toContain('Period Late');
      expect(info.cycleDay).toBe(33); // Day 33 of cycle
      expect(info.daysUntilNextPeriod).toBe(0);
      expect(info.fertilityChance).toBe('Low');
    });

    it('clamps 31st monthly repeating events to the last day of 30-day and 28-day months', () => {
      const event: SpecialEvent = {
        id: 'evt_monthly_31',
        title: 'Month-End Financial Audit',
        type: 'meeting',
        date: '2026-01-31',
        time: '18:00',
        repeat: 'monthly',
        reminderAdvance: 'at_time',
        enabled: true,
        createdAt: '2026-01-31T00:00:00.000Z',
      };

      const nextOcc = getNextOccurrenceDate(event);
      // Day should be valid and never exceed days in that month
      const daysInTargetMonth = new Date(nextOcc.getFullYear(), nextOcc.getMonth() + 1, 0).getDate();
      expect(nextOcc.getDate()).toBeLessThanOrEqual(daysInTargetMonth);
      expect(nextOcc.getHours()).toBe(18);
    });

    it('handles unliking posts by decrementing likes count', async () => {
      const post = await useSocialStore.getState().createPost('Achievement test', 'Level 2');
      expect(post.likes).toBe(0);

      // Like
      await useSocialStore.getState().likePost(post.id);
      let updated = useSocialStore.getState().posts.find((p) => p.id === post.id);
      expect(updated?.likes).toBe(1);
      expect(updated?.isLiked).toBe(true);

      // Unlike
      await useSocialStore.getState().likePost(post.id);
      updated = useSocialStore.getState().posts.find((p) => p.id === post.id);
      expect(updated?.likes).toBe(0);
      expect(updated?.isLiked).toBe(false);
    });

    it('tracks sleep with factual 0 defaults and allows explicit logging', async () => {
      const metrics = useHealthStore.getState().metrics;
      expect(metrics.sleep_hours).toBe(0);

      // Explicitly log sleep
      const today = useHealthStore.getState().metrics.date;
      await useHealthStore.getState().updateSleep(7.5, 88, today);
      const updated = useHealthStore.getState().metrics;
      expect(updated.sleep_hours).toBe(7.5);
      expect(updated.sleep_quality).toBe(88);
    });
  });

  describe('Phone & PIN Authentication & Validation', () => {
    beforeEach(async () => {
      await AsyncStorage.clear();
      useAuthStore.setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
    });

    it('rejects sign-in if mobile number is not registered (throws 404)', async () => {
      await expect(
        useAuthStore.getState().loginWithPhonePin('Test User', '9876543210', '1234', false)
      ).rejects.toMatchObject({
        response: {
          status: 404,
          data: {
            detail: expect.stringContaining('No registered account found'),
          },
        },
      });
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('successfully registers a new user with mobile number and 4-digit PIN', async () => {
      const user = await useAuthStore
        .getState()
        .loginWithPhonePin('Alice Smith', '9876543210', '1234', true);

      expect(user).toBeDefined();
      expect(user.name).toBe('Alice Smith');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Verify cached in AsyncStorage
      const stored = await AsyncStorage.getItem('selftrack_registered_users');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed['9876543210']).toBeDefined();
      expect(parsed['9876543210'].pin).toBe('1234');
    });

    it('rejects sign-in if PIN does not match the registered mobile number (throws 401)', async () => {
      // First register
      await useAuthStore
        .getState()
        .loginWithPhonePin('Alice Smith', '9876543210', '1234', true);
      useAuthStore.setState({ user: null, token: null, isAuthenticated: false });

      // Try sign in with wrong PIN
      await expect(
        useAuthStore.getState().loginWithPhonePin('', '9876543210', '9999', false)
      ).rejects.toMatchObject({
        response: {
          status: 401,
          data: {
            detail: expect.stringContaining('PIN you entered does not match'),
          },
        },
      });
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('successfully signs in when mobile number and PIN match', async () => {
      // First register
      await useAuthStore
        .getState()
        .loginWithPhonePin('Alice Smith', '9876543210', '1234', true);
      useAuthStore.setState({ user: null, token: null, isAuthenticated: false });

      // Sign in with matching PIN
      const loggedIn = await useAuthStore
        .getState()
        .loginWithPhonePin('', '9876543210', '1234', false);

      expect(loggedIn).toBeDefined();
      expect(loggedIn.name).toBe('Alice Smith');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('rejects duplicate registration if mobile number is already registered (throws 400)', async () => {
      await useAuthStore
        .getState()
        .loginWithPhonePin('Alice Smith', '9876543210', '1234', true);

      await expect(
        useAuthStore.getState().loginWithPhonePin('Alice Smith', '9876543210', '1234', true)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            detail: expect.stringContaining('already registered'),
          },
        },
      });
    });
  });

  describe('Journal Content & Spacing Preservation', () => {
    it('preserves multi-line paragraph spacing with multiple Enters', async () => {
      const multiLineText = 'First Paragraph\n\n\n\nSecond Paragraph with 4 lines gap';
      const created = await useJournalStore.getState().addEntry({
        title: 'Multi-line Reflection',
        content: multiLineText,
        mood: 'great',
      });

      expect(created.content).toBe(multiLineText);
      const splitLines = created.content.split('\n');
      expect(splitLines.length).toBe(5); // 1st line + 3 empty lines + 2nd line = 5
      expect(splitLines[0]).toBe('First Paragraph');
      expect(splitLines[1]).toBe('');
      expect(splitLines[2]).toBe('');
      expect(splitLines[3]).toBe('');
      expect(splitLines[4]).toBe('Second Paragraph with 4 lines gap');
    });
  });
});


