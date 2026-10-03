import { create } from 'zustand';
import api from '../services/api';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: string;
  icon: string;
  color: string;
  time: string;
  read: boolean;
}

interface NotificationState {
  notifications: AppNotification[];
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/notifications');
      set({ notifications: res.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {
      // Keep optimistic
    }
  },

  markAllAsRead: async () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
    try {
      await api.post('/notifications/mark-all-read');
    } catch {
      // Keep optimistic
    }
  },
}));
