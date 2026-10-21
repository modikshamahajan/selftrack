import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  tags?: string[];
  created_at?: string;
}

export const formatLocalDate = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface JournalState {
  entries: JournalItem[];
  isLoading: boolean;
  fetchEntries: (date?: string) => Promise<void>;
  addEntry: (entry: { title: string; content: string; mood?: string; mood_score?: number; images?: string[]; has_voice?: boolean; tags?: string[]; date?: string }) => Promise<JournalItem>;
  updateEntry: (id: string, updates: Partial<JournalItem>) => Promise<JournalItem | undefined>;
  deleteEntry: (id: string) => Promise<void>;
  clearAllEntries: () => Promise<void>;
}

const STORAGE_KEY = 'selftrack_journals';

const DEFAULT_JOURNALS: JournalItem[] = [];

const saveToStorage = async (entries: JournalItem[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {}
};

export const useJournalStore = create<JournalState>((set, get) => ({
  entries: DEFAULT_JOURNALS,
  isLoading: false,

  fetchEntries: async (date) => {
    set({ isLoading: true });

    // Load from local storage first
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const filtered = Array.isArray(parsed) ? parsed.filter((e: any) => e && e.id !== 'journal_1') : [];
        set({ entries: filtered });
        if (Array.isArray(parsed) && parsed.length !== filtered.length) {
          await saveToStorage(filtered);
        }
      } else {
        await saveToStorage(DEFAULT_JOURNALS);
      }
    } catch (e) {}

    // Try API
    try {
      const url = date ? `/journals?date=${date}` : '/journals';
      const res = await api.get(url);
      if (Array.isArray(res.data) && res.data.length > 0) {
        set({ entries: res.data, isLoading: false });
        await saveToStorage(res.data);
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  clearAllEntries: async () => {
    set({ entries: [] });
    await saveToStorage([]);
  },

  addEntry: async (entry) => {
    set({ isLoading: true });

    const localId = 'journal_' + Date.now();
    const newEntry: JournalItem = {
      id: localId,
      date: entry.date || formatLocalDate(),
      title: entry.title || 'Journal Entry',
      content: entry.content || '',
      mood: entry.mood || 'good',
      mood_score: entry.mood_score || 4,
      images: entry.images || [],
      has_voice: entry.has_voice || false,
      tags: entry.tags || [],
      created_at: new Date().toISOString(),
    };

    const updated = [newEntry, ...get().entries];
    set({ entries: updated, isLoading: false });
    await saveToStorage(updated);

    // Award XP in auth store (+30 XP)
    const authUser = useAuthStore.getState().user;
    if (authUser) {
      useAuthStore.getState().updateUserXp(authUser.total_xp + 30);
    }

    try {
      const res = await api.post('/journals', entry);
      if (res.data?.id) {
        const synced = get().entries.map((e) => (e.id === localId ? res.data : e));
        set({ entries: synced });
        await saveToStorage(synced);
        return res.data;
      }
    } catch (err) {
      // Offline fallback: keep local entry
    }

    return newEntry;
  },

  updateEntry: async (id, updates) => {
    const updated = get().entries.map((e) => (e.id === id ? { ...e, ...updates } : e));
    set({ entries: updated });
    await saveToStorage(updated);

    try {
      const res = await api.put(`/journals/${id}`, updates);
      if (res.data?.id) {
        const synced = get().entries.map((e) => (e.id === id ? res.data : e));
        set({ entries: synced });
        await saveToStorage(synced);
        return res.data;
      }
    } catch (err) {}
    return updated.find((e) => e.id === id);
  },

  deleteEntry: async (id) => {
    const filtered = get().entries.filter((e) => e.id !== id);
    set({ entries: filtered });
    await saveToStorage(filtered);

    try {
      await api.delete(`/journals/${id}`);
    } catch (err) {}
  },
}));
