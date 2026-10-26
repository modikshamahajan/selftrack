import { create } from 'zustand';
import api from '../services/api';
import { useAuthStore } from './useAuthStore';

export interface RewardSummary {
  total_xp: number;
  level: number;
  current_level_xp: number;
  next_level_xp: number;
  streak_count: number;
  badges_count: number;
}

export interface BadgeItem {
  id: number;
  slug: string;
  title: string;
  description: string;
  image_name: string;
  xp_reward: number;
  is_unlocked: boolean;
  unlocked_at?: string;
}

export interface LeaderboardItem {
  rank: number;
  name: string;
  xp: string;
  avatar: string;
  bg: string;
}

interface RewardsState {
  summary: RewardSummary | null;
  badges: BadgeItem[];
  leaderboard: LeaderboardItem[];
  isLoading: boolean;
  fetchRewards: () => Promise<void>;
  resetRewardsState: () => void;
}

export const DEFAULT_SUMMARY: RewardSummary = {
  total_xp: 0,
  level: 1,
  current_level_xp: 0,
  next_level_xp: 1000,
  streak_count: 0,
  badges_count: 0,
};

export const DEFAULT_BADGES: BadgeItem[] = [
  {
    id: 1,
    slug: 'first-step',
    title: 'First Step',
    description: 'Complete your first habit check-in.',
    image_name: 'goldstar.png',
    xp_reward: 50,
    is_unlocked: false,
  },
  {
    id: 2,
    slug: 'hydration-hero',
    title: 'Hydration Hero',
    description: 'Log 8 glasses of water in a single day.',
    image_name: 'waterdropicon.png',
    xp_reward: 100,
    is_unlocked: false,
  },
  {
    id: 3,
    slug: 'streak-master',
    title: '7-Day Master',
    description: 'Maintain a 7-day habit streak.',
    image_name: 'firebadge.png',
    xp_reward: 200,
    is_unlocked: false,
  },
  {
    id: 4,
    slug: 'champion',
    title: 'Champion',
    description: 'Reach Level 5 and collect 5000 XP.',
    image_name: 'trophyicon.png',
    xp_reward: 500,
    is_unlocked: false,
  },
];

export const DEFAULT_LEADERBOARD: LeaderboardItem[] = [
  { rank: 1, name: 'Aria Stark', xp: '4,250 XP', avatar: '', bg: '#FDF2E9' },
  { rank: 2, name: 'David Miller', xp: '3,800 XP', avatar: '', bg: '#EBF5FB' },
  { rank: 3, name: 'Elena Rostova', xp: '2,950 XP', avatar: '', bg: '#EAFAF1' },
  { rank: 4, name: 'You (Explorer)', xp: '0 XP', avatar: '', bg: '#FEF9E7' },
];

export const useRewardsStore = create<RewardsState>((set) => ({
  summary: DEFAULT_SUMMARY,
  badges: DEFAULT_BADGES,
  leaderboard: DEFAULT_LEADERBOARD,
  isLoading: false,

  resetRewardsState: () => {
    set({
      summary: DEFAULT_SUMMARY,
      badges: DEFAULT_BADGES,
      leaderboard: DEFAULT_LEADERBOARD,
      isLoading: false,
    });
  },

  fetchRewards: async () => {
    set({ isLoading: true });

    // Sync with auth user XP if available
    const authUser = useAuthStore.getState().user;
    if (authUser) {
      set((state) => ({
        summary: state.summary
          ? {
              ...state.summary,
              total_xp: authUser.total_xp,
              level: authUser.level,
              current_level_xp: authUser.total_xp % 1000,
              streak_count: authUser.streak_count,
            }
          : DEFAULT_SUMMARY,
      }));
    }

    try {
      const [sumRes, badgesRes, leadRes] = await Promise.all([
        api.get('/rewards/summary'),
        api.get('/rewards/badges'),
        api.get('/rewards/leaderboard'),
      ]);
      set({
        summary: sumRes.data,
        badges: badgesRes.data,
        leaderboard: leadRes.data,
        isLoading: false,
      });
    } catch {
      // Offline fallback: keep local data
      set({ isLoading: false });
    }
  },
}));
