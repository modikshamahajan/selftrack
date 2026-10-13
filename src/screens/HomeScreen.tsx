import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform, Image, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather as Icon, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';
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
  const foodLogs = useHealthStore((state) => state.foodLogs);
  const fetchFoodLogs = useHealthStore((state) => state.fetchFoodLogs);
  const journalEntries = useJournalStore((state) => state.entries);
  const fetchJournalEntries = useJournalStore((state) => state.fetchEntries);
  const badges = useRewardsStore((state) => state.badges);
  const fetchRewards = useRewardsStore((state) => state.fetchRewards);

  const [aiTip, setAiTip] = useState(
    "Stay mindful and hydrated today! Consistency is your superpower."
  );

  const getTodayStr = (d: Date = new Date()): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const localToday = getTodayStr();
  const utcToday = new Date().toISOString().split('T')[0];
  const todayJournal = journalEntries.find(e => e.date === localToday || e.date === utcToday);
  const todayMood = todayJournal?.mood;

  useFocusEffect(
    useCallback(() => {
      const today = getTodayStr();
      fetchHabits();
      fetchMetricsByDate(today);
      fetchFoodLogs(today);
      fetchJournalEntries();
      fetchRewards();
      api.get('/ai/widget-tip')
        .then((res) => {
          if (res.data?.message) setAiTip(res.data.message);
        })
        .catch(() => { });
    }, [fetchHabits, fetchMetricsByDate, fetchFoodLogs, fetchJournalEntries, fetchRewards])
  );

  // Animation for celebration badges
  const badgeScale = useSharedValue(1);
  useEffect(() => {
    badgeScale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const pulsingBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }]
  }));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const name = user?.name ? user.name.split(' ')[0] : 'Champion';
  const totalXP = user?.total_xp || 0;
  const currentXP = totalXP % 1000;
  const level = user?.level || Math.floor(totalXP / 1000) + 1;
  const streak = user?.streak_count || 3;

  const habitsDone = habits.filter((h) => h.completed).length;
  const habitsPercent = habits.length > 0 ? Math.round((habitsDone / habits.length) * 100) : 0;

  const todayFoodLogs = foodLogs.filter(
    (f) => !f.date || f.date === localToday || f.date === utcToday || f.date.startsWith(localToday) || f.date.startsWith(utcToday)
  );
  const todayCalories = todayFoodLogs.reduce((sum, f) => sum + (f.calories * (f.qty || 1)), 0);

  // Composite Health Progress: Hydration (35%) + Nutrition (35%) + Activity/Steps (30%)
  const waterTarget = metrics?.water_goal || 8;
  const waterCurrent = metrics?.water_glasses || 0;
  const waterRatio = Math.min(1, waterCurrent / waterTarget);

  const stepTarget = metrics?.step_goal || 10000;
  const stepCurrent = metrics?.steps || 0;
  const stepRatio = Math.min(1, stepCurrent / stepTarget);

  // Food ratio: target is logging at least 3 meals/snacks
  const foodRatio = Math.min(1, todayFoodLogs.length / 3);

  const healthScore = (waterRatio * 0.35) + (foodRatio * 0.35) + (stepRatio * 0.30);
  const healthPercent = Math.min(100, Math.round(healthScore * 100));

  const hasJournalToday = journalEntries.some((e) => e.date === localToday || e.date === utcToday);
  const journalPercent = hasJournalToday ? 100 : (journalEntries.length > 0 ? 50 : 0);

  const displayHabits = habits.slice(0, 3);

  const getValidBadgeIcon = (iconName: string) => {
    if (!iconName) return 'award';
    const n = iconName.toLowerCase();
    if (n.includes('fire') || n === 'zap') return 'zap';
    if (n.includes('sun') || n.includes('morning')) return 'sunrise';
    if (n.includes('target') || n.includes('goal')) return 'target';
    if (n.includes('star')) return 'star';
    if (n.includes('heart')) return 'heart';
    if (n.includes('activity')) return 'activity';
    return 'award';
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
      {/* Dynamic Colorful Background Waves */}
      <LinearGradient
        colors={['#E8F3FF', '#EDE9FE', '#F8FAFC']}
        locations={[0, 0.45, 1]}
        style={[styles.headerBackground, { height: 320 + topInset }]}
      />

      <ScrollView 
        style={styles.scrollContainer} 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingTop: Math.max(topInset + 8, 20), paddingBottom: 110 }
        ]}
      >
        {/* TOP BAR / GREETING */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>{greeting} ✨</Text>
            </View>
            <Text style={styles.name}>{name}</Text>
          </View>

          <View style={styles.topBarRight}>
            {/* Streak Badge */}
            <View style={styles.streakBadge}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakCount}>{streak}</Text>
            </View>

            {/* Notification Bell */}
            <TouchableOpacity 
              style={styles.circleBtn} 
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.8}
            >
              <Icon name="bell" size={20} color="#1E293B" />
              <View style={styles.notifDot} />
            </TouchableOpacity>

            {/* Profile Avatar */}
            <TouchableOpacity 
              onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#FF8A00', '#E52E71']} style={styles.avatarBorder}>
                <View style={styles.avatarInner}>
                  {user?.avatar_url ? (
                    <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
                  ) : (
                    <Text style={{ fontSize: 20 }}>🌟</Text>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* HERO LEVEL & XP PROGRESS CARD */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.section}>
          <LinearGradient
            colors={['#4F46E5', '#7C3AED', '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroTopRow}>
              <View>
                <View style={styles.levelTag}>
                  <Text style={styles.levelTagText}>LEVEL {level}</Text>
                </View>
                <Text style={styles.heroTitle}>Master of Consistency</Text>
              </View>
              <View style={styles.xpCircle}>
                <Text style={styles.xpCircleNumber}>{totalXP}</Text>
                <Text style={styles.xpCircleLabel}>TOTAL XP</Text>
              </View>
            </View>

            <View style={styles.heroProgressWrapper}>
              <View style={styles.heroProgressHeader}>
                <Text style={styles.heroProgressText}>{currentXP} / 1000 XP to Level {level + 1}</Text>
                <Text style={styles.heroProgressPercent}>{Math.round((currentXP / 1000) * 100)}%</Text>
              </View>
              <View style={styles.heroProgressBarBg}>
                <LinearGradient
                  colors={['#38BDF8', '#34D399']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.heroProgressBarFill, { width: `${Math.max(6, Math.min(100, (currentXP / 1000) * 100))}%` }]}
                />
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* DAILY PROGRESS CIRCLES */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily Progress</Text>
            <Text style={styles.sectionSubtitle}>Tap to jump in</Text>
          </View>

          <View style={styles.progressCardsRow}>
            {/* Habits Ring */}
            <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={() => navigation.navigate('MainTabs', { screen: 'Habits' })} 
              style={styles.progressTile}
            >
              <LinearGradient colors={['#FFF', '#F0FDF4']} style={styles.tileGradient}>
                <ProgressRing progress={habitsPercent} size={64} color="#10B981" strokeWidth={6} />
                <Text style={styles.tileTitle}>Habits</Text>
                <Text style={[styles.tileStatus, { color: '#059669' }]}>{habitsDone}/{habits.length}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Health Ring */}
            <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={() => navigation.navigate('MainTabs', { screen: 'Health' })} 
              style={styles.progressTile}
            >
              <LinearGradient colors={['#FFF', '#EFF6FF']} style={styles.tileGradient}>
                <ProgressRing progress={healthPercent} size={64} color="#3B82F6" strokeWidth={6} />
                <Text style={styles.tileTitle}>Health</Text>
                <Text style={[styles.tileStatus, { color: '#2563EB' }]}>
                  {healthPercent > 0 ? `${healthPercent}%` : '0%'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Journal Ring */}
            <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={() => navigation.navigate('MainTabs', { screen: 'Journal' })} 
              style={styles.progressTile}
            >
              <LinearGradient colors={['#FFF', '#FAF5FF']} style={styles.tileGradient}>
                <ProgressRing progress={journalPercent} size={64} color="#A855F7" strokeWidth={6} />
                <Text style={styles.tileTitle}>Journal</Text>
                <Text style={[styles.tileStatus, { color: '#9333EA' }]}>{hasJournalToday ? 'Done ✨' : 'Pending'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* AI ASSISTANT SMART TIP */}
        <Animated.View entering={FadeInDown.delay(350).duration(500)} style={styles.section}>
          <TouchableOpacity 
            activeOpacity={0.85}
            onPress={() => navigation.navigate('AIChat')}
          >
            <LinearGradient
              colors={['#FFF', '#FDF4FF']}
              style={styles.aiTipCard}
            >
              <View style={styles.aiIconBubble}>
                <LinearGradient colors={['#EC4899', '#8B5CF6']} style={styles.aiIconGradient}>
                  <Icon name="zap" size={18} color="#FFF" />
                </LinearGradient>
              </View>
              <View style={styles.aiTextContainer}>
                <View style={styles.aiBadgeRow}>
                  <Text style={styles.aiBadgeText}>AI INSIGHT</Text>
                </View>
                <Text style={styles.aiMessageText} numberOfLines={2}>{aiTip}</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#C084FC" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* TODAY'S HABITS LIST */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.sectionTitle}>Today's Focus</Text>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{habitsDone}/{habits.length}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Habits' })}>
              <Text style={styles.seeAllText}>View All →</Text>
            </TouchableOpacity>
          </View>

          {habits.length === 0 ? (
            <Card style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Icon name="plus" size={28} color="#4F46E5" />
              </View>
              <Text style={styles.emptyTitle}>No habits yet</Text>
              <Text style={styles.emptySubtitle}>Start your journey by adding your first daily habit.</Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => navigation.navigate('MainTabs', { screen: 'Habits' })}
              >
                <Text style={styles.emptyAddBtnText}>+ Add First Habit</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <Card style={styles.habitsWrapperCard}>
              {displayHabits.map((habit, index) => {
                const habitColor = habit.color || '#4F46E5';
                return (
                  <TouchableOpacity
                    key={habit.id}
                    activeOpacity={0.7}
                    onPress={() => toggleHabit(habit.id)}
                    style={[
                      styles.habitRowItem,
                      index === displayHabits.length - 1 ? { borderBottomWidth: 0 } : undefined
                    ]}
                  >
                    <View style={[styles.habitColorAccent, { backgroundColor: habitColor }]} />
                    <View style={[styles.habitIconBox, { backgroundColor: `${habitColor}18` }]}>
                      <Icon name={(habit.icon as any) || 'check'} size={18} color={habitColor} />
                    </View>
                    <View style={styles.habitMeta}>
                      <Text style={[styles.habitName, habit.completed && styles.habitCompletedText]} numberOfLines={1}>
                        {habit.name}
                      </Text>
                      <Text style={styles.habitSubDetail}>
                        🔥 {habit.current_streak || 0} day streak • Target: {habit.streak_target || 7}d
                      </Text>
                    </View>
                    <View style={[styles.habitCheckCircle, habit.completed && { backgroundColor: habitColor, borderColor: habitColor }]}>
                      {habit.completed ? (
                        <Icon name="check" size={16} color="#FFF" />
                      ) : (
                        <View style={styles.habitUncheckedDot} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Card>
          )}
        </Animated.View>

        {/* TODAY'S METRICS SNAPSHOT */}
        <Animated.View entering={FadeInDown.delay(450).duration(500)} style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Vitals</Text>
          <View style={styles.vitalsGrid}>
            {/* Water */}
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Health' })}
              style={styles.vitalCard}
            >
              <LinearGradient colors={['#E0F2FE', '#BAE6FD']} style={styles.vitalIconWrap}>
                <Ionicons name="water" size={20} color="#0284C7" />
              </LinearGradient>
              <Text style={styles.vitalValue}>{metrics?.water_glasses || 0} / {metrics?.water_goal || 8}</Text>
              <Text style={styles.vitalLabel}>Water Glasses</Text>
            </TouchableOpacity>

            {/* Food / Nutrition */}
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Health' })}
              style={styles.vitalCard}
            >
              <LinearGradient colors={['#FEF3C7', '#FDE68A']} style={styles.vitalIconWrap}>
                <Ionicons name="restaurant" size={20} color="#D97706" />
              </LinearGradient>
              <Text style={styles.vitalValue}>
                {todayCalories > 0 ? `${todayCalories} kcal` : `${todayFoodLogs.length} logged`}
              </Text>
              <Text style={styles.vitalLabel}>
                {todayFoodLogs.length > 0 ? `${todayFoodLogs.length} meals logged` : 'Food Logged'}
              </Text>
            </TouchableOpacity>

            {/* Steps */}
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Health' })}
              style={styles.vitalCard}
            >
              <LinearGradient colors={['#DCFCE7', '#BBF7D0']} style={styles.vitalIconWrap}>
                <Ionicons name="walk" size={20} color="#16A34A" />
              </LinearGradient>
              <Text style={styles.vitalValue}>{(metrics?.steps || 0).toLocaleString()}</Text>
              <Text style={styles.vitalLabel}>Daily Steps</Text>
            </TouchableOpacity>

            {/* Sleep */}
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Health' })}
              style={styles.vitalCard}
            >
              <LinearGradient colors={['#EDE9FE', '#DDD6FE']} style={styles.vitalIconWrap}>
                <Ionicons name="moon" size={20} color="#7C3AED" />
              </LinearGradient>
              <Text style={styles.vitalValue}>{metrics?.sleep_hours ? `${metrics.sleep_hours}h` : '7.5h'}</Text>
              <Text style={styles.vitalLabel}>Sleep Duration</Text>
            </TouchableOpacity>

            {/* Calories Burned */}
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Health' })}
              style={styles.vitalCard}
            >
              <LinearGradient colors={['#FFE4E6', '#FECDD3']} style={styles.vitalIconWrap}>
                <Ionicons name="flame" size={20} color="#E11D48" />
              </LinearGradient>
              <Text style={styles.vitalValue}>
                {metrics?.calories_burned ? `${metrics.calories_burned} kcal` : `${Math.round((metrics?.steps || 0) * 0.04)} kcal`}
              </Text>
              <Text style={styles.vitalLabel}>Calories Burned</Text>
            </TouchableOpacity>

            {/* Mood */}
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Journal' })}
              style={styles.vitalCard}
            >
              <LinearGradient colors={['#E0E7FF', '#C7D2FE']} style={styles.vitalIconWrap}>
                <Ionicons name="happy" size={20} color="#4F46E5" />
              </LinearGradient>
              <Text style={styles.vitalValue}>{todayMood ? todayMood.toUpperCase() : 'CHECK-IN'}</Text>
              <Text style={styles.vitalLabel}>Mind & Mood</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ACHIEVEMENTS & BADGES */}
        <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trophy Showcase 🏆</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Rewards')}>
              <Text style={styles.seeAllText}>Leaderboard →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.badgesRow}>
            {recentBadges.map((badge) => {
              const isNew = badge.isNew;
              return (
                <TouchableOpacity 
                  key={badge.id} 
                  style={{ flex: 1 }} 
                  activeOpacity={0.8} 
                  onPress={() => navigation.navigate('Rewards')}
                >
                  <Card style={styles.badgeTile}>
                    {isNew ? (
                      <Animated.View style={[styles.badgeIconWrapper, { backgroundColor: `${badge.color}25` }, pulsingBadgeStyle]}>
                        <Icon name={badge.icon as any} size={26} color={badge.color} />
                      </Animated.View>
                    ) : (
                      <View style={[styles.badgeIconWrapper, { backgroundColor: `${badge.color}18` }]}>
                        <Icon name={badge.icon as any} size={26} color={badge.color} />
                      </View>
                    )}
                    <Text style={styles.badgeName} numberOfLines={1}>{badge.name}</Text>
                    {isNew && (
                      <View style={styles.badgeNewTag}>
                        <Text style={styles.badgeNewTagText}>NEW</Text>
                      </View>
                    )}
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* QUICK SHORTCUT ACTIONS */}
        <Animated.View entering={FadeInUp.delay(550).duration(500)} style={[styles.section, { marginBottom: 40 }]}>
          <Text style={styles.sectionTitle}>Quick Shortcuts</Text>
          <View style={styles.quickGrid}>
            <TouchableOpacity 
              style={styles.quickTile} 
              activeOpacity={0.7} 
              onPress={() => navigation.navigate('AIChat')}
            >
              <LinearGradient colors={['#818CF8', '#4F46E5']} style={styles.quickIconWrap}>
                <Icon name="message-square" size={22} color="#FFF" />
              </LinearGradient>
              <Text style={styles.quickLabel}>AI Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickTile} 
              activeOpacity={0.7} 
              onPress={() => navigation.navigate('MainTabs', { screen: 'Habits' })}
            >
              <LinearGradient colors={['#34D399', '#059669']} style={styles.quickIconWrap}>
                <Icon name="check-circle" size={22} color="#FFF" />
              </LinearGradient>
              <Text style={styles.quickLabel}>Habits</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickTile} 
              activeOpacity={0.7} 
              onPress={() => navigation.navigate('Rewards')}
            >
              <LinearGradient colors={['#FBBF24', '#D97706']} style={styles.quickIconWrap}>
                <Icon name="award" size={22} color="#FFF" />
              </LinearGradient>
              <Text style={styles.quickLabel}>Rewards</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickTile} 
              activeOpacity={0.7} 
              onPress={() => navigation.navigate('Analytics')}
            >
              <LinearGradient colors={['#38BDF8', '#0284C7']} style={styles.quickIconWrap}>
                <Icon name="bar-chart-2" size={22} color="#FFF" />
              </LinearGradient>
              <Text style={styles.quickLabel}>Analytics</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingBottom: 110 },

  // TOP BAR
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  topBarLeft: {},
  greetingRow: { flexDirection: 'row', alignItems: 'center' },
  greeting: { fontSize: 14, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  name: { fontSize: 26, fontWeight: '800', color: '#0F172A', marginTop: 2 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FED7AA',
    ...Shadow.sm,
  },
  streakIcon: { fontSize: 14, marginRight: 4 },
  streakCount: { fontSize: 14, fontWeight: '800', color: '#EA580C' },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    ...Shadow.sm,
  },
  notifDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  avatarBorder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },

  // SECTION GENERAL
  section: { paddingHorizontal: 20, marginBottom: 22 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  seeAllText: { fontSize: 13, fontWeight: '700', color: '#4F46E5' },
  countPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countPillText: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },

  // HERO CARD
  heroCard: {
    borderRadius: 24,
    padding: 20,
    ...Shadow.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  levelTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  levelTagText: { color: '#FFF', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  xpCircle: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  xpCircleNumber: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  xpCircleLabel: { color: '#E0E7FF', fontSize: 9, fontWeight: '700' },
  heroProgressWrapper: {},
  heroProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heroProgressText: { color: '#E0E7FF', fontSize: 12, fontWeight: '600' },
  heroProgressPercent: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  heroProgressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  heroProgressBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // DAILY PROGRESS CARDS
  progressCardsRow: { flexDirection: 'row', gap: 12 },
  progressTile: { flex: 1 },
  tileGradient: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.sm,
  },
  tileTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginTop: 10 },
  tileStatus: { fontSize: 12, fontWeight: '800', marginTop: 2 },

  // AI TIP CARD
  aiTipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0ABFC',
    ...Shadow.sm,
  },
  aiIconBubble: { marginRight: 12 },
  aiIconGradient: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiTextContainer: { flex: 1 },
  aiBadgeRow: { marginBottom: 2 },
  aiBadgeText: { fontSize: 10, fontWeight: '800', color: '#A855F7', letterSpacing: 0.8 },
  aiMessageText: { fontSize: 13, color: '#334155', fontWeight: '500', lineHeight: 18 },

  // HABITS LIST
  habitsWrapperCard: {
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFF',
    ...Shadow.sm,
  },
  habitRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    position: 'relative',
  },
  habitColorAccent: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 4,
    borderRadius: 2,
  },
  habitIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  habitMeta: { flex: 1 },
  habitName: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  habitCompletedText: { textDecorationLine: 'line-through', color: '#94A3B8' },
  habitSubDetail: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  habitCheckCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  habitUncheckedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.sm,
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 16 },
  emptyAddBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyAddBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  // VITALS
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  vitalCard: {
    width: (width - 40 - 12) / 2,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Shadow.sm,
  },
  vitalIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  vitalValue: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  vitalLabel: { fontSize: 12, color: '#64748B', fontWeight: '500' },

  // BADGES
  badgesRow: { flexDirection: 'row', gap: 10 },
  badgeTile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    position: 'relative',
    ...Shadow.sm,
  },
  badgeIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeName: { fontSize: 12, fontWeight: '700', color: '#1E293B', textAlign: 'center' },
  badgeNewTag: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  badgeNewTagText: { color: '#FFF', fontSize: 9, fontWeight: '900' },

  // QUICK SHORTCUTS
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 12,
    marginBottom: 8,
    ...Shadow.sm,
  },
  quickTile: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  quickIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    ...Shadow.md,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 0.2,
  },
});

export default HomeScreen;