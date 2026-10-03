import { create } from 'zustand';
import api from '../services/api';
import { useAuthStore } from './useAuthStore';

export interface JournalItem {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: string;
  mood_score: number;
  images: string[];
  has_voice: boolean;
  voice_url?: string;
  created_at?: string;
}

interface JournalState {
  entries: JournalItem[];
  isLoading: boolean;
  fetchEntries: (date?: string) => Promise<void>;
  addEntry: (entry: { title: string; content: string; mood?: string; mood_score?: number; images?: string[]; has_voice?: boolean; date?: string }) => Promise<JournalItem>;
  deleteEntry: (id: string) => Promise<void>;
}

export const useJournalStore = create<JournalState>((set) => ({
  entries: [],
  isLoading: false,

  fetchEntries: async (date) => {
    set({ isLoading: true });
    try {
      const url = date ? `/journals?date=${date}` : '/journals';
      const res = await api.get(url);
      set({ entries: res.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addEntry: async (entry) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/journals', entry);
      const newEntry = res.data;
      set((state) => ({
        entries: [newEntry, ...state.entries],
        isLoading: false,
      }));
      // Award XP in auth store (+30 XP)
      const authUser = useAuthStore.getState().user;
      if (authUser) {
        useAuthStore.getState().updateUserXp(authUser.total_xp + 30);
      }
      return newEntry;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  deleteEntry: async (id) => {
    try {
      await api.delete(`/journals/${id}`);
      set((state) => ({
        entries: state.entries.filter((e) => e.id !== id),
      }));
    } catch (err) {
      throw err;
    }
  },
}));
