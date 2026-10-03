import { create } from 'zustand';
import api, { updateApiBaseUrl } from '../services/api';

export interface AppSettings {
  ai_mode: string;
  ai_model_name: string;
  ollama_endpoint: string;
  custom_api_key: string;
  ai_suggestions: boolean;
  daily_summary: boolean;
  ai_personality: string;
  push_notifications: boolean;
  sound_effects: boolean;
  haptic_feedback: boolean;
  dark_mode: boolean;
  auto_sync: boolean;
  large_text: boolean;
  high_contrast: boolean;
  reduce_motion: boolean;
  biometrics_enabled: boolean;
  pin_lock: boolean;
  auto_lock: boolean;
  privacy_private_journal: boolean;
  privacy_hide_leaderboard: boolean;
}

const defaultSettings: AppSettings = {
  ai_mode: 'local_ollama',
  ai_model_name: 'llama3.2:1b',
  ollama_endpoint: 'http://10.0.2.2:11434',
  custom_api_key: '',
  ai_suggestions: true,
  daily_summary: true,
  ai_personality: 'Friendly',
  push_notifications: true,
  sound_effects: true,
  haptic_feedback: true,
  dark_mode: false,
  auto_sync: true,
  large_text: false,
  high_contrast: false,
  reduce_motion: false,
  biometrics_enabled: true,
  pin_lock: false,
  auto_lock: true,
  privacy_private_journal: true,
  privacy_hide_leaderboard: false,
};

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  updateMultipleSettings: (updates: Partial<AppSettings>) => Promise<void>;
  setCustomApiUrl: (url: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/users/settings');
      set({ settings: { ...defaultSettings, ...res.data }, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  updateSetting: async (key, value) => {
    // Optimistic
    set((state) => ({
      settings: { ...state.settings, [key]: value },
    }));
    try {
      await api.put('/users/settings', { [key]: value });
    } catch {
      // Keep optimistic
    }
  },

  updateMultipleSettings: async (updates) => {
    set((state) => ({
      settings: { ...state.settings, ...updates },
    }));
    try {
      const res = await api.put('/users/settings', updates);
      set({ settings: { ...get().settings, ...res.data } });
    } catch {
      // Keep state
    }
  },

  setCustomApiUrl: async (url: string) => {
    await updateApiBaseUrl(url);
  },
}));
