import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { useAuthStore } from './useAuthStore';

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
  deleteStory: (storyId: string) => void;
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
      if (Array.isArray(res.data)) {
        set((state) => {
          // Map backend posts and ensure comment count is strictly accurate
          const backendPosts: FeedPost[] = res.data.map((p: any) => ({
            id: p.id,
            user_id: p.user_id,
            user: p.user,
            avatar: p.avatar,
            time: p.time,
            content: p.content,
            hasImage: p.hasImage,
            image_url: p.image_url,
            likes: p.likes,
            comments: Array.isArray(p.commentsList) ? p.commentsList.length : (p.comments || 0),
            commentsList: p.commentsList || [],
            achievement: p.achievement,
            isLiked: p.isLiked || false,
          }));

          // Keep any purely local unsynced posts
          const localOnly = state.posts.filter(
            (p) => p.id.startsWith('post_') && !backendPosts.some((bp) => bp.id === p.id)
          );

          return { posts: [...localOnly, ...backendPosts], isLoading: false };
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  createPost: async (content: string, achievement?: string, imageUrl?: string) => {
    const authUser = useAuthStore.getState().user;
    const authorName = authUser?.name || 'Explorer';
    const localPost: FeedPost = {
      id: 'post_' + Date.now(),
      user: authorName,
      avatar: authUser?.avatar_url || '',
      time: 'Just now',
      content,
      hasImage: !!imageUrl,
      image_url: imageUrl,
      likes: 0,
      comments: 0,
      commentsList: [],
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
          posts: state.posts.map((p) => (p.id === localPost.id ? { ...res.data, comments: 0, commentsList: [] } : p)),
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
      get().fetchFeed();
    }
  },

  commentPost: async (postId: string, text: string, userName: string) => {
    const tempCommentId = 'comment_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newComment: Comment = {
      id: tempCommentId,
      user: userName,
      text,
      time: 'Just now'
    };

    // Optimistic comment addition: ensure count equals updatedList.length (exactly 1 for first comment)
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

    try {
      const res = await api.post(`/social/posts/${postId}/comments`, { text });
      if (res.data?.id) {
        set((state) => ({
          posts: state.posts.map((p) => {
            if (p.id === postId) {
              const updatedList = (p.commentsList || []).map((c) =>
                c.id === tempCommentId ? { ...c, id: res.data.id, time: res.data.time || c.time } : c
              );
              return {
                ...p,
                comments: updatedList.length,
                commentsList: updatedList,
              };
            }
            return p;
          }),
        }));
      }
    } catch {
      // Retain optimistic comment locally
    }
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
  },
  deleteStory: (storyId: string) => {
    set((state) => ({
      stories: state.stories.filter((s) => s.id !== storyId),
    }));
  }
    }),
    {
      name: 'social-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
