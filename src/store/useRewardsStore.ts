import { create } from 'zustand';
import api from '../services/api';

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
}

export const useRewardsStore = create<RewardsState>((set) => ({
  summary: null,
  badges: [],
  leaderboard: [],
  isLoading: false,

  fetchRewards: async () => {
    set({ isLoading: true });
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
      set({ isLoading: false });
    }
  },
}));
