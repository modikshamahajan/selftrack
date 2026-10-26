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
  user_avatar?: string;
  text: string;
  image_url?: string;
  time: string;
  expiresAt: number;
  isLiked?: boolean;
}

export const isTestOrMockPost = (p: any): boolean => {
  if (!p) return true;
  const user = (p.user || '').toLowerCase().trim();
  const content = (p.content || '').toLowerCase();
  const id = String(p.id || '');
  if (['post_1', 'post_2'].includes(id)) return true;
  if (id.startsWith('post_sample_') || id.startsWith('mock_')) return true;
  if (['alex hero', 'e2e tester', 'e2e two', 'maya lin', 'alex rivera'].includes(user)) return true;
  if (
    content.includes('hit 7,500 steps already today! #selftrack') ||
    content.includes('e2e post #test') ||
    content.includes('e2e like target')
  ) {
    return true;
  }
  return false;
};

interface SocialState {
  posts: FeedPost[];
  stories: Story[];
  isLoading: boolean;
  fetchFeed: () => Promise<void>;
  createPost: (content: string, achievement?: string, imageUrl?: string) => Promise<FeedPost>;
  likePost: (postId: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  commentPost: (postId: string, text: string, userName: string) => Promise<void>;
  addStory: (text: string, userName: string, imageUrl?: string, userAvatar?: string) => void;
  likeStory: (storyId: string) => void;
  deleteStory: (storyId: string) => void;
  resetSocialState: () => void;
}

export const useSocialStore = create<SocialState>()(
  persist(
    (set, get) => ({
  posts: [],
  stories: [],
  isLoading: false,

  resetSocialState: () => {
    set({ posts: [], stories: [], isLoading: false });
  },

  fetchFeed: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/social/feed');
      if (Array.isArray(res.data)) {
        set((state) => {
          // Map backend posts, filtering out any test/mock posts
          const backendPosts: FeedPost[] = res.data
            .filter((p: any) => !isTestOrMockPost(p))
            .map((p: any) => ({
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

          // Keep any purely local unsynced posts, filtering out any legacy static/mock posts
          const localOnly = state.posts.filter(
            (p) =>
              !isTestOrMockPost(p) &&
              p.id.startsWith('post_') &&
              !backendPosts.some((bp) => bp.id === p.id)
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
    let wasLiked = false;
    // Optimistic like
    set((state) => ({
      posts: state.posts.map((p) => {
        if (p.id === postId) {
          wasLiked = !!p.isLiked;
          const isCurrentlyLiked = wasLiked;
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
      await api.post(`/social/posts/${postId}/like`, { action: wasLiked ? 'unlike' : 'like' });
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
  addStory: (text: string, userName: string, imageUrl?: string, userAvatar?: string) => {
    const newStory: Story = {
      id: 'story_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      user: userName,
      user_avatar: userAvatar,
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
      version: 3,
      migrate: (persistedState: any) => {
        if (persistedState) {
          if (Array.isArray(persistedState.posts)) {
            persistedState.posts = persistedState.posts.filter(
              (p: any) => !isTestOrMockPost(p)
            );
          }
          if (Array.isArray(persistedState.stories)) {
            persistedState.stories = persistedState.stories.filter(
              (s: any) => s && s.expiresAt && s.expiresAt > Date.now()
            );
          }
        }
        return persistedState;
      },
    }
  )
);
