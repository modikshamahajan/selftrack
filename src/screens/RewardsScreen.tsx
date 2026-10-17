import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Animated,
  RefreshControl,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getScreenBgColor } from '../theme/screenBgColors';
import Header from '../components/Header';
import { useRewardsStore } from '../store/useRewardsStore';
import { useAuthStore } from '../store/useAuthStore';
import { useHabitStore } from '../store/useHabitStore';

const GIFT_BOX = require('../../assets/Images/giftbox.png');
const FIRE_BADGE = require('../../assets/Images/firebadge.png');
const PURPLE_BADGE = require('../../assets/Images/purplecandy.png');
const STAR_BADGE = require('../../assets/Images/goldstar.png');
const TROPHY_ICON = require('../../assets/Images/trophyicon.png');
const WATER_ICON = require('../../assets/Images/waterdropicon.png');
const SHOES_ICON = require('../../assets/Images/shoes.png');

const BADGE_IMAGES: Record<string, any> = {
  // Fire / streak badges
  firebadge: FIRE_BADGE,
  'firebadge.png': FIRE_BADGE,
  early_bird: FIRE_BADGE,
  'early-bird': FIRE_BADGE,
  'streak-master': FIRE_BADGE,
  streak: FIRE_BADGE,

  // Purple candy / consistency badges
  purplecandy: PURPLE_BADGE,
  'purplecandy.png': PURPLE_BADGE,
  consistent: PURPLE_BADGE,
  'consistent-habit': PURPLE_BADGE,

  // Trophy / champion / focus badges
  trophyicon: TROPHY_ICON,
  'trophyicon.png': TROPHY_ICON,
  focused: TROPHY_ICON,
  champion: TROPHY_ICON,

  // Star / milestone / achiever badges
  goldstar: STAR_BADGE,
  'goldstar.png': STAR_BADGE,
  achiever: STAR_BADGE,
  'first-step': STAR_BADGE,
  first_step: STAR_BADGE,

  // Water drop / hydration badges
  waterdropicon: WATER_ICON,
  'waterdropicon.png': WATER_ICON,
  'hydration-hero': WATER_ICON,
  hydration_hero: WATER_ICON,
  water: WATER_ICON,

  // Steps / fitness badges
  shoes: SHOES_ICON,
  'shoes.png': SHOES_ICON,
  fitness: SHOES_ICON,
  steps: SHOES_ICON,
};

const resolveBadgeImage = (b: { image_name?: string; slug?: string; title?: string }) => {
  const imgKey = (b.image_name || '').toLowerCase().trim();
  const slugKey = (b.slug || '').toLowerCase().trim();
  const titleKey = (b.title || '').toLowerCase().trim();

  if (BADGE_IMAGES[imgKey]) return BADGE_IMAGES[imgKey];
  if (BADGE_IMAGES[slugKey]) return BADGE_IMAGES[slugKey];
  if (BADGE_IMAGES[titleKey]) return BADGE_IMAGES[titleKey];

  if (titleKey.includes('star') || titleKey.includes('first') || titleKey.includes('step') || titleKey.includes('achiever')) return STAR_BADGE;
  if (titleKey.includes('water') || titleKey.includes('hydrat')) return WATER_ICON;
  if (titleKey.includes('fire') || titleKey.includes('streak') || titleKey.includes('early') || titleKey.includes('bird')) return FIRE_BADGE;
  if (titleKey.includes('purple') || titleKey.includes('candy') || titleKey.includes('consist')) return PURPLE_BADGE;
  if (titleKey.includes('step') || titleKey.includes('walk') || titleKey.includes('run')) return SHOES_ICON;

  return TROPHY_ICON;
};

const DEFAULT_BADGES = [
  {
    title: 'Early Bird',
    image: FIRE_BADGE,
    bg: '#FFF1F2',
    border: '#FECDD3',
    is_unlocked: true,
  },
  {
    title: 'Consistent',
    image: PURPLE_BADGE,
    bg: '#F5F3FF',
    border: '#DDD6FE',
    is_unlocked: true,
  },
  {
    title: 'Focused',
    image: TROPHY_ICON,
    bg: '#ECFDF5',
    border: '#A7F3D0',
    is_unlocked: false,
  },
  {
    title: 'Achiever',
    image: STAR_BADGE,
    bg: '#FFFBEB',
    border: '#FDE68A',
    is_unlocked: false,
  },
];

