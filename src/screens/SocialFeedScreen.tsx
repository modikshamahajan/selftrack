import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Share,
  Alert,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather as Icon, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Shadow } from '../theme/spacing';
import Card from '../components/Card';
import FloatingActionButton from '../components/FloatingActionButton';
import Button from '../components/Button';
import { useSocialStore, FeedPost } from '../store/useSocialStore';
import { useAuthStore } from '../store/useAuthStore';

const { width } = Dimensions.get('window');

// Bouncy animated heart for reactions
const AnimatedHeart = ({
  isLiked,
  size = 20,
  unlikedColor = '#64748B',
}: {
  isLiked: boolean;
  size?: number;
  unlikedColor?: string;
}) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isLiked) {
      scale.value = withSequence(
        withTiming(1.35, { duration: 140 }),
        withSpring(1, { damping: 9, stiffness: 160 })
      );
    } else {
      scale.value = 1;
    }
  }, [isLiked]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons
        name={isLiked ? 'heart' : 'heart-outline'}
        size={size}
        color={isLiked ? '#EF4444' : unlikedColor}
      />
    </Animated.View>
  );
};

// Radiant avatar with multi-tone gradient frame
const PostAvatar: React.FC<{
  avatar?: string;
  colors?: readonly [string, string];
  size?: number;
}> = ({ avatar, colors = ['#8B5CF6', '#EC4899'], size = 46 }) => {
  const [hasError, setHasError] = useState(false);
  const isUrl = Boolean(
    avatar &&
      (avatar.startsWith('http://') ||
        avatar.startsWith('https://') ||
        avatar.startsWith('file://'))
  );

  return (
    <View style={[styles.avatarOuterRing, { width: size, height: size, borderRadius: size / 2 }]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.avatarGradientBorder, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <View
          style={[
            styles.avatarInnerContainer,
            { width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 },
          ]}
        >
          {isUrl && !hasError ? (
            <Image
              source={{ uri: avatar }}
              style={{ width: '100%', height: '100%', borderRadius: (size - 4) / 2 }}
              onError={() => setHasError(true)}
            />
          ) : avatar && avatar.length <= 4 ? (
            <Text style={{ fontSize: size * 0.42 }}>{avatar}</Text>
          ) : (
            <Icon name="user" size={size * 0.45} color="#6366F1" />
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

// Story Avatar with Instagram/TikTok style dual glowing ring
const StoryAvatar: React.FC<{
  avatar?: string;
  emoji?: string;
  hasUnread?: boolean;
}> = ({ avatar, emoji = '🌟', hasUnread = true }) => {
  const [hasError, setHasError] = useState(false);
  const isUrl = Boolean(
    avatar &&
      (avatar.startsWith('http://') ||
        avatar.startsWith('https://') ||
        avatar.startsWith('file://'))
  );

  const ringColors = hasUnread
    ? (['#F43F5E', '#EC4899', '#8B5CF6'] as const)
    : (['#CBD5E1', '#94A3B8'] as const);

  return (
    <LinearGradient
      colors={ringColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.storyRing}
    >
      <View style={styles.storyInnerRing}>
        {isUrl && !hasError ? (
          <Image
            source={{ uri: avatar }}
            style={styles.storyImage}
            onError={() => setHasError(true)}
          />
        ) : (
          <Text style={styles.storyEmojiText}>{emoji}</Text>
        )}
      </View>
    </LinearGradient>
  );
};

// Dynamic helper for achievement styles
const getAchievementMeta = (achievement?: string) => {
  if (!achievement) return { colors: ['#6366F1', '#8B5CF6'] as const, icon: 'award' };
  const a = achievement.toLowerCase();
  if (a.includes('hydration') || a.includes('water')) {
    return { colors: ['#0284C7', '#06B6D4'] as const, icon: 'droplet' };
  }
  if (a.includes('step') || a.includes('walk') || a.includes('run') || a.includes('trail')) {
    return { colors: ['#059669', '#10B981'] as const, icon: 'activity' };
  }
  if (a.includes('streak') || a.includes('warrior') || a.includes('fire')) {
    return { colors: ['#EA580C', '#F59E0B'] as const, icon: 'zap' };
  }
  if (a.includes('sleep') || a.includes('bed') || a.includes('night')) {
    return { colors: ['#7C3AED', '#A855F7'] as const, icon: 'moon' };
  }
  if (a.includes('diet') || a.includes('food') || a.includes('meal') || a.includes('nutrition')) {
    return { colors: ['#D97706', '#FBBF24'] as const, icon: 'coffee' };
  }
  if (a.includes('meditat') || a.includes('zen') || a.includes('mind')) {
    return { colors: ['#DB2777', '#F43F5E'] as const, icon: 'heart' };
  }
  return { colors: ['#4F46E5', '#7C3AED'] as const, icon: 'award' };
};

// Category filters
const CATEGORIES = [
  { id: 'all', label: 'All Buzz', icon: 'sparkles' },
  { id: 'milestones', label: 'Milestones 🏆', icon: 'award' },
  { id: 'hydration', label: 'Hydration 💧', icon: 'droplet' },
  { id: 'fitness', label: 'Fitness 🏃', icon: 'activity' },
  { id: 'mindset', label: 'Mindset 🧘', icon: 'heart' },
  { id: 'streaks', label: 'Streaks 🔥', icon: 'zap' },
];

const QUICK_CHEERS = [
  '👏 Amazing consistency!',
  '🔥 Keep crushing it!',
  '💧 Hydration hero!',
  '🙌 Proud of your progress!',
  '💪 Unstoppable energy!',
  '✨ Truly inspiring!',
];

const ACHIEVEMENT_SUGGESTIONS = [
  '7 Day Streak 🔥',
  '10,000 Daily Steps 🏃',
  'Hydration Goal Hit 💧',
  'Healthy Eating Win 🥗',
  'Sleep Master 🌙',
  'Morning Workout ⚡',
  'Other',
];

const SocialFeedScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const user = useAuthStore((s) => s.user);
  const {
    posts,
    stories,
    isLoading,
    fetchFeed,
    createPost,
    likePost,
    deletePost,
    commentPost,
    addStory,
    likeStory,
    deleteStory,
  } = useSocialStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [hasCheeredSquad, setHasCheeredSquad] = useState(false);
  const [squadCheerCount, setSquadCheerCount] = useState(84);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Post modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [selectedAchievement, setSelectedAchievement] = useState('');
  const [customAchievement, setCustomAchievement] = useState('');
  const [postImageUri, setPostImageUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Post options state
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);

  // Comments modal state
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Story modal state
  const [storyModalVisible, setStoryModalVisible] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [storyImage, setStoryImage] = useState<string | null>(null);

  // Story viewer state
  const [viewingStoryUser, setViewingStoryUser] = useState<string | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  useEffect(() => {
    fetchFeed();
  }, []);

  const isCurrentUser = (nameStr?: string | null) => {
    if (!nameStr) return false;
    const n = nameStr.toLowerCase().trim();
    const currentName = user?.name?.toLowerCase().trim() || '';
    return (
      n === 'you' ||
      n.includes('(you)') ||
      n.includes('explorer') ||
      (currentName && (n === currentName || n.startsWith(currentName.split(' ')[0])))
    );
  };

  const activeUserStories = useMemo(() => {
    if (!viewingStoryUser) return [];
    if (isCurrentUser(viewingStoryUser)) {
      return stories.filter((s) => isCurrentUser(s.user)).reverse();
    }
    return stories.filter((s) => s.user === viewingStoryUser).reverse();
  }, [viewingStoryUser, stories, user?.name]);

  const myActiveStories = useMemo(() => {
    return stories.filter((s) => isCurrentUser(s.user));
  }, [stories, user?.name]);

  // Story auto-advance timer
  useEffect(() => {
    let timer: any;
    if (viewingStoryUser && activeUserStories.length > 0) {
      timer = setTimeout(() => {
        if (currentStoryIndex < activeUserStories.length - 1) {
          setCurrentStoryIndex((prev) => prev + 1);
        } else {
          setViewingStoryUser(null);
        }
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [viewingStoryUser, currentStoryIndex, activeUserStories]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFeed();
    setRefreshing(false);
  };

  const handleCreatePost = async () => {
    if (!postContent.trim()) return;
    setIsSubmitting(true);
    try {
      const finalAchievement =
        selectedAchievement === 'Other' ? customAchievement.trim() : selectedAchievement;
      await createPost(postContent.trim(), finalAchievement || undefined, postImageUri || undefined);
      setPostContent('');
      setSelectedAchievement('');
      setCustomAchievement('');
      setPostImageUri(null);
      setModalVisible(false);
    } catch {
      // Error handled
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePickPostImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll permissions are needed to attach photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].uri) {
      setPostImageUri(result.assets[0].uri);
    }
  };

  const handlePickStoryImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll permissions are needed to attach photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].uri) {
      setStoryImage(result.assets[0].uri);
    }
  };

  const handleCreateStory = () => {
    if (!storyText.trim() && !storyImage) return;
    addStory(storyText.trim(), user?.name || 'Explorer', storyImage || undefined);
    setStoryText('');
    setStoryImage(null);
    setStoryModalVisible(false);
    Alert.alert('Story Published 🎉', 'Your win is live for the community for 24 hours!');
  };

  const handleShare = async (post: FeedPost) => {
    try {
      await Share.share({
        message: `${post.user} on SelfTrack: "${post.content}" ${
          post.achievement ? `🏆 ${post.achievement}` : ''
        }`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleComment = (postId: string) => {
    setActiveCommentPostId(postId);
    setCommentModalVisible(true);
  };

  const submitComment = () => {
    if (activeCommentPostId && commentText.trim()) {
      commentPost(activeCommentPostId, commentText.trim(), user?.name || 'Explorer');
      setCommentText('');
    }
  };

  const handleOptions = (post: FeedPost) => {
    setSelectedPost(post);
    setOptionsModalVisible(true);
  };

  const handleDeletePost = () => {
    if (selectedPost) {
      deletePost(selectedPost.id);
      setOptionsModalVisible(false);
      setSelectedPost(null);
    }
  };

  const handleSquadCheer = () => {
    if (!hasCheeredSquad) {
      setHasCheeredSquad(true);
      setSquadCheerCount((c) => c + 1);
      Alert.alert('High Five! ✋🎉', 'You cheered the community! +5 XP earned.');
    }
  };

  // Filter posts based on category and search query
  const filteredPosts = useMemo(() => {
    let result = posts;

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.content.toLowerCase().includes(q) ||
          p.user.toLowerCase().includes(q) ||
          (p.achievement && p.achievement.toLowerCase().includes(q))
      );
    }

    // Filter by category
    if (selectedCategory === 'milestones') {
      result = result.filter((p) => Boolean(p.achievement));
    } else if (selectedCategory === 'hydration') {
      result = result.filter(
        (p) =>
          p.content.toLowerCase().includes('water') ||
          p.content.toLowerCase().includes('hydrat') ||
          p.content.includes('💧') ||
          (p.achievement && p.achievement.toLowerCase().includes('hydrat'))
      );
    } else if (selectedCategory === 'fitness') {
      result = result.filter(
        (p) =>
          p.content.toLowerCase().includes('step') ||
          p.content.toLowerCase().includes('walk') ||
          p.content.toLowerCase().includes('run') ||
          p.content.toLowerCase().includes('workout') ||
          p.content.toLowerCase().includes('gym') ||
          (p.achievement && p.achievement.toLowerCase().includes('step'))
      );
    } else if (selectedCategory === 'mindset') {
      result = result.filter(
        (p) =>
          p.content.toLowerCase().includes('meditat') ||
          p.content.toLowerCase().includes('calm') ||
          p.content.toLowerCase().includes('sleep') ||
          p.content.toLowerCase().includes('mind')
      );
    } else if (selectedCategory === 'streaks') {
      result = result.filter(
        (p) =>
          p.content.toLowerCase().includes('streak') ||
          p.content.toLowerCase().includes('day') ||
          (p.achievement && p.achievement.toLowerCase().includes('streak'))
      );
    }

    return result;
  }, [posts, searchQuery, selectedCategory]);

  const communityMembers = useMemo(() => {
    const seen = new Set<string>();
    const result: { name: string; fullName: string; emoji: string; avatar?: string }[] = [];
    const emojis = ['🌟', '🔥', '⚡', '💪', '🏆', '🎯', '🌿', '💎'];

    // Collect distinct other members from feed posts
    posts.forEach((p) => {
      if (!p.user || isCurrentUser(p.user)) return;
      const firstName = p.user.split(' ')[0];
      if (!seen.has(firstName) && result.length < 8) {
        seen.add(firstName);
        const isUrl = Boolean(
          p.avatar &&
            (p.avatar.startsWith('http://') ||
              p.avatar.startsWith('https://') ||
              p.avatar.startsWith('file://'))
        );
        result.push({
          name: firstName,
          fullName: p.user,
          emoji: !isUrl && p.avatar && p.avatar.length <= 4 ? p.avatar : emojis[result.length % emojis.length],
          avatar: isUrl ? p.avatar : undefined,
        });
      }
    });

    // Curated active community friends to ensure lively community
    const defaultFriends = [
      { name: 'Maya', fullName: 'Maya Lin', emoji: '🌟', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
      { name: 'Alex', fullName: 'Alex Rivera', emoji: '🔥', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
      { name: 'Liam', fullName: 'Liam Chen', emoji: '⚡', avatar: undefined },
      { name: 'Sofia', fullName: 'Sofia Patel', emoji: '🌿', avatar: undefined },
      { name: 'David', fullName: 'David Miller', emoji: '💪', avatar: undefined },
    ];

    defaultFriends.forEach((df) => {
      if (!seen.has(df.name) && result.length < 6) {
        seen.add(df.name);
        result.push(df);
      }
    });

    return result;
  }, [posts, user?.name]);

  const groupedStories = useMemo(() => {
    const groups: Record<string, typeof stories> = {};
    stories.forEach((s) => {
      if (!groups[s.user]) groups[s.user] = [];
      groups[s.user].push(s);
    });
    return Object.entries(groups).map(([u, userStories]) => ({
      user: u,
      stories: userStories,
    }));
  }, [stories]);

  const viewerAvatar = useMemo(() => {
    if (!viewingStoryUser) return { emoji: '🌟', avatar: undefined };
    if (isCurrentUser(viewingStoryUser)) {
      return { emoji: '🌟', avatar: user?.avatar_url };
    }
    const found = communityMembers.find((u) => viewingStoryUser.startsWith(u.name));
    return found || { emoji: '🌟', avatar: undefined };
  }, [viewingStoryUser, communityMembers, user?.avatar_url]);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF1F2" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#EC4899', '#8B5CF6']}
            tintColor="#EC4899"
          />
        }
      >
        {/* TOP HERO HEADER WITH VIBRANT PASTEL GRADIENT */}
        <View style={styles.heroWrapper}>
          <LinearGradient
            colors={['#FFF1F2', '#FDF2F8', '#F5F3FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            {/* Soft decorative background circles */}
            <View style={styles.heroBubble1} />
            <View style={styles.heroBubble2} />

            {/* Top row with badge & action controls */}
            <View style={styles.heroTopRow}>
              <View style={styles.pulseBadge}>
                <LinearGradient
                  colors={['#EC4899', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.pulseBadgeGrad}
                >
                  <Icon name="users" size={12} color="#FFF" />
                  <Text style={styles.pulseBadgeText}>COMMUNITY & SOCIAL FEED</Text>
                </LinearGradient>
              </View>

              <View style={styles.heroActionsRow}>
                <TouchableOpacity
                  style={styles.iconCircleBtn}
                  onPress={() => setIsSearching(!isSearching)}
                  activeOpacity={0.8}
                >
                  <Icon name={isSearching ? 'x' : 'search'} size={18} color="#4F46E5" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconCircleBtn}
                  onPress={() => navigation?.navigate?.('Notifications')}
                  activeOpacity={0.8}
                >
                  <Icon name="bell" size={18} color="#E11D48" />
                  <View style={styles.notifBadgeDot} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Hero Main Title */}
            <View style={styles.heroTitleBox}>
              <Text style={styles.heroTitle}>Community Circle & Streaks 🚀</Text>
              <Text style={styles.heroSubtitle}>
                Cheer friends, celebrate milestones & share daily habit wins together.
              </Text>
            </View>

            {/* Search Input Bar (when toggled) */}
            {isSearching && (
              <Animated.View entering={FadeInDown.duration(200)} style={styles.searchBarWrap}>
                <Icon name="search" size={18} color="#8B5CF6" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search wins, names, or goals..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Icon name="x-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </Animated.View>
            )}

            {/* COMMUNITY SQUAD CHALLENGE CARD */}
            <View style={styles.squadCard}>
              <LinearGradient
                colors={['#FFFFFF', '#FAF5FF']}
                style={styles.squadCardGradient}
              >
                <View style={styles.squadHeaderRow}>
                  <View style={styles.squadTitleLeft}>
                    <LinearGradient
                      colors={['#FEF3C7', '#FDE68A']}
                      style={styles.squadTrophyBubble}
                    >
                      <Text style={{ fontSize: 16 }}>🏆</Text>
                    </LinearGradient>
                    <View>
                      <Text style={styles.squadTitle}>Weekly Squad Challenge</Text>
                      <Text style={styles.squadSubtext}>100k Community Steps • 74% Done</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.cheerBtn, hasCheeredSquad && styles.cheerBtnActive]}
                    onPress={handleSquadCheer}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cheerBtnEmoji}>{hasCheeredSquad ? '❤️' : '✋'}</Text>
                    <Text
                      style={[styles.cheerBtnText, hasCheeredSquad && { color: '#E11D48' }]}
                    >
                      {hasCheeredSquad ? `${squadCheerCount}` : 'Cheer'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Progress Bar */}
                <View style={styles.squadProgressBarBg}>
                  <LinearGradient
                    colors={['#EC4899', '#8B5CF6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.squadProgressBarFill, { width: '74%' }]}
                  />
                </View>
              </LinearGradient>
            </View>
          </LinearGradient>
        </View>

        {/* STORIES / HIGHLIGHTS CAROUSEL */}
        <View style={styles.storiesSection}>
          <View style={styles.storiesSectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="zap" size={15} color="#E11D48" />
              <Text style={styles.storiesSectionTitle}>Daily Wins & Streaks</Text>
            </View>
            <Text style={styles.storiesSectionSubtitle}>24h highlights</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storiesBarContent}
          >
            {/* If user has active stories: show active StoryAvatar with vibrant gradient ring to review their win! */}
            {myActiveStories.length > 0 ? (
              <>
                <TouchableOpacity
                  style={styles.storyItem}
                  onPress={() => {
                    setViewingStoryUser(user?.name || 'You');
                    setCurrentStoryIndex(0);
                  }}
                  activeOpacity={0.8}
                >
                  <StoryAvatar
                    avatar={user?.avatar_url}
                    emoji="🌟"
                    hasUnread={true}
                  />
                  <Text style={[styles.storyLabel, { fontWeight: '700', color: '#4F46E5' }]} numberOfLines={1}>
                    Your Win ({myActiveStories.length})
                  </Text>
                </TouchableOpacity>

                {/* Add More Win Button */}
                <TouchableOpacity
                  style={styles.storyItem}
                  onPress={() => setStoryModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.createStoryRing}>
                    <LinearGradient
                      colors={['#EEF2FF', '#E0E7FF']}
                      style={styles.createStoryInner}
                    >
                      <Icon name="plus" size={22} color="#4F46E5" />
                    </LinearGradient>
                  </View>
                  <Text style={styles.storyLabel}>+ Add</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* Create Story Button if user has no stories */
              <TouchableOpacity
                style={styles.storyItem}
                onPress={() => setStoryModalVisible(true)}
                activeOpacity={0.8}
              >
                <View style={styles.createStoryRing}>
                  <LinearGradient
                    colors={['#EEF2FF', '#E0E7FF']}
                    style={styles.createStoryInner}
                  >
                    {user?.avatar_url ? (
                      <Image source={{ uri: user.avatar_url }} style={{ width: '100%', height: '100%', borderRadius: 28 }} />
                    ) : (
                      <Icon name="plus" size={24} color="#4F46E5" />
                    )}
                  </LinearGradient>
                  <LinearGradient
                    colors={['#4F46E5', '#7C3AED']}
                    style={styles.createStoryBadge}
                  >
                    <Icon name="plus" size={10} color="#FFF" />
                  </LinearGradient>
                </View>
                <Text style={styles.storyLabel}>Your Win</Text>
              </TouchableOpacity>
            )}

            {/* Active User Stories from other friends */}
            {groupedStories
              .filter((group) => !isCurrentUser(group.user))
              .map((group) => {
                const foundUser = communityMembers.find((u) => u.fullName.startsWith(group.user) || group.user.startsWith(u.name));
                return (
                  <TouchableOpacity
                    key={group.user}
                    style={styles.storyItem}
                    onPress={() => {
                      setViewingStoryUser(group.user);
                      setCurrentStoryIndex(0);
                    }}
                    activeOpacity={0.8}
                  >
                    <StoryAvatar
                      avatar={foundUser?.avatar}
                      emoji={foundUser?.emoji}
                      hasUnread={true}
                    />
                    <Text style={styles.storyLabel} numberOfLines={1}>
                      {group.user.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                );
              })}

            {/* Other Community Members (never duplicates current user) */}
            {communityMembers
              .filter((u) => !groupedStories.some((g) => g.user.startsWith(u.name) || u.fullName.startsWith(g.user)))
              .map((u, i) => (
                <TouchableOpacity
                  key={`member-${u.name}-${i}`}
                  style={styles.storyItem}
                  onPress={() => {
                    Alert.alert(u.name, `${u.fullName} is on a consistent streak! Give them a cheer.`);
                  }}
                  activeOpacity={0.8}
                >
                  <StoryAvatar avatar={u.avatar} emoji={u.emoji} hasUnread={false} />
                  <Text style={styles.storyLabel} numberOfLines={1}>
                    {u.name}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>

        {/* QUICK SHARE / COMPOSE TRIGGER BAR */}
        <View style={styles.composeTriggerWrap}>
          <TouchableOpacity
            style={styles.composeTriggerCard}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
          >
            <PostAvatar avatar={user?.avatar_url} size={42} />
            <View style={styles.composeTriggerTextBox}>
              <Text style={styles.composeTriggerPlaceholder}>
                Share a win or milestone, {user?.name ? user.name.split(' ')[0] : 'friend'}...
              </Text>
            </View>
            <LinearGradient
              colors={['#EC4899', '#8B5CF6']}
              style={styles.composeTriggerIcon}
            >
              <Icon name="edit-3" size={16} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* INTERACTIVE CATEGORY FILTER CHIPS */}
        <View style={styles.categoriesWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContent}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.75}
                >
                  {isSelected ? (
                    <LinearGradient
                      colors={['#4F46E5', '#7C3AED']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.categoryChipGradient}
                    >
                      <Text style={styles.categoryChipTextActive}>{cat.label}</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.categoryChipTextInactive}>{cat.label}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* POSTS LIST */}
        <View style={styles.postsSection}>
          {filteredPosts.length === 0 ? (
            <View style={styles.emptyCard}>
              <LinearGradient colors={['#F5F3FF', '#EDE9FE']} style={styles.emptyIconBubble}>
                <Icon name="message-square" size={32} color="#7C3AED" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No Updates Here Yet</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? "We couldn't find any posts matching your search query."
                  : 'Be the champion who shares today’s first milestone!'}
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.emptyActionBtnText}>Share First Win 🚀</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredPosts.map((post, index) => {
              const meta = getAchievementMeta(post.achievement);
              return (
                <Card key={post.id} style={styles.postCard}>
                  {/* Left vibrant category accent stripe */}
                  <LinearGradient
                    colors={meta.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.postLeftAccent}
                  />

                  {/* Post Header */}
                  <View style={styles.postHeader}>
                    <View style={styles.postUserInfo}>
                      <PostAvatar
                        avatar={post.avatar}
                        colors={meta.colors}
                        size={44}
                      />
                      <View style={{ marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.postAuthorName}>{post.user}</Text>
                          <View style={styles.verifiedDot}>
                            <Icon name="check" size={9} color="#FFF" />
                          </View>
                        </View>
                        <Text style={styles.postTimeText}>{post.time}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleOptions(post)}
                      style={styles.postOptionsBtn}
                      activeOpacity={0.7}
                    >
                      <Icon name="more-horizontal" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>

                  {/* Achievement Badge (if present) */}
                  {!!post.achievement && (
                    <View style={styles.achievementBadgeWrap}>
                      <LinearGradient
                        colors={meta.colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.achievementBadgeGradient}
                      >
                        <Icon name={meta.icon as any} size={13} color="#FFF" />
                        <Text style={styles.achievementBadgeText}>{post.achievement}</Text>
                      </LinearGradient>
                    </View>
                  )}

                  {/* Post Content */}
                  <Text style={styles.postBodyText}>{post.content}</Text>

                  {/* Optional Image */}
                  {(post.hasImage || !!post.image_url) && (
                    <View style={styles.postImageContainer}>
                      {post.image_url ? (
                        <Image
                          source={{ uri: post.image_url }}
                          style={styles.postAttachedImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <LinearGradient
                          colors={['#EEF2FF', '#E0E7FF']}
                          style={styles.postImageFallback}
                        >
                          <Icon name="image" size={36} color="#818CF8" />
                        </LinearGradient>
                      )}
                    </View>
                  )}

                  {/* Inline Comments Preview (if any) */}
                  {post.commentsList && post.commentsList.length > 0 && (
                    <TouchableOpacity
                      style={styles.inlineCommentBox}
                      onPress={() => handleComment(post.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.inlineCommentHeader}>
                        <Text style={styles.inlineCommentAuthor}>
                          {post.commentsList[post.commentsList.length - 1].user}:
                        </Text>
                        <Text style={styles.inlineCommentText} numberOfLines={1}>
                          {post.commentsList[post.commentsList.length - 1].text}
                        </Text>
                      </View>
                      {post.commentsList.length > 1 && (
                        <Text style={styles.viewMoreCommentsLink}>
                          View all {post.commentsList.length} cheers →
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Interactive Reaction & Action Bar */}
                  <View style={styles.postActionBar}>
                    {/* Like Button */}
                    <TouchableOpacity
                      style={[
                        styles.actionPill,
                        post.isLiked && styles.actionPillLiked,
                      ]}
                      onPress={() => likePost(post.id)}
                      activeOpacity={0.7}
                    >
                      <AnimatedHeart isLiked={!!post.isLiked} size={18} />
                      <Text
                        style={[
                          styles.actionPillText,
                          post.isLiked && { color: '#EF4444', fontWeight: '700' },
                        ]}
                      >
                        {post.likes}
                      </Text>
                    </TouchableOpacity>

                    {/* Quick Cheer / Fire reaction */}
                    <TouchableOpacity
                      style={styles.actionPill}
                      onPress={() => {
                        likePost(post.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 15 }}>🔥</Text>
                      <Text style={styles.actionPillText}>Cheer</Text>
                    </TouchableOpacity>

                    {/* Comments Button */}
                    <TouchableOpacity
                      style={styles.actionPill}
                      onPress={() => handleComment(post.id)}
                      activeOpacity={0.7}
                    >
                      <Icon name="message-circle" size={17} color="#64748B" />
                      <Text style={styles.actionPillText}>
                        {Array.isArray(post.commentsList)
                          ? post.commentsList.length
                          : post.comments || 0}
                      </Text>
                    </TouchableOpacity>

                    {/* Native Share Button */}
                    <TouchableOpacity
                      style={[styles.actionPill, { marginLeft: 'auto' }]}
                      onPress={() => handleShare(post)}
                      activeOpacity={0.7}
                    >
                      <Icon name="share-2" size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })
          )}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* FLOATING ACTION BUTTON */}
      <FloatingActionButton
        icon="edit-3"
        onPress={() => setModalVisible(true)}
        gradient
      />

      {/* CREATE POST MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalSheet, { maxHeight: '88%' }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <PostAvatar avatar={user?.avatar_url} size={40} />
                <View>
                  <Text style={styles.sheetTitle}>Celebrate a Win 🚀</Text>
                  <Text style={styles.sheetSubtitle}>Posting as {user?.name || 'Explorer'}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.sheetCloseBtn}
              >
                <Icon name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              <TextInput
                style={styles.sheetTextInput}
                placeholder="What healthy habit, streak, or milestone did you hit today?"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                value={postContent}
                onChangeText={setPostContent}
              />

              {/* Achievement Selection */}
              <Text style={styles.sheetSectionTitle}>Tag a Milestone (Optional)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 10 }}
              >
                {ACHIEVEMENT_SUGGESTIONS.map((sug) => {
                  const isSelected = selectedAchievement === sug;
                  return (
                    <TouchableOpacity
                      key={sug}
                      style={[styles.sugChip, isSelected && styles.sugChipActive]}
                      onPress={() => setSelectedAchievement(isSelected ? '' : sug)}
                    >
                      <Text
                        style={[
                          styles.sugChipText,
                          isSelected && { color: '#FFF', fontWeight: '700' },
                        ]}
                      >
                        {sug}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {selectedAchievement === 'Other' && (
                <View style={styles.customAchievementRow}>
                  <Icon name="award" size={18} color="#D97706" />
                  <TextInput
                    style={styles.customAchievementInput}
                    placeholder="Type custom milestone title..."
                    placeholderTextColor="#94A3B8"
                    value={customAchievement}
                    onChangeText={setCustomAchievement}
                    autoFocus
                  />
                </View>
              )}

              {/* Photo Attachment Preview / Button */}
              {postImageUri ? (
                <View style={styles.imagePreviewWrap}>
                  <Image source={{ uri: postImageUri }} style={styles.imagePreviewThumb} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setPostImageUri(null)}
                  >
                    <Icon name="x" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.attachPhotoBtn}
                  onPress={handlePickPostImage}
                  activeOpacity={0.8}
                >
                  <Icon name="image" size={18} color="#4F46E5" />
                  <Text style={styles.attachPhotoText}>Add Photo / Progress Snap</Text>
                </TouchableOpacity>
              )}

              <Button
                title="Share With Tribe 🚀"
                onPress={handleCreatePost}
                loading={isSubmitting}
                disabled={!postContent.trim()}
                variant="gradient"
                style={{ marginTop: 14 }}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* COMMENTS MODAL */}
      <Modal visible={commentModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalSheet, { maxHeight: '85%' }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.sheetTitle}>Community Cheers 💬</Text>
              </View>
              <TouchableOpacity
                onPress={() => setCommentModalVisible(false)}
                style={styles.sheetCloseBtn}
              >
                <Icon name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Comments list */}
            <ScrollView
              style={{ maxHeight: 280, marginVertical: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {activeCommentPostId &&
                posts
                  .find((p) => p.id === activeCommentPostId)
                  ?.commentsList?.map((c) => (
                    <View key={c.id} style={styles.commentItemBubble}>
                      <View style={styles.commentItemTop}>
                        <Text style={styles.commentItemAuthor}>{c.user}</Text>
                        <Text style={styles.commentItemTime}>{c.time}</Text>
                      </View>
                      <Text style={styles.commentItemBody}>{c.text}</Text>
                    </View>
                  ))}

              {(!posts.find((p) => p.id === activeCommentPostId)?.commentsList ||
                posts.find((p) => p.id === activeCommentPostId)!.commentsList!.length === 0) && (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>🙌</Text>
                  <Text style={{ color: '#94A3B8', fontWeight: '500' }}>
                    No cheers yet. Be the first to applaud!
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Quick 1-tap reaction cheer buttons */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 6 }}>
              QUICK CHEERS
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingBottom: 10 }}
            >
              {QUICK_CHEERS.map((cheer, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.quickCheerChip}
                  onPress={() => setCommentText(cheer)}
                >
                  <Text style={styles.quickCheerChipText}>{cheer}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Comment Input */}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentTextInput}
                placeholder="Write an encouraging cheer..."
                placeholderTextColor="#94A3B8"
                value={commentText}
                onChangeText={setCommentText}
              />
              <TouchableOpacity
                style={[
                  styles.commentSendBtn,
                  !commentText.trim() && { opacity: 0.5 },
                ]}
                onPress={submitComment}
                disabled={!commentText.trim()}
              >
                <LinearGradient
                  colors={['#EC4899', '#8B5CF6']}
                  style={styles.commentSendGrad}
                >
                  <Icon name="arrow-up" size={18} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* OPTIONS MODAL */}
      <Modal visible={optionsModalVisible} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setOptionsModalVisible(false)}
        >
          <View style={styles.optionsPopup}>
            {selectedPost?.user_id === user?.id ? (
              <TouchableOpacity style={styles.optionRow} onPress={handleDeletePost}>
                <Icon name="trash-2" size={18} color="#EF4444" />
                <Text style={[styles.optionRowText, { color: '#EF4444' }]}>Delete Post</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    Alert.alert('Post Hidden', 'You will see fewer posts like this.');
                    setOptionsModalVisible(false);
                  }}
                >
                  <Icon name="eye-off" size={18} color="#334155" />
                  <Text style={styles.optionRowText}>Hide Post</Text>
                </TouchableOpacity>
                <View style={styles.optionRowDivider} />
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    Alert.alert('Reported', 'Thank you. We review all flagged content.');
                    setOptionsModalVisible(false);
                  }}
                >
                  <Icon name="flag" size={18} color="#EF4444" />
                  <Text style={[styles.optionRowText, { color: '#EF4444' }]}>Report Post</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* STORY CREATION MODAL */}
      <Modal visible={storyModalVisible} animationType="slide" transparent>
        <View style={styles.storyCreateContainer}>
          <View style={styles.storyCreateTopBar}>
            <TouchableOpacity onPress={() => setStoryModalVisible(false)}>
              <Icon name="x" size={26} color="#FFF" />
            </TouchableOpacity>
            <Button
              title="Share Win"
              onPress={handleCreateStory}
              disabled={!storyText.trim() && !storyImage}
              size="sm"
              variant="gradient"
              style={{ width: 130 }}
            />
          </View>

          <View style={styles.storyCreateCanvas}>
            {storyImage && (
              <Image source={{ uri: storyImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            )}
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: storyImage ? 'rgba(0,0,0,0.35)' : 'transparent',
                  justifyContent: 'center',
                },
              ]}
            >
              <TextInput
                style={styles.storyCanvasInput}
                placeholder={storyImage ? 'Add text (optional)...' : 'Type your win or milestone...'}
                placeholderTextColor="rgba(255,255,255,0.6)"
                multiline
                autoFocus
                value={storyText}
                onChangeText={setStoryText}
              />
            </View>
          </View>

          <View style={styles.storyCreateBottomBar}>
            <TouchableOpacity
              style={styles.storyAttachPhotoBtn}
              onPress={handlePickStoryImage}
            >
              <Icon name="image" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={{ color: '#FFF', fontWeight: '700' }}>
                {storyImage ? 'Change Photo' : 'Attach Photo'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* STORY VIEWER MODAL */}
      <Modal visible={!!viewingStoryUser} animationType="fade" transparent>
        <View style={styles.storyViewerContainer}>
          {/* Progress Indicators */}
          <View style={styles.storyProgressRow}>
            {activeUserStories.map((s, i) => (
              <View
                key={s.id}
                style={[
                  styles.storyProgressBar,
                  {
                    backgroundColor:
                      i <= currentStoryIndex ? '#FFF' : 'rgba(255,255,255,0.35)',
                  },
                ]}
              />
            ))}
          </View>

          {/* Viewer Header */}
          <View style={styles.storyViewerHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <PostAvatar avatar={viewerAvatar.avatar} size={38} />
              <View>
                <Text style={styles.storyViewerName}>
                  {isCurrentUser(viewingStoryUser) ? `${user?.name || 'You'} (Your Win)` : viewingStoryUser}
                </Text>
                <Text style={styles.storyViewerTime}>
                  {activeUserStories[currentStoryIndex]?.time}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              {isCurrentUser(viewingStoryUser) && activeUserStories[currentStoryIndex] && (
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Delete Story', 'Do you want to delete this win?', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => {
                          deleteStory(activeUserStories[currentStoryIndex].id);
                          setViewingStoryUser(null);
                        },
                      },
                    ]);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="trash-2" size={20} color="#FFF" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setViewingStoryUser(null)}>
                <Icon name="x" size={26} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Story View Content */}
          <View style={styles.storyViewerBody}>
            {activeUserStories[currentStoryIndex]?.image_url && (
              <Image
                source={{ uri: activeUserStories[currentStoryIndex].image_url }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            )}
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: activeUserStories[currentStoryIndex]?.image_url
                    ? 'rgba(0,0,0,0.35)'
                    : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 24,
                },
              ]}
            >
              <Text style={styles.storyViewerText}>
                {activeUserStories[currentStoryIndex]?.text}
              </Text>
            </View>

            {/* Tap zones for backward/forward navigation */}
            <TouchableOpacity
              style={styles.storyTapLeft}
              onPress={() => {
                if (currentStoryIndex > 0) setCurrentStoryIndex(currentStoryIndex - 1);
              }}
            />
            <TouchableOpacity
              style={styles.storyTapRight}
              onPress={() => {
                if (currentStoryIndex < activeUserStories.length - 1) {
                  setCurrentStoryIndex(currentStoryIndex + 1);
                } else {
                  setViewingStoryUser(null);
                }
              }}
            />

            {/* Story Heart Action */}
            {activeUserStories[currentStoryIndex] && (
              <View style={styles.storyViewerActions}>
                <TouchableOpacity
                  style={styles.storyLikeBubble}
                  onPress={() => likeStory(activeUserStories[currentStoryIndex].id)}
                >
                  <AnimatedHeart
                    isLiked={!!activeUserStories[currentStoryIndex].isLiked}
                    size={24}
                    unlikedColor="#FFF"
                  />
                  {activeUserStories[currentStoryIndex].isLiked && (
                    <Text style={{ color: '#EF4444', fontWeight: 'bold', marginLeft: 8 }}>
                      Liked
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // HERO SECTION
  heroWrapper: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    ...Shadow.sm,
  },
  heroBanner: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
    position: 'relative',
  },
  heroBubble1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(236, 72, 153, 0.08)',
    top: -40,
    right: -20,
  },
  heroBubble2: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    bottom: 20,
    left: -30,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pulseBadge: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  pulseBadgeGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pulseBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    ...Shadow.sm,
  },
  notifBadgeDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  heroTitleBox: {
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    fontWeight: '500',
  },

  // Search input
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },

  // Squad Challenge Card
  squadCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.sm,
  },
  squadCardGradient: {
    padding: 14,
  },
  squadHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  squadTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  squadTrophyBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  squadTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  squadSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  cheerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cheerBtnActive: {
    backgroundColor: '#FFE4E6',
  },
  cheerBtnEmoji: {
    fontSize: 14,
  },
  cheerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  squadProgressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  squadProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // STORIES SECTION
  storiesSection: {
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
  },
  storiesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  storiesSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  storiesSectionSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  storiesBarContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  storyItem: {
    alignItems: 'center',
    width: 64,
  },
  createStoryRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 6,
  },
  createStoryInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createStoryBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  storyRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    padding: 2.5,
    marginBottom: 6,
    ...Shadow.sm,
  },
  storyInnerRing: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: '#FFF',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyImage: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  storyEmojiText: {
    fontSize: 24,
  },
  storyLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },

  // COMPOSE TRIGGER BAR
  composeTriggerWrap: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  composeTriggerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.sm,
  },
  composeTriggerTextBox: {
    flex: 1,
    paddingHorizontal: 12,
  },
  composeTriggerPlaceholder: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  composeTriggerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // CATEGORY FILTER CHIPS
  categoriesWrap: {
    marginBottom: 12,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  categoryChipSelected: {
    borderColor: 'transparent',
  },
  categoryChipGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryChipTextActive: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryChipTextInactive: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  // POSTS SECTION
  postsSection: {
    paddingHorizontal: 20,
  },
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
    ...Shadow.sm,
  },
  emptyIconBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  emptyActionBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyActionBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },

  // POST CARD
  postCard: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    position: 'relative',
    overflow: 'hidden',
    ...Shadow.sm,
  },
  postLeftAccent: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 4.5,
    borderRadius: 3,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingLeft: 4,
  },
  postUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postAuthorName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  verifiedDot: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postTimeText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 1,
  },
  postOptionsBtn: {
    padding: 6,
  },

  // Avatar Component styles
  avatarOuterRing: {
    padding: 1.5,
  },
  avatarGradientBorder: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  avatarInnerContainer: {
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Achievement Badge
  achievementBadgeWrap: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 10,
    marginLeft: 4,
  },
  achievementBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  achievementBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.3,
  },

  // Post Body
  postBodyText: {
    fontSize: 14.5,
    lineHeight: 22,
    color: '#334155',
    fontWeight: '500',
    marginBottom: 12,
    paddingLeft: 4,
  },

  // Post Attached Image
  postImageContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 190,
    marginBottom: 12,
    backgroundColor: '#F1F5F9',
  },
  postAttachedImage: {
    width: '100%',
    height: '100%',
  },
  postImageFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Inline comment box
  inlineCommentBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  inlineCommentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineCommentAuthor: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  inlineCommentText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  viewMoreCommentsLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366F1',
    marginTop: 4,
  },

  // Action bar
  postActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  actionPillLiked: {
    backgroundColor: '#FEE2E2',
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },

  // MODALS
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 36,
    ...Shadow.lg,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    color: '#1E293B',
    textAlignVertical: 'top',
    minHeight: 90,
    marginBottom: 12,
  },
  sheetSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sugChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sugChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  sugChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  customAchievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  customAchievementInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
  },
  attachPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 14,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
    marginBottom: 6,
  },
  attachPhotoText: {
    color: '#4F46E5',
    fontSize: 13,
    fontWeight: '700',
  },
  imagePreviewWrap: {
    height: 100,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
  },
  imagePreviewThumb: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // COMMENTS LIST IN MODAL
  commentItemBubble: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  commentItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  commentItemAuthor: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  commentItemTime: {
    fontSize: 10,
    color: '#94A3B8',
  },
  commentItemBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  quickCheerChip: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  quickCheerChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 42,
    fontSize: 14,
    color: '#1E293B',
  },
  commentSendBtn: {
    borderRadius: 21,
    overflow: 'hidden',
  },
  commentSendGrad: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // OPTIONS POPUP
  optionsPopup: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 8,
    marginHorizontal: 20,
    marginBottom: 40,
    ...Shadow.lg,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  optionRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  optionRowDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 8,
  },

  // STORY MODAL STYLES
  storyCreateContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: 50,
  },
  storyCreateTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  storyCreateCanvas: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  storyCanvasInput: {
    fontSize: 26,
    color: '#FFF',
    textAlign: 'center',
    fontWeight: '800',
    width: '100%',
  },
  storyCreateBottomBar: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  storyAttachPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
  },

  // STORY VIEWER
  storyViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  storyProgressRow: {
    flexDirection: 'row',
    paddingTop: 54,
    paddingHorizontal: 10,
    gap: 4,
    zIndex: 10,
  },
  storyProgressBar: {
    flex: 1,
    height: 2.5,
    borderRadius: 1.5,
  },
  storyViewerHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  storyViewerName: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15,
  },
  storyViewerTime: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
  },
  storyViewerBody: {
    flex: 1,
    marginTop: -80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyViewerText: {
    color: '#FFF',
    fontSize: 26,
    textAlign: 'center',
    fontWeight: '800',
    lineHeight: 34,
  },
  storyTapLeft: {
    position: 'absolute',
    top: 100,
    bottom: 0,
    left: 0,
    width: '30%',
  },
  storyTapRight: {
    position: 'absolute',
    top: 100,
    bottom: 0,
    right: 0,
    width: '70%',
  },
  storyViewerActions: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    zIndex: 20,
  },
  storyLikeBubble: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default SocialFeedScreen;
