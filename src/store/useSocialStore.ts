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
  posts: [
    {
      id: 'post_1',
      user: 'Maya Lin',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      time: '2h ago',
      content: 'Just completed a 7-day hydration streak! 💧 Feeling so much more energetic throughout the day.',
      hasImage: false,
      likes: 12,
      comments: 3,
      commentsList: [
        { id: 'c1', user: 'Liam Chen', text: 'Incredible discipline! Keep it up 🙌', time: '1h ago' },
        { id: 'c2', user: 'Sofia Patel', text: 'Hydration makes such a huge difference! 💧', time: '45m ago' },
        { id: 'c3', user: 'Alex Rivera', text: 'Great achievement Maya!', time: '20m ago' },
      ],
      achievement: 'Hydration Hero 🏆',
      isLiked: false,
    },
    {
      id: 'post_2',
      user: 'Alex Rivera',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      time: '5h ago',
      content: 'Hit 12,000 steps today on the morning trail! Consistency is everything. 🏃‍♂️👟',
      hasImage: false,
      likes: 24,
      comments: 2,
      commentsList: [
        { id: 'c4', user: 'Maya Lin', text: 'Awesome trail walk Alex! 🏃‍♂️', time: '3h ago' },
        { id: 'c5', user: 'David Miller', text: 'Crushing the step goals!', time: '1h ago' },
      ],
      achievement: '10k Steps Master ⭐',
      isLiked: true,
    },
  ],
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
    const localPost: FeedPost = {
      id: 'post_' + Date.now(),
      user: 'You (Explorer)',
      avatar: '',
      time: 'Just now',
      content,
      hasImage: !!imageUrl,
      image_url: imageUrl,
      likes: 0,
      comments: 0,
      achievement,
      isLiked: false,
    };

    set((state) => ({ posts: [localPost, ...state.posts] }));

    try {
      const res = await api.post('/social/posts', {
        content,
        achievement,
        image_url: imageUrl,
      });
      if (res.data?.id) {
        set((state) => ({
          posts: state.posts.map((p) => (p.id === localPost.id ? res.data : p)),
        }));
        return res.data;
      }
    } catch (e) {
      // Offline fallback: local post is retained
    }

    return localPost;
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
      id: 'comment_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      user: userName,
      text,
      time: 'Just now'
    };
    set((state) => ({
      posts: state.posts.map((p) => {
        if (p.id === postId) {
          const updatedList = [...(p.commentsList || []), newComment];
          return {
            ...p,
            comments: updatedList.length,
            commentsList: updatedList,
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