const ACHIEVEMENTS = [
  {
    title: '7 Days Streak',
    subtitle: 'Keep going!',
    xp: '+100 XP',
    image: TROPHY_ICON,
    color: '#2ECC71',
  },
  {
    title: 'Hydration Hero',
    subtitle: 'Drink 8 glasses of water',
    xp: '+150 XP',
    image: WATER_ICON,
    color: '#2ECC71',
  },
];

const LEADERBOARD = [
  {
    rank: 1,
    name: 'Sophia',
    xp: '4,250 XP',
    avatar: '👑',
    bg: '#FFF6E7',
  },
  {
    rank: 2,
    name: 'You',
    xp: '3,560 XP',
    avatar: '🔥',
    bg: '#ECFDF3',
  },
  {
    rank: 3,
    name: 'Liam',
    xp: '3,120 XP',
    avatar: '⭐',
    bg: '#F4F3FF',
  },
  {
    rank: 4,
    name: 'Emma',
    xp: '2,860 XP',
    avatar: '💧',
    bg: '#EEF8FF',
  },
];

const RewardsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const bgColor = getScreenBgColor('Rewards');
  const { summary, badges, leaderboard, fetchRewards } = useRewardsStore();
  const user = useAuthStore((s) => s.user);
  const habits = useHabitStore((s) => s.habits);

  useEffect(() => {
    fetchRewards();
    useHabitStore.getState().fetchHabits(); // Make sure habits are loaded to calculate accurate max streak
  }, []);

  //
  // ---------------- ANIMATIONS ----------------
  //

  const giftFloat = useRef(new Animated.Value(0)).current;

  const fireScale = useRef(new Animated.Value(1)).current;
  const purpleRotate = useRef(new Animated.Value(0)).current;
  const trophyFloat = useRef(new Animated.Value(0)).current;
  const starGlow = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    //
    // GIFT FLOAT
    //

    Animated.loop(
      Animated.sequence([
        Animated.timing(giftFloat, {
          toValue: -14,
          duration: 1800,
          useNativeDriver: true,
        }),

        Animated.timing(giftFloat, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    //
    // FIRE PULSE
    //

    Animated.loop(
      Animated.sequence([
        Animated.timing(fireScale, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),

        Animated.timing(fireScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    //
    // PURPLE SWING
    //

    Animated.loop(
      Animated.sequence([
        Animated.timing(purpleRotate, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),

        Animated.timing(purpleRotate, {
          toValue: -1,
          duration: 900,
          useNativeDriver: true,
        }),

        Animated.timing(purpleRotate, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();

    //
    // TROPHY FLOAT
    //

    Animated.loop(
      Animated.sequence([
        Animated.timing(trophyFloat, {
          toValue: -10,
          duration: 1500,
          useNativeDriver: true,
        }),

        Animated.timing(trophyFloat, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    //
    // STAR GLOW
    //

    Animated.loop(
      Animated.sequence([
        Animated.timing(starGlow, {
          toValue: 1.18,
          duration: 1400,
          useNativeDriver: true,
        }),

        Animated.timing(starGlow, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const rotateInterpolate = purpleRotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-8deg', '8deg'],
  });

  const BADGE_COLOR_PALETTES = [
    { bg: '#FFF1F2', border: '#FECDD3' }, // Rose / fire
    { bg: '#F5F3FF', border: '#DDD6FE' }, // Violet / purple candy
    { bg: '#ECFDF5', border: '#A7F3D0' }, // Emerald / trophy
    { bg: '#FFFBEB', border: '#FDE68A' }, // Amber / gold star
    { bg: '#F0F9FF', border: '#BAE6FD' }, // Sky / water
  ];

  const displayBadges = badges.length > 0
    ? badges.map((b, idx) => {
        const palette = BADGE_COLOR_PALETTES[idx % BADGE_COLOR_PALETTES.length];
        return {
          title: b.title,
          image: resolveBadgeImage(b),
          bg: palette.bg,
          border: palette.border,
          is_unlocked: b.is_unlocked,
        };
      })
    : DEFAULT_BADGES;

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchRewards(),
      useHabitStore.getState().fetchHabits(),
    ]);
    setRefreshing(false);
  };

  const defaultLeaderboard = LEADERBOARD.map(item => {
    if (item.name === 'You' || item.name.includes('(You)')) {
      return {
        ...item,
        name: user?.name ? `${user.name} (You)` : 'You',
        xp: `${(user?.total_xp ?? summary?.total_xp ?? 0).toLocaleString()} XP`,
      };
    }
    return item;
  });

  const displayLeaderboard = (leaderboard && leaderboard.length > 0 ? leaderboard : defaultLeaderboard).map(item => {
    const isYou = item.name === 'You' || item.name.includes('(You)') || (user?.name && item.name.startsWith(user.name));
    if (isYou) {
      return {
        ...item,
        name: user?.name ? `${user.name} (You)` : 'You',
        xp: `${(user?.total_xp ?? summary?.total_xp ?? 0).toLocaleString()} XP`,
      };
    }
    return item;
  });

  const currentLevelXp = summary?.current_level_xp ?? ((user?.total_xp ?? 0) % 1000);
  const nextLevelXp = summary?.next_level_xp ?? 1000;

  const progressPercent = Math.min(100, Math.max(8, (currentLevelXp / nextLevelXp) * 100));

  // Determine highest streak from either the user's global streak or the individual habits
  const userStreak = user?.streak_count || 0;
  const maxHabitStreak = habits.length > 0 ? Math.max(...habits.map(h => h.current_streak || 0)) : 0;
  const displayStreak = Math.max(userStreak, maxHabitStreak);

  const dynamicAchievements = [
    {
      title: `${displayStreak} Days Streak`,
      subtitle: displayStreak > 0 ? 'Keep going!' : 'Start your streak today!',
      xp: `+${Math.max(10, displayStreak * 10)} XP`,
      image: FIRE_BADGE,
      color: '#EF4444',
    },
    ...ACHIEVEMENTS.slice(1),
  ];

  return (
    <SafeAreaView edges={['bottom']} style={[styles.container, { backgroundColor: bgColor }]}>
      <Header title="Rewards" onBack={() => navigation.goBack()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* XP CARD */}

        <View style={styles.balanceCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.balanceLabel}>Your Balance</Text>

            <Text style={styles.xpText}>
              {(user?.total_xp ?? summary?.total_xp ?? 0).toLocaleString()} XP
            </Text>

            <Text style={styles.levelText}>
              Level {user?.level ?? summary?.level ?? 1}
            </Text>

            <View style={styles.progressBarBg}>
              <Animated.View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>

          <Animated.Image
            source={GIFT_BOX}
            style={[
              styles.giftImage,
              {
                transform: [{ translateY: giftFloat }],
              },
            ]}
          />
        </View>

        {/* BADGES */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Badges</Text>
        </View>

        <View style={styles.badgeRow}>
          {displayBadges.slice(0, 4).map((item, index) => {
            let animatedStyle = {};

            if (index === 0) {
              animatedStyle = {
                transform: [{ scale: fireScale }],
              };
            }

            if (index === 1) {
              animatedStyle = {
                transform: [{ rotate: rotateInterpolate }],
              };
            }

            if (index === 2) {
              animatedStyle = {
                transform: [{ translateY: trophyFloat }],
              };
            }

            if (index === 3) {
              animatedStyle = {
                transform: [{ scale: starGlow }],
              };
            }

            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.85}
                style={styles.badgeCard}
              >
                <Animated.View
                  style={[
                    styles.badgeImageWrapper,
                    {
                      backgroundColor: item.bg,
                      borderColor: item.border || '#E2E8F0',
                      borderWidth: 1.5,
                      opacity: item.is_unlocked ? 1 : 0.65,
                    },
                    animatedStyle,
                  ]}
                >
                  <Image source={item.image} style={styles.badgeImage} />
                  {!item.is_unlocked && (
                    <View style={styles.lockBadgeOverlay}>
                      <Icon name="lock" size={10} color="#FFFFFF" />
                    </View>
                  )}
                </Animated.View>

                <Text
                  style={[
                    styles.badgeText,
                    !item.is_unlocked && { color: '#94A3B8' },
                  ]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* RECENT ACHIEVEMENTS */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Achievements</Text>
        </View>

        <View style={styles.achievementContainer}>
          {dynamicAchievements.map((item, index) => (
            <TouchableOpacity
              activeOpacity={0.85}
              key={index}
              style={styles.achievementCard}
            >
              <View style={styles.achievementLeft}>
                <View style={styles.achievementIconWrapper}>
                  <Image
                    source={item.image}
                    style={styles.achievementImage}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.achievementTitle}>
                    {item.title}
                  </Text>

                  <Text style={styles.achievementSubtitle}>
                    {item.subtitle}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.achievementXP,
                  {
                    color: item.color,
                  },
                ]}
              >
                {item.xp}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* LEADERBOARD */}

        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <Text style={styles.sectionTitle}>Leaderboard</Text>

          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.viewAll}>This Week</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.leaderboardContainer}>
          {displayLeaderboard.map((item, index) => {
            const isYou = item.name === 'You' || item.name.includes('(You)') || item.name === user?.name;
            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.85}
                style={[
                  styles.leaderboardCard,
                  isYou && styles.youCard,
                ]}
              >
              <View style={styles.leaderLeft}>
                <View
                  style={[
                    styles.rankCircle,
                    {
                      backgroundColor: item.bg,
                    },
                  ]}
                >
                  <Text style={styles.rankText}>#{item.rank}</Text>
                </View>

                <View
                  style={[
                    styles.avatarCircle,
                    {
                      backgroundColor: item.bg,
                      overflow: 'hidden',
                    },
                  ]}
                >
                  {isYou && user?.avatar_url ? (
                    <Image source={{ uri: user.avatar_url }} style={{ width: 44, height: 44 }} />
                  ) : (
                    <Text style={styles.avatarEmoji}>{item.avatar}</Text>
                  )}
                </View>

                <View>
                  <Text
                    style={[
                      styles.userName,
                      isYou && styles.youText,
                    ]}
                  >
                    {item.name}
                  </Text>

                  <Text style={styles.userSubText}>
                    Habit Master
                  </Text>
                </View>
              </View>

              <Text style={styles.userXP}>{item.xp}</Text>
            </TouchableOpacity>
          );
        })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },

  //
  // BALANCE CARD
  //

  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.05,
    shadowRadius: 10,

    elevation: 4,
  },

  balanceLabel: {
    fontSize: 12,
    color: '#8B94A7',
    marginBottom: 6,
    fontWeight: '600',
  },

  xpText: {
    fontSize: 30,
    color: '#111827',
    fontWeight: '800',
  },

  levelText: {
    fontSize: 13,
    color: '#8B94A7',
    marginTop: 4,
    marginBottom: 12,
    fontWeight: '500',
  },

  progressBarBg: {
    width: '92%',
    height: 8,
    backgroundColor: '#F1F3F7',
    borderRadius: 999,
    overflow: 'hidden',
  },

  progressBarFill: {
    width: '72%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#FF6B8A',
  },

  giftImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginLeft: 8,
  },

  //
  // SECTION
  //

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },

  viewAll: {
    fontSize: 13,
    color: '#FF6B8A',
    fontWeight: '700',
  },

  //
  // BADGES
  //

  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },

  badgeCard: {
    width: '23%',
    alignItems: 'center',
  },

  badgeImageWrapper: {
    width: 68,
    height: 68,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  badgeImage: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },

  lockBadgeOverlay: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  badgeText: {
    marginTop: 8,
    fontSize: 11.5,
    textAlign: 'center',
    color: '#334155',
    fontWeight: '700',
  },

  //
  // ACHIEVEMENTS
  //

  achievementContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    paddingVertical: 8,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.04,
    shadowRadius: 10,

    elevation: 3,
  },

  achievementCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  achievementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  achievementIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FFF7F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  achievementImage: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },

  achievementTitle: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
  },

  achievementSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#8B94A7',
    fontWeight: '500',
  },

  achievementXP: {
    fontSize: 13,
    fontWeight: '800',
  },

  //
  // LEADERBOARD
  //

  leaderboardContainer: {
    marginTop: 2,
  },

  leaderboardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 14,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.03,
    shadowRadius: 8,

    elevation: 2,
  },

  youCard: {
    borderWidth: 1.5,
    borderColor: '#2ECC71',
    backgroundColor: '#F4FFF8',
  },

  leaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rankCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  rankText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },

  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  avatarEmoji: {
    fontSize: 20,
  },

  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },

  youText: {
    color: '#2ECC71',
  },

  userSubText: {
    fontSize: 12,
    color: '#8B94A7',
    marginTop: 3,
  },

  userXP: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF6B8A',
  },
});

export default RewardsScreen;