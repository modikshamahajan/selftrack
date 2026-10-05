import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform, Alert, Image, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, FadeIn, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Shadow } from '../theme/spacing';
import Card from '../components/Card';
import XPBar from '../components/XPBar';
import ProgressRing from '../components/ProgressRing';
import AIAssistantWidget from '../components/AIAssistantWidget';
import { useAuthStore } from '../store/useAuthStore';
import { useHabitStore } from '../store/useHabitStore';
import { useHealthStore } from '../store/useHealthStore';
import { useJournalStore } from '../store/useJournalStore';
import { useRewardsStore } from '../store/useRewardsStore';
import api from '../services/api';

const { width } = Dimensions.get('window');

const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const user = useAuthStore((state) => state.user);
  const habits = useHabitStore((state) => state.habits);
  const fetchHabits = useHabitStore((state) => state.fetchHabits);
  const toggleHabit = useHabitStore((state) => state.toggleHabit);
  const metrics = useHealthStore((state) => state.metrics);
  const fetchMetricsByDate = useHealthStore((state) => state.fetchMetricsByDate);
  const journalEntries = useJournalStore((state) => state.entries);
  const fetchJournalEntries = useJournalStore((state) => state.fetchEntries);
  const badges = useRewardsStore((state) => state.badges);
  const fetchRewards = useRewardsStore((state) => state.fetchRewards);

  const [aiTip, setAiTip] = useState(
    "You're doing great! You've completed your habits today. Keep it up!"
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const todayJournal = journalEntries.find(e => e.date === todayStr);
  const todayMood = todayJournal?.mood;

  useEffect(() => {
    fetchHabits();
    fetchMetricsByDate(new Date().toISOString().split('T')[0]);
    fetchJournalEntries();
    fetchRewards();
    api.get('/ai/widget-tip')
      .then((res) => {
        if (res.data?.message) setAiTip(res.data.message);
      })
      .catch(() => { });
  }, []);

  // Animation for new badges
  const badgeScale = useSharedValue(1);
  useEffect(() => {
    badgeScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // infinite
      true
    );
  }, []);

  const pulsingBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }]
  }));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning! 👋' : hour < 17 ? 'Good Afternoon! 👋' : 'Good Evening! 👋';
  const name = user?.name ? user.name.split(' ')[0] : 'Alex';
  const totalXP = user?.total_xp || 750;
  const currentXP = totalXP % 1000;
  const level = user?.level || Math.floor(totalXP / 1000) + 1;

  const habitsDone = habits.filter((h) => h.completed).length;
  const habitsPercent = habits.length > 0 ? Math.round((habitsDone / habits.length) * 100) : 75;
  const healthPercent = Math.min(100, Math.round(((metrics?.steps || 4832) / (metrics?.step_goal || 10000)) * 100));

  const todayDateStr = new Date().toISOString().split('T')[0];
  const hasJournalToday = journalEntries.some((e) => e.date === todayDateStr);
  const journalPercent = hasJournalToday ? 100 : (journalEntries.length > 0 ? 50 : 0);

  const displayHabits = habits.slice(0, 3);

  const getValidBadgeIcon = (iconName: string) => {
    if (!iconName) return 'award';
    const name = iconName.toLowerCase();
    if (name.includes('fire') || name === 'zap') return 'zap';
    if (name.includes('sun') || name.includes('morning')) return 'sunrise';
    if (name.includes('target') || name.includes('goal')) return 'target';
    if (name.includes('star')) return 'star';
    if (name.includes('heart')) return 'heart';
    if (name.includes('activity')) return 'activity';
    if (name.includes('shield')) return 'shield';
    return 'award'; // Default safe fallback
  };

  const defaultBadges = [
    { id: 'b1', name: 'Early Bird', icon: 'sunrise', color: '#F59E0B', isNew: true },
    { id: 'b2', name: '7-Day Streak', icon: 'zap', color: '#8B5CF6', isNew: false },
    { id: 'b3', name: 'Goal Crusher', icon: 'target', color: '#10B981', isNew: false },
  ];

  const unlockedBadges = badges.filter((b) => b.is_unlocked).map(b => ({
    id: b.id.toString(),
    name: b.title,
    icon: getValidBadgeIcon(b.image_name),
    color: '#F59E0B',
    isNew: false
  }));

  const recentBadges = unlockedBadges.length >= 3 
    ? unlockedBadges.slice(0, 3)
    : [...unlockedBadges, ...defaultBadges].slice(0, 3);


  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'android' ? Math.max(insets.top, StatusBar.currentHeight || 0) : insets.top;

  return (
    <View style={styles.container}>

      {/* Dynamic Background Gradient */}
      <LinearGradient
        colors={[Colors.primarySoft, Colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.4 }}
        style={[styles.headerBackground, { height: 250 + topInset }]}
      />

      <ScrollView 
        style={styles.scrollContainer} 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingTop: Math.max(topInset + 12, 24), paddingBottom: 110 }
        ]}
      >

        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(600).springify()} style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.name}>{name}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
              <Icon name="bell" size={22} color={Colors.textPrimary} />
              <View style={styles.notifBadge} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })}>
              <LinearGradient colors={['#ffecd2', '#fcb69f'] as const} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {user?.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={{ fontSize: 24 }}>🌟</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* XP Level Bar */}
        <Animated.View entering={FadeInDown.delay(600).duration(600).springify()} style={styles.section}>
          <XPBar currentXP={currentXP} maxXP={1000} level={level} />
        </Animated.View>

        {/* AI Assistant Widget */}
        <Animated.View entering={FadeInDown.delay(700).duration(600).springify()} style={styles.section}>
          <AIAssistantWidget
            message={aiTip}
            onPress={() => navigation.navigate('AIChat')}
          />
        </Animated.View>

        {/* Daily Progress */}
        <Animated.View entering={FadeInDown.delay(200).duration(600).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily Progress</Text>
          </View>
          <View style={styles.progressRow}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('HabitTracker')} style={styles.progressBtn}>
              <Card style={styles.progressCard}>
                <ProgressRing progress={habitsPercent} size={70} color={Colors.primary} strokeWidth={7} />
                <Text style={styles.progressLabel}>Habits</Text>
              </Card>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('MainTabs', { screen: 'Health' })} style={styles.progressBtn}>
              <Card style={styles.progressCard}>
                <ProgressRing progress={healthPercent} size={70} color={Colors.accent} strokeWidth={7} />
                <Text style={styles.progressLabel}>Health</Text>
              </Card>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('MainTabs', { screen: 'Journal' })} style={styles.progressBtn}>
              <Card style={styles.progressCard}>
                <ProgressRing progress={journalPercent} size={70} color={Colors.secondary} strokeWidth={7} />
                <Text style={styles.progressLabel}>Journal</Text>
              </Card>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Habit Streaks */}
        <Animated.View entering={FadeInDown.delay(300).duration(600).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Habit Streaks 🔥</Text>
            <TouchableOpacity onPress={() => navigation.navigate('HabitTracker')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {habits.length === 0 ? (
            <Card style={[styles.habitCard, { alignItems: 'center', paddingVertical: 32 }]}>
              <View style={[styles.habitIcon, { backgroundColor: Colors.primarySoft, width: 64, height: 64, borderRadius: 32, marginBottom: 16 }]}>
                <Icon name="plus-circle" size={32} color={Colors.primary} />
              </View>
              <Text style={[styles.habitName, { marginBottom: 8 }]}>No habits yet</Text>
              <Text style={[styles.habitStreak, { textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 }]}>
                Start building your streaks today! Add your first habit to track your progress.
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 }}
                onPress={() => navigation.navigate('HabitTracker')}
              >
                <Text style={{ color: Colors.textWhite, fontWeight: 'bold' }}>Create Habit</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <Card style={styles.habitCard}>
              {displayHabits.map((habit, index) => (
                <TouchableOpacity
                  key={habit.id}
                  activeOpacity={0.7}
                  onPress={() => toggleHabit(habit.id)}
                  style={[styles.habitRow, index === displayHabits.length - 1 && habits.length <= 3 ? { borderBottomWidth: 0 } : undefined]}
                >
                  <View style={[styles.habitIcon, { backgroundColor: habit.color ? `${habit.color}15` : Colors.primarySoft }]}>
                    <Icon name={(habit.icon as any) || 'check'} size={18} color={habit.color || Colors.primary} />
                  </View>
                  <View style={styles.habitInfo}>
                    <Text style={styles.habitName} numberOfLines={1}>{habit.name}</Text>
                    <Text style={styles.habitStreak}>{`🔥 ${habit.current_streak || 0} / ${habit.streak_target || 7} days`}</Text>
                  </View>
                  <View style={[styles.habitCheck, !habit.completed ? styles.habitUnchecked : undefined]}>
                    <Icon name={habit.completed ? "check" : "circle"} size={16} color={habit.completed ? Colors.textWhite : Colors.textTertiary} />
                  </View>
                </TouchableOpacity>
              ))}
              {habits.length > 3 && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('HabitTracker')}
                  style={{ paddingVertical: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.borderLight }}
                >
                  <Text style={{ ...Typography.caption, color: Colors.primary, fontWeight: '600' }}>View all {habits.length} habits</Text>
                </TouchableOpacity>
              )}
            </Card>
          )}
        </Animated.View>

        {/* Stats Row */}
        <Animated.View entering={FadeInDown.delay(400).duration(600).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Snapshot</Text>
          <View style={styles.statsGrid}>
            <TouchableOpacity activeOpacity={0.8} style={[styles.statItem, { width: (width - 40 - 12) / 2 }]}>
              <View style={[styles.statIconWrapper, { backgroundColor: '#E0F7FA' }]}>
                <Icon name="droplet" size={20} color="#00B4D8" />
              </View>
              <Text style={styles.statValue}>{metrics?.water_glasses !== undefined ? `${metrics.water_glasses}/${metrics.water_goal || 8}` : '0/8'}</Text>
              <Text style={styles.statLabel}>Water Glasses</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.8} style={[styles.statItem, { width: (width - 40 - 12) / 2 }]}>
              <View style={[styles.statIconWrapper, { backgroundColor: '#EBE9FE' }]}>
                <Icon name="moon" size={20} color="#6C5CE7" />
              </View>
              <Text style={styles.statValue}>{metrics?.sleep_hours ? `${metrics.sleep_hours}h` : '0h'}</Text>
              <Text style={styles.statLabel}>Sleep Duration</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.8} style={[styles.statItem, { width: (width - 40 - 12) / 2 }]}>
              <View style={[styles.statIconWrapper, { backgroundColor: '#E5F6EE' }]}>
                <Icon name="trending-up" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.statValue}>{(metrics?.steps || 0).toLocaleString()}</Text>
              <Text style={styles.statLabel}>Steps Taken</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.8} style={[styles.statItem, { width: (width - 40 - 12) / 2 }]}>
              <View style={[styles.statIconWrapper, { backgroundColor: '#FEF3C7' }]}>
                <Icon name="smile" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>{todayMood ? todayMood.charAt(0).toUpperCase() + todayMood.slice(1) : 'None'}</Text>
              <Text style={styles.statLabel}>Overall Mood</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Rewards & Badges */}
        <Animated.View entering={FadeInDown.delay(500).duration(600).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Badges 🏆</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Rewards')}>
              <Text style={styles.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.badgesContainer}>
            {recentBadges.map((badge, index) => {
              const isNew = badge.isNew;
              return (
                <TouchableOpacity key={badge.id} style={{ flex: 1 }} activeOpacity={0.8} onPress={() => navigation.navigate('Rewards')}>
                  <Card style={styles.badgeCard}>
                    {isNew ? (
                      <Animated.View style={[styles.badgeIconWrapper, { backgroundColor: `${badge.color}20` }, pulsingBadgeStyle]}>
                        <Icon name={badge.icon as any} size={28} color={badge.color} />
                      </Animated.View>
                    ) : (
                      <View style={[styles.badgeIconWrapper, { backgroundColor: `${badge.color}10` }]}>
                        <Icon name={badge.icon as any} size={28} color={badge.color} style={{ opacity: 0.7 }} />
                      </View>
                    )}
                    <Text style={styles.badgeName} numberOfLines={1}>{badge.name}</Text>
                    {isNew && <View style={styles.newBadgeTag}><Text style={styles.newBadgeText}>NEW</Text></View>}
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInUp.delay(800).duration(600).springify()} style={[styles.section, { marginBottom: 120 }]}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickBtn} activeOpacity={0.7} onPress={() => navigation.navigate('AIChat')}>
              <LinearGradient colors={['#F0EEFF', '#E0E7FF']} style={styles.quickIcon}>
                <Icon name="message-circle" size={22} color={Colors.primary} />
              </LinearGradient>
              <Text style={styles.quickLabel}>AI Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickBtn} activeOpacity={0.7} onPress={() => navigation.navigate('HabitTracker')}>
              <LinearGradient colors={['#E5F6EE', '#D1FAE5']} style={styles.quickIcon}>
                <Icon name="check-square" size={22} color={Colors.secondary} />
              </LinearGradient>
              <Text style={styles.quickLabel}>Habits</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickBtn} activeOpacity={0.7} onPress={() => navigation.navigate('Analytics')}>
              <LinearGradient colors={['#E8F7FA', '#CFFAFE']} style={styles.quickIcon}>
                <Icon name="bar-chart-2" size={22} color={Colors.accent} />
              </LinearGradient>
              <Text style={styles.quickLabel}>Analytics</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickBtn} activeOpacity={0.7} onPress={() => navigation.navigate('Rewards')}>
              <LinearGradient colors={['#FEF3C7', '#FDE68A']} style={styles.quickIcon}>
                <Icon name="award" size={22} color={Colors.warning} />
              </LinearGradient>
              <Text style={styles.quickLabel}>Rewards</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 250,
  },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 24 },
  headerLeft: {},
  greeting: { ...Typography.body, color: Colors.textSecondary, fontWeight: '500' },
  name: { ...Typography.heading1, color: Colors.textPrimary, letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifBtn: { position: 'relative', padding: 8, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20 },
  notifBadge: { position: 'absolute', top: 6, right: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.error, borderWidth: 2, borderColor: Colors.background },
  avatarContainer: { ...Shadow.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primarySoft, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { ...Typography.subtitle, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.3 },
  seeAll: { ...Typography.caption, color: Colors.primary, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 4, backgroundColor: Colors.primarySoft, borderRadius: 12 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  progressBtn: { flex: 1 },
  progressCard: { alignItems: 'center', paddingVertical: 18, paddingHorizontal: 8, borderRadius: BorderRadius.xl, ...Shadow.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.borderLight },
  progressLabel: { ...Typography.caption, color: Colors.textSecondary, marginTop: 12, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  statItem: { alignItems: 'flex-start', padding: 18, borderRadius: BorderRadius.xl, ...Shadow.sm, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.borderLight },
  statIconWrapper: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  statValue: { ...Typography.heading3, color: Colors.textPrimary, marginBottom: 2 },
  statLabel: { ...Typography.caption, color: Colors.textSecondary, fontSize: 13 },
  habitCard: { padding: 8, borderRadius: BorderRadius.xl, ...Shadow.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.borderLight },
  habitRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  habitIcon: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  habitInfo: { flex: 1, marginRight: 12 },
  habitName: { ...Typography.body, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  habitStreak: { ...Typography.caption, color: Colors.textSecondary, fontSize: 13 },
  habitCheck: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', ...Shadow.sm },
  habitUnchecked: { backgroundColor: Colors.backgroundGray, borderWidth: 1, borderColor: Colors.border, shadowOpacity: 0 },
  badgesContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  badgeCard: { flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 4, borderRadius: BorderRadius.xl, ...Shadow.sm, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.borderLight, position: 'relative' },
  badgeIconWrapper: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  badgeName: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '600', textAlign: 'center' },
  newBadgeTag: { position: 'absolute', top: -6, right: -6, backgroundColor: Colors.error, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 2, borderColor: Colors.background },
  newBadgeText: { color: Colors.textWhite, fontSize: 9, fontWeight: 'bold' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  quickBtn: { alignItems: 'center', width: '23%' },
  quickIcon: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 10, ...Shadow.sm },
  quickLabel: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
});

export default HomeScreen;