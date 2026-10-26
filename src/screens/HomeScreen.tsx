import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Feather as Icon, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Shadow } from '../theme/spacing';
import Card from '../components/Card';
import ProgressRing from '../components/ProgressRing';
import CelebrationModal from '../components/CelebrationModal';
import { MysteryChestModal } from '../components/MysteryChestModal';
import { WelcomeBonusAlert } from '../components/WelcomeBonusAlert';
import { useAuthStore } from '../store/useAuthStore';
import { useHabitStore } from '../store/useHabitStore';
import { useHealthStore } from '../store/useHealthStore';
import { useJournalStore } from '../store/useJournalStore';
import { useRewardsStore } from '../store/useRewardsStore';
import { useSpecialEventStore } from '../store/useSpecialEventStore';
import { useQuestStore } from '../store/useQuestStore';
import { SpecialEvent, EVENT_TYPE_METAS } from '../types/specialEvents';
import { getEventCountdownLabel, getNextOccurrenceDate } from '../services/specialEvents';
import { useMenstrualStore, calculateCycleInfo } from '../store/useMenstrualStore';
import api from '../services/api';

const { width } = Dimensions.get('window');

const HomeScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
  const user = useAuthStore((state) => state.user);
  const habits = useHabitStore((state) => state.habits);
  const fetchHabits = useHabitStore((state) => state.fetchHabits);
  const metrics = useHealthStore((state) => state.metrics);
  const fetchMetricsByDate = useHealthStore((state) => state.fetchMetricsByDate);
  const foodLogs = useHealthStore((state) => state.foodLogs);
  const fetchFoodLogs = useHealthStore((state) => state.fetchFoodLogs);
  const journalEntries = useJournalStore((state) => state.entries);
  const fetchJournalEntries = useJournalStore((state) => state.fetchEntries);
  const badges = useRewardsStore((state) => state.badges);
  const fetchRewards = useRewardsStore((state) => state.fetchRewards);

  // Special Events & Celebrations State
  const specialEvents = useSpecialEventStore((state) => state.events);
  const loadSpecialEvents = useSpecialEventStore((state) => state.loadEvents);
  const [selectedCelebrationEvent, setSelectedCelebrationEvent] = useState<SpecialEvent | null>(null);
  const [hasAutoOpenedCelebration, setHasAutoOpenedCelebration] = useState(false);

  // Welcome Bonus 100 XP Alert State (Cashback/Coupon Style)
  const [welcomeBonusAlertVisible, setWelcomeBonusAlertVisible] = useState(false);
  const bonusTimerRef = useRef<any>(null);

  // Check on screen load/focus: show once on first login or registration
  useFocusEffect(
    useCallback(() => {
      const evaluateWelcomeBonus = async () => {
        const currentUser = useAuthStore.getState().user;
        const isPending = useAuthStore.getState().hasPendingWelcomeBonus;
        const routeBonus = route?.params?.showWelcomeBonus;

        const userKey = currentUser?.id || currentUser?.phone;
        const bonusKey = userKey ? `@selftrack_welcome_bonus_seen_${userKey}` : null;
        const alreadySeen = bonusKey ? await AsyncStorage.getItem(bonusKey) : null;

        // If explicitly pending from register/login OR this user has never seen it
        if (isPending || routeBonus || (userKey && !alreadySeen)) {
          useAuthStore.getState().setHasPendingWelcomeBonus(false);
          if (route?.params?.showWelcomeBonus) {
            navigation.setParams({ showWelcomeBonus: undefined });
          }

          if (bonusTimerRef.current) clearTimeout(bonusTimerRef.current);
          bonusTimerRef.current = setTimeout(() => {
            setWelcomeBonusAlertVisible(true);
          }, 350);
        }
      };

      evaluateWelcomeBonus();

      return () => {
        if (bonusTimerRef.current) {
          clearTimeout(bonusTimerRef.current);
          bonusTimerRef.current = null;
        }
      };
    }, [navigation, route?.params?.showWelcomeBonus])
  );

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
  const todayJournal = (journalEntries || []).find(e => e && (e.date === localToday || e.date === utcToday));
  const todayMood = todayJournal?.mood;

  const menstrualSettings = useMenstrualStore((state) => state.settings);
  const menstrualLogs = useMenstrualStore((state) => state.dailyLogs);
  const homeCycleInfo = useMemo(() => {
    try {
      return calculateCycleInfo(localToday, menstrualSettings, menstrualLogs);
    } catch {
      return {
        cycleDay: 0,
        phase: 'menstrual',
        phaseTitle: "Women's Health",
        phaseDescription: 'Start logging your period or set your last period date to begin tracking.',
        fertilityChance: 'Low',
        daysUntilNextPeriod: 0,
        nextPeriodDate: '--',
        isPeriodActive: false,
        themeColor: '#64748B',
        badgeEmoji: '🌸',
        isInitialized: false,
      };
    }
  }, [localToday, menstrualSettings, menstrualLogs]);

  useFocusEffect(
    useCallback(() => {
      const today = getTodayStr();
      fetchHabits();
      fetchMetricsByDate(today);
      fetchFoodLogs(today);
      fetchJournalEntries();
      fetchRewards();
      loadSpecialEvents();
      api.get('/ai/widget-tip')
        .then((res) => {
          if (res.data?.message) setAiTip(res.data.message);
        })
        .catch(() => { });
    }, [fetchHabits, fetchMetricsByDate, fetchFoodLogs, fetchJournalEntries, fetchRewards, loadSpecialEvents])
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const name = user?.name ? user.name.split(' ')[0] : 'Champion';
  const totalXP = user?.total_xp || 0;
  const currentXP = totalXP % 1000;
  const level = user?.level || Math.floor(totalXP / 1000) + 1;
  const streak = user?.streak_count ?? 0;

  // Accurate Habit Completion Check for Today
  const isHabitCompletedToday = useCallback((h: any): boolean => {
    if (!h) return false;
    return Boolean(h.completed_days?.[localToday] || h.completed_days?.[utcToday] || h.completed);
  }, [localToday, utcToday]);

  const { habitsDone, habitsPercent } = useMemo(() => {
    const list = Array.isArray(habits) ? habits : [];
    const done = list.filter(isHabitCompletedToday).length;
    const percent = list.length > 0 ? Math.round((done / list.length) * 100) : 0;
    return { habitsDone: done, habitsPercent: percent };
  }, [habits, isHabitCompletedToday]);

  const { todayFoodLogs, todayCalories, foodRatio } = useMemo(() => {
    const list = Array.isArray(foodLogs) ? foodLogs : [];
    const logs = list.filter(
      (f) => f && (f.date === localToday || f.date === utcToday || f.date?.startsWith?.(localToday) || f.date?.startsWith?.(utcToday))
    );
    const calories = logs.reduce((sum, f) => sum + ((f?.calories || 0) * (typeof f?.qty === 'number' ? f.qty : 1)), 0);
    const ratio = Math.min(1, logs.length / 3);
    return { todayFoodLogs: logs, todayCalories: calories, foodRatio: ratio };
  }, [foodLogs, localToday, utcToday]);

  const hasJournalToday = useMemo(
    () => (Array.isArray(journalEntries) ? journalEntries : []).some((e) => e && (e.date === localToday || e.date === utcToday)),
    [journalEntries, localToday, utcToday]
  );
  const journalPercent = hasJournalToday ? 100 : (journalEntries.length > 0 ? 50 : 0);

  // Composite Health & Vitality Score memoized
  const isMetricsToday = metrics?.date === localToday || metrics?.date === utcToday || !metrics?.date;
  const waterTarget = metrics?.water_goal || 8;
  const waterCurrent = isMetricsToday ? (metrics?.water_glasses || 0) : 0;
  const waterRatio = Math.min(1, waterCurrent / waterTarget);

  const stepTarget = metrics?.step_goal || 10000;
  const stepCurrent = isMetricsToday ? (metrics?.steps || 0) : 0;
  const stepRatio = Math.min(1, stepCurrent / stepTarget);

  const { healthPercent, vitalityScore } = useMemo(() => {
    if (waterCurrent === 0 && habitsDone === 0 && stepCurrent === 0 && foodLogs.length === 0 && !hasJournalToday) {
      return { healthScore: 0, healthPercent: 0, vitalityScore: 0 };
    }

    const hScore = (waterRatio * 0.35) + (foodRatio * 0.35) + (stepRatio * 0.30);
    const hPercent = Math.min(100, Math.round(hScore * 100));

    const habitsRatio = habits.length > 0 ? (habitsDone / habits.length) : 0;
    const vScore = Math.min(
      100,
      Math.round(
        waterRatio * 30 +
        habitsRatio * 35 +
        stepRatio * 20 +
        ((hasJournalToday ? 1 : 0) * 0.5 + foodRatio * 0.5) * 15
      )
    );
    return { healthScore: hScore, healthPercent: hPercent, vitalityScore: vScore };
  }, [waterRatio, foodRatio, stepRatio, habits.length, habitsDone, hasJournalToday, waterCurrent, stepCurrent, foodLogs.length]);

  const getVitalityMeta = (score: number) => {
    if (score >= 85) return { label: 'Peak Vitality ✨', color: '#10B981', bg: '#ECFDF5', subtitle: 'You are thriving today! Great consistency.' };
    if (score >= 60) return { label: 'Strong Momentum ⚡', color: '#3B82F6', bg: '#EFF6FF', subtitle: 'Solid progress! A couple more goals to hit peak state.' };
    if (score >= 35) return { label: 'Active & Building 🌿', color: '#F59E0B', bg: '#FFFBEB', subtitle: 'Good start. Log your water or habits to boost your score.' };
    return { label: 'Fresh Start 🌱', color: '#8B5CF6', bg: '#FAF5FF', subtitle: 'Begin your day with a glass of water & your first habit.' };
  };
  const vitalityMeta = getVitalityMeta(vitalityScore);

  // Daily Quests & Mystery Chest State
  const { quests, chestClaimed, streakShields, syncDailyQuests, claimMysteryChest } = useQuestStore();
  const [chestModalVisible, setChestModalVisible] = useState(false);
  const [claimedReward, setClaimedReward] = useState<{ xp: number; shieldAdded: boolean; message: string } | null>(null);

  useEffect(() => {
    syncDailyQuests({
      habits,
      waterGlasses: waterCurrent,
      habitsDone,
      steps: stepCurrent,
      hasJournal: hasJournalToday,
    });
  }, [habits, waterCurrent, habitsDone, stepCurrent, hasJournalToday]);

  const handleOpenChest = () => {
    const res = claimMysteryChest();
    if (res) {
      setClaimedReward(res);
      setChestModalVisible(true);
    }
  };

  const completedQuestsCount = useMemo(() => quests.filter((q) => q.completed).length, [quests]);

  const displayHabits = useMemo(() => habits.slice(0, 3), [habits]);

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

  const unlockedBadges = useMemo(
    () => (Array.isArray(badges) ? badges : []).filter((b) => b && b.is_unlocked).map((b) => ({
      id: (b?.id != null) ? b.id.toString() : Math.random().toString(),
      name: b.title || 'Badge',
      icon: getValidBadgeIcon(b.image_name),
      color: '#F59E0B',
      isNew: false
    })),
    [badges]
  );

  const recentBadges = useMemo(
    () => unlockedBadges.slice(0, 3),
    [unlockedBadges]
  );

  // Nearest / Today's Special Event Celebration
  const todayCelebrationEvent = useMemo(() => {
    try {
      const enabledEvents = (Array.isArray(specialEvents) ? specialEvents : []).filter((e) => e && e.enabled);
      if (enabledEvents.length === 0) return null;
      const sorted = [...enabledEvents].sort(
        (a, b) => getNextOccurrenceDate(a).getTime() - getNextOccurrenceDate(b).getTime()
      );
      const nearest = sorted[0];
      if (!nearest) return null;
      const countdown = getEventCountdownLabel(nearest);
      if (
        countdown &&
        (countdown.isToday ||
        countdown.label?.includes('Tomorrow') ||
        countdown.label?.includes('In 2 days') ||
        countdown.label?.includes('In 3 days'))
      ) {
        return { event: nearest, countdown };
      }
      return null;
    } catch {
      return null;
    }
  }, [specialEvents]);

  // Auto-launch celebration modal once on app open if an event is happening Today!
  useEffect(() => {
    if (todayCelebrationEvent?.countdown.isToday && !hasAutoOpenedCelebration) {
      const timer = setTimeout(() => {
        setSelectedCelebrationEvent(todayCelebrationEvent.event);
        setHasAutoOpenedCelebration(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [todayCelebrationEvent, hasAutoOpenedCelebration]);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar style="dark" />
      {/* Dynamic Colorful Background Waves */}
      <LinearGradient
        colors={['#E8F3FF', '#EDE9FE', '#F8FAFC']}
        locations={[0, 0.45, 1]}
        style={styles.headerBackground}
      />

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* TOP BAR / GREETING */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <View style={styles.brandProfileRow}>
              <View style={styles.appIconWrapper}>
                <Image
                  source={require('../../assets/icon.png')}
                  style={styles.appIconImage}
                  resizeMode="contain"
                />
              </View>
              <View>
                <Text style={styles.greeting}>{greeting} ✨</Text>
                <Text style={styles.name}>{name}</Text>
              </View>
            </View>
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
        </View>

        {/* CELEBRATION SPOTLIGHT BANNER */}
        {todayCelebrationEvent ? (
          <View style={styles.celebrationBannerWrapper}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={[
                styles.celebrationBannerCard,
                { borderColor: (EVENT_TYPE_METAS[todayCelebrationEvent.event.type]?.color || '#EC4899') + '55' },
              ]}
              onPress={() => setSelectedCelebrationEvent(todayCelebrationEvent.event)}
            >
              <LinearGradient
                colors={['#FFF5F5', '#FDF2F8', '#FAF5FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.celebrationBannerInner}
              >
                <View style={styles.celebrationIconBox}>
                  <Text style={{ fontSize: 26 }}>
                    {EVENT_TYPE_METAS[todayCelebrationEvent.event.type]?.emoji || '🎉'}
                  </Text>
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <View style={styles.celebrationTagRow}>
                    <Text
                      style={[
                        styles.celebrationTagText,
                        { color: EVENT_TYPE_METAS[todayCelebrationEvent.event.type]?.color || '#EC4899' },
                      ]}
                    >
                      {todayCelebrationEvent.countdown.isToday ? '🎉 TODAY\'S CELEBRATION!' : '✨ UPCOMING EVENT'}
                    </Text>
                    <View
                      style={[
                        styles.celebrationPill,
                        todayCelebrationEvent.countdown.isToday && styles.celebrationPillToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.celebrationPillText,
                          todayCelebrationEvent.countdown.isToday && styles.celebrationPillTextToday,
                        ]}
                      >
                        {todayCelebrationEvent.countdown.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.celebrationTitle} numberOfLines={1}>
                    {todayCelebrationEvent.event.title}
                  </Text>
                  <Text style={styles.celebrationSubtitle} numberOfLines={1}>
                    {todayCelebrationEvent.event.sendSms
                      ? `📱 SMS: ${todayCelebrationEvent.event.smsFrequencyCount || 1}x to phone • Tap to celebrate 🥂`
                      : 'Tap to celebrate & view wishes 🥂'}
                  </Text>
                </View>
                <View style={styles.celebrationActionArrow}>
                  <Icon
                    name="chevron-right"
                    size={18}
                    color={EVENT_TYPE_METAS[todayCelebrationEvent.event.type]?.color || '#E11D48'}
                  />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* HERO LEVEL & XP PROGRESS CARD */}
        <View style={styles.section}>
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
        </View>

        {/* VITALITY COMPANION SCORE */}
        <View style={styles.section}>
          <LinearGradient
            colors={['#FFFFFF', '#F8FAFC']}
            style={styles.vitalityCard}
          >
            <View style={styles.vitalityHeader}>
              <View>
                <Text style={styles.vitalitySectionPre}>DAILY SYNTHESIS</Text>
                <Text style={styles.vitalitySectionTitle}>Vitality Index</Text>
              </View>
              <View style={[styles.vitalityBadge, { backgroundColor: vitalityMeta.bg, borderColor: vitalityMeta.color + '40' }]}>
                <Text style={[styles.vitalityBadgeText, { color: vitalityMeta.color }]}>{vitalityMeta.label}</Text>
              </View>
            </View>

            <View style={styles.vitalityBody}>
              <View style={styles.vitalityRingWrapper}>
                <ProgressRing
                  progress={vitalityScore}
                  size={88}
                  strokeWidth={9}
                  color={vitalityMeta.color}
                  showPercentage={false}
                >
                  <View style={styles.vitalityRingCenter}>
                    <Text style={[styles.vitalityScoreNum, { color: vitalityMeta.color }]}>{vitalityScore}</Text>
                    <Text style={styles.vitalityScoreDenominator}>/100</Text>
                  </View>
                </ProgressRing>
              </View>
              <View style={styles.vitalityInfoWrap}>
                <Text style={styles.vitalitySubtitle}>{vitalityMeta.subtitle}</Text>
                <View style={styles.vitalityPillsGrid}>
                  <View style={styles.vitalityPill}>
                    <Text style={styles.vitalityPillIcon}>💧</Text>
                    <Text style={styles.vitalityPillText}>{waterCurrent}/{waterTarget} gl</Text>
                  </View>
                  <View style={styles.vitalityPill}>
                    <Text style={styles.vitalityPillIcon}>✅</Text>
                    <Text style={styles.vitalityPillText}>{habitsDone}/{habits.length || 0} habits</Text>
                  </View>
                  <View style={styles.vitalityPill}>
                    <Text style={styles.vitalityPillIcon}>👟</Text>
                    <Text style={styles.vitalityPillText}>{stepCurrent.toLocaleString()} steps</Text>
                  </View>
                  <View style={styles.vitalityPill}>
                    <Text style={styles.vitalityPillIcon}>🧘</Text>
                    <Text style={styles.vitalityPillText}>{hasJournalToday ? 'Mindful ✨' : 'Reflect'}</Text>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* DAILY QUESTS & MYSTERY CHEST */}
        <View style={styles.section}>
          <Card style={styles.questsCard}>
            <View style={styles.questsHeader}>
              <View>
                <View style={styles.questsTitleRow}>
                  <Text style={styles.questsSectionTitle}>Daily Quests</Text>
                  <View style={styles.questsCountBadge}>
                    <Text style={styles.questsCountText}>{completedQuestsCount}/3</Text>
                  </View>
                </View>
                <Text style={styles.questsSubtitle}>Complete all 3 to claim the Mystery Chest</Text>
              </View>
              <View style={styles.streakShieldWrap}>
                <Text style={styles.streakShieldIcon}>🛡️</Text>
                <Text style={styles.streakShieldCount}>{streakShields}</Text>
                <Text style={styles.streakShieldLabel}>Shields</Text>
              </View>
            </View>

            <View style={styles.questList}>
              {quests.map((quest) => {
                const questPct = Math.min(100, Math.round((quest.current / quest.target) * 100));
                const unitLabel = quest.category === 'water' ? 'gl' : quest.category === 'habits' ? 'done' : 'pts';
                return (
                  <View key={quest.id} style={[styles.questRow, quest.completed && styles.questRowCompleted]}>
                    <View style={styles.questIconBox}>
                      <Icon name={quest.icon as any} size={18} color={quest.completed ? '#10B981' : '#3B82F6'} />
                    </View>
                    <View style={styles.questDetails}>
                      <View style={styles.questTitleRow}>
                        <Text style={[styles.questTitle, quest.completed && styles.questTitleCompleted]}>
                          {quest.title}
                        </Text>
                        <Text style={styles.questProgressText}>
                          {quest.current}/{quest.target} {unitLabel}
                        </Text>
                      </View>
                      <View style={styles.questTrackBg}>
                        <View
                          style={[
                            styles.questTrackFill,
                            {
                              width: `${questPct}%`,
                              backgroundColor: quest.completed ? '#10B981' : '#3B82F6',
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={[styles.questCheckCircle, quest.completed && styles.questCheckCircleActive]}>
                      {quest.completed ? (
                        <Icon name="check" size={14} color="#FFF" />
                      ) : (
                        <Text style={styles.questXpTag} numberOfLines={1}>+{quest.xpReward}XP</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Mystery Chest Banner */}
            {chestClaimed ? (
              <View style={styles.chestClaimedBanner}>
                <Text style={styles.chestClaimedIcon}>✨</Text>
                <Text style={styles.chestClaimedText}>Mystery Chest Opened Today! Streak shielded & bonus XP banked.</Text>
              </View>
            ) : completedQuestsCount === 3 ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleOpenChest}
                style={styles.chestReadyBtn}
              >
                <LinearGradient
                  colors={['#F59E0B', '#D97706']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.chestReadyGradient}
                >
                  <Text style={styles.chestReadyEmoji}>🎁</Text>
                  <View style={styles.chestReadyInfo}>
                    <Text style={styles.chestReadyTitle}>MYSTERY CHEST UNLOCKED!</Text>
                    <Text style={styles.chestReadySubtitle}>Tap now to claim bonus XP & Streak Shield</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.chestLockedBanner}>
                <Text style={styles.chestLockedEmoji}>🎁</Text>
                <Text style={styles.chestLockedText}>
                  Mystery Chest locked: complete {3 - completedQuestsCount} more quest{3 - completedQuestsCount > 1 ? 's' : ''} to unlock!
                </Text>
              </View>
            )}
          </Card>
        </View>

        {/* DAILY PROGRESS CIRCLES */}
        <View style={styles.section}>
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
        </View>

        {/* AI ASSISTANT SMART TIP */}
        <View style={styles.section}>
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
        </View>

        {/* TODAY'S HABITS LIST */}
        <View style={styles.section}>
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
                const isCompleted = isHabitCompletedToday(habit);
                return (
                  <View
                    key={habit.id}
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
                      <Text style={[styles.habitName, isCompleted && styles.habitCompletedText]} numberOfLines={1}>
                        {habit.name}
                      </Text>
                      <Text style={styles.habitSubDetail}>
                        🔥 {habit.current_streak || 0} day streak • Target: {habit.streak_target || 7}d
                      </Text>
                    </View>
                    <View style={[styles.habitCheckCircle, isCompleted && { backgroundColor: habitColor, borderColor: habitColor }]}>
                      {isCompleted ? (
                        <Icon name="check" size={16} color="#FFF" />
                      ) : (
                        <View style={styles.habitUncheckedDot} />
                      )}
                    </View>
                  </View>
                );
              })}
            </Card>
          )}
        </View>

        {/* TODAY'S METRICS SNAPSHOT */}
        <View style={styles.section}>
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
              <Text style={styles.vitalValue}>{stepCurrent.toLocaleString()}</Text>
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
              <Text style={styles.vitalValue}>{metrics?.sleep_hours && metrics.sleep_hours > 0 ? `${metrics.sleep_hours}h` : '0h'}</Text>
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
                {metrics?.calories_burned ? `${metrics.calories_burned} kcal` : `${Math.round(stepCurrent * 0.04)} kcal`}
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
        </View>

        {/* ACHIEVEMENTS & BADGES */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trophy Showcase 🏆</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Rewards')}>
              <Text style={styles.seeAllText}>Leaderboard →</Text>
            </TouchableOpacity>
          </View>
          {recentBadges.length > 0 ? (
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
                        <View style={[styles.badgeIconWrapper, { backgroundColor: `${badge.color}25` }]}>
                          <Icon name={badge.icon as any} size={26} color={badge.color} />
                        </View>
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
          ) : (
            <Card style={[styles.emptyCard, { paddingVertical: 18, marginTop: 4 }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: '#FEF3C7', width: 44, height: 44, borderRadius: 22, marginBottom: 8 }]}>
                <Icon name="award" size={22} color="#D97706" />
              </View>
              <Text style={[styles.emptyTitle, { fontSize: 15 }]}>No Trophies Unlocked Yet</Text>
              <Text style={[styles.emptySubtitle, { marginBottom: 12, fontSize: 12 }]}>
                Complete daily quests and maintain habit streaks to earn your badges!
              </Text>
              <TouchableOpacity
                style={[styles.emptyAddBtn, { backgroundColor: '#8B5CF6', paddingHorizontal: 16, paddingVertical: 8 }]}
                onPress={() => navigation.navigate('Rewards')}
              >
                <Text style={styles.emptyAddBtnText}>View Badges & Rewards →</Text>
              </TouchableOpacity>
            </Card>
          )}
        </View>

        {/* WOMEN'S HEALTH - CYCLE STATUS WIDGET */}
        <View style={styles.section}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate('MenstrualCycle')}
            style={styles.cycleHomeCard}
          >
            <LinearGradient
              colors={['#FFF1F2', '#FFE4E6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cycleHomeGradient}
            >
              <View style={styles.cycleHomeIconCircle}>
                <Ionicons name="flower" size={24} color="#E11D48" />
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.cycleHomeHeaderRow}>
                  <Text style={styles.cycleHomeBadge}>WOMEN'S HEALTH 🌸</Text>
                  <Text style={styles.cycleHomePhaseBadge}>
                    {homeCycleInfo.isInitialized
                      ? `${homeCycleInfo.badgeEmoji} Day ${homeCycleInfo.cycleDay}`
                      : '🌸 Day 0'}
                  </Text>
                </View>

                <Text style={styles.cycleHomeTitle}>
                  {homeCycleInfo.isInitialized ? homeCycleInfo.phaseTitle : "Women's Health"}
                </Text>
                <Text style={styles.cycleHomeSub} numberOfLines={1}>
                  {homeCycleInfo.isInitialized && homeCycleInfo.daysUntilNextPeriod > 0
                    ? `Next period in ${homeCycleInfo.daysUntilNextPeriod} days (~${homeCycleInfo.nextPeriodDate})`
                    : 'Tap to log cycle & start tracking'}
                </Text>
              </View>

              <View style={styles.cycleHomeArrowCircle}>
                <Icon name="chevron-right" size={18} color="#BE123C" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>



        {/* QUICK SHORTCUT ACTIONS */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <Text style={styles.sectionTitle}>Quick Shortcuts</Text>
          <View style={styles.quickGrid}>
            <TouchableOpacity
              style={styles.quickTile}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('FocusTimer')}
            >
              <LinearGradient colors={['#EC4899', '#BE185D']} style={styles.quickIconWrap}>
                <Ionicons name="timer" size={22} color="#FFF" />
              </LinearGradient>
              <Text style={styles.quickLabel}>Focus</Text>
            </TouchableOpacity>

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

            <TouchableOpacity
              style={styles.quickTile}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('MenstrualCycle')}
            >
              <LinearGradient colors={['#FB7185', '#E11D48']} style={styles.quickIconWrap}>
                <Ionicons name="flower" size={22} color="#FFF" />
              </LinearGradient>
              <Text style={styles.quickLabel}>Cycle</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* Celebrative On-Screen Modal */}
      <CelebrationModal
        visible={Boolean(selectedCelebrationEvent)}
        event={selectedCelebrationEvent}
        onClose={() => setSelectedCelebrationEvent(null)}
        onViewEvent={() => {
          setSelectedCelebrationEvent(null);
          navigation.navigate('Notifications', { initialTab: 'events' });
        }}
      />

      {/* Mystery Reward Chest Modal */}
      <MysteryChestModal
        visible={chestModalVisible}
        onClose={() => setChestModalVisible(false)}
        reward={claimedReward}
      />

      {/* Small Welcome Bonus Cashback / Coupon Alert with Crackers */}
      <WelcomeBonusAlert
        visible={welcomeBonusAlertVisible}
        xpAmount={100}
        onClose={async () => {
          setWelcomeBonusAlertVisible(false);
          const currentUser = useAuthStore.getState().user;
          const userKey = currentUser?.id || currentUser?.phone;
          if (userKey) {
            await AsyncStorage.setItem(`@selftrack_welcome_bonus_seen_${userKey}`, 'true').catch(() => {});
          }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 360,
  },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingTop: 14, paddingBottom: 110 },

  // TOP BAR
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  topBarLeft: {},
  brandProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.sm,
  },
  appIconImage: {
    width: 38,
    height: 38,
    borderRadius: 11,
  },
  greetingRow: { flexDirection: 'row', alignItems: 'center' },
  greeting: { fontSize: 13, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.6 },
  name: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginTop: 1 },
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
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 12,
    marginBottom: 8,
    rowGap: 16,
    ...Shadow.sm,
  },
  quickTile: {
    alignItems: 'center',
    width: '33.33%',
    paddingVertical: 4,
  },
  quickIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    ...Shadow.sm,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  celebrationBannerWrapper: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  celebrationBannerCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    overflow: 'hidden',
    ...Shadow.md,
  },
  celebrationBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  celebrationIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    ...Shadow.sm,
  },
  celebrationTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  celebrationTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  celebrationPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: BorderRadius.full,
    paddingVertical: 1,
    paddingHorizontal: 6,
  },
  celebrationPillToday: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  celebrationPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  celebrationPillTextToday: {
    color: '#B45309',
  },
  celebrationTitle: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  celebrationSubtitle: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  celebrationActionArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },

  // VITALITY COMPANION CARD
  vitalityCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.md,
  },
  vitalityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  vitalitySectionPre: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  vitalitySectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  vitalityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  vitalityBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  vitalityBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  vitalityRingWrapper: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vitalityRingCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vitalityScoreNum: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  vitalityScoreDenominator: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  vitalityInfoWrap: {
    flex: 1,
  },
  vitalitySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 18,
  },
  vitalityPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  vitalityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  vitalityPillIcon: {
    fontSize: 11,
  },
  vitalityPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },

  // DAILY QUESTS & MYSTERY CHEST
  questsCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    ...Shadow.sm,
  },
  questsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  questsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  questsSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  questsCountBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  questsCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
  },
  questsSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  streakShieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  streakShieldIcon: {
    fontSize: 14,
  },
  streakShieldCount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  streakShieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
  },
  questList: {
    gap: 10,
    marginBottom: 14,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  questRowCompleted: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  questIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  questIconEmoji: {
    fontSize: 18,
  },
  questDetails: {
    flex: 1,
  },
  questTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  questTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  questTitleCompleted: {
    color: '#059669',
    textDecorationLine: 'line-through',
  },
  questProgressText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  questTrackBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  questTrackFill: {
    height: '100%',
    borderRadius: 3,
  },
  questCheckCircle: {
    minWidth: 46,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questCheckCircleActive: {
    backgroundColor: '#10B981',
    minWidth: 26,
    width: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 0,
  },
  questXpTag: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
  },
  chestClaimedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  chestClaimedIcon: {
    fontSize: 18,
  },
  chestClaimedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
    flex: 1,
  },
  chestReadyBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Shadow.md,
  },
  chestReadyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  chestReadyEmoji: {
    fontSize: 26,
  },
  chestReadyInfo: {
    flex: 1,
  },
  chestReadyTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  chestReadySubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FEF3C7',
    marginTop: 2,
  },
  chestLockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chestLockedEmoji: {
    fontSize: 16,
  },
  chestLockedText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    flex: 1,
  },

  /* WOMEN'S HEALTH CYCLE HOME WIDGET */
  cycleHomeCard: {
    borderRadius: 22,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#FECDD3',
    ...Shadow.sm,
  },
  cycleHomeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cycleHomeIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleHomeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cycleHomeBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#BE123C',
    letterSpacing: 0.5,
  },
  cycleHomePhaseBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9F1239',
  },
  cycleHomeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4C0519',
    marginTop: 1,
  },
  cycleHomeSub: {
    fontSize: 12,
    color: '#881337',
    marginTop: 2,
    fontWeight: '500',
  },
  cycleHomeArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});

const HomeScreenWrapper: React.FC<{ navigation: any; route?: any }> = (props) => (
  <ErrorBoundary fallbackTitle="Home Dashboard">
    <HomeScreen {...props} />
  </ErrorBoundary>
);

export default HomeScreenWrapper;