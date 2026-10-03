import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export interface Comment {
  id: string;
  user: string;
  text: string;
  time: string;
}

export interface FeedPost {
  id: string;
  user_id?: string;
  user: string;
  avatar: string;
  time: string;
  content: string;
  hasImage: boolean;
  image_url?: string;
  likes: number;
  comments: number;
  commentsList?: Comment[];
  achievement?: string;
  isLiked?: boolean;
}

export interface Story {
  id: string;
  user: string;
  text: string;
  image_url?: string;
  time: string;
  expiresAt: number;
  isLiked?: boolean;
}

interface SocialState {
  posts: FeedPost[];
  stories: Story[];
  isLoading: boolean;
  fetchFeed: () => Promise<void>;
  createPost: (content: string, achievement?: string, imageUrl?: string) => Promise<FeedPost>;
  likePost: (postId: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  commentPost: (postId: string, text: string, userName: string) => Promise<void>;
  addStory: (text: string, userName: string, imageUrl?: string) => void;
  likeStory: (storyId: string) => void;
}

export const useSocialStore = create<SocialState>()(
  persist(
    (set, get) => ({
  posts: [],
  stories: [],
  isLoading: false,

  fetchFeed: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/social/feed');
      // Merge new posts without overwriting local state (which contains likes/comments)
      set((state) => {
        const existingIds = new Set(state.posts.map(p => p.id));
        const newPosts = res.data.filter((p: FeedPost) => !existingIds.has(p.id));
        return { posts: [...newPosts, ...state.posts], isLoading: false };
      });
    } catch {
      set({ isLoading: false });
    }
  },

  createPost: async (content: string, achievement?: string, imageUrl?: string) => {
    const res = await api.post('/social/posts', {
      content,
      achievement,
      image_url: imageUrl,
    });
    const newPost: FeedPost = res.data;
    set((state) => ({ posts: [newPost, ...state.posts] }));
    return newPost;
  },

  likePost: async (postId: string) => {
    // Optimistic like
    set((state) => ({
      posts: state.posts.map((p) => {
        if (p.id === postId) {
          const isCurrentlyLiked = !!p.isLiked;
          return {
            ...p,
            likes: isCurrentlyLiked ? Math.max(0, p.likes - 1) : p.likes + 1,
            isLiked: !isCurrentlyLiked,
          };
        }
        return p;
      }),
    }));

    try {
      await api.post(`/social/posts/${postId}/like`);
    } catch {
      // Keep optimistic
    }
  },

  deletePost: async (postId: string) => {
    // Optimistic delete
    set((state) => ({
      posts: state.posts.filter((p) => p.id !== postId),
    }));
    try {
      await api.delete(`/social/posts/${postId}`);
    } catch {
      // Rollback is tricky without full state, usually we re-fetch
      get().fetchFeed();
    }
  },

  commentPost: async (postId: string, text: string, userName: string) => {
    // Simulate comment addition
    const newComment: Comment = {
      id: Math.random().toString(),
      user: userName,
      text,
      time: 'Just now'
    };
    set((state) => ({
      posts: state.posts.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            comments: p.comments + 1,
            commentsList: [...(p.commentsList || []), newComment],
          };
        }
        return p;
      }),
    }));
  },
  addStory: (text: string, userName: string, imageUrl?: string) => {
    const newStory: Story = {
      id: Math.random().toString(),
      user: userName,
      text,
      image_url: imageUrl,
      time: 'Just now',
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
    set((state) => ({ stories: [newStory, ...state.stories] }));
  },
  likeStory: (storyId: string) => {
    set((state) => ({
      stories: state.stories.map(s => 
        s.id === storyId ? { ...s, isLiked: !s.isLiked } : s
      )
    }));
  }
    }),
    {
      name: 'social-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
