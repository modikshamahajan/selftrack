import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Animated, Dimensions, Platform, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// import PopupModal from '../components/PopupModal';
import { DecorLeaf } from './SplashScreen';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Spacing, Shadow } from '../theme/spacing';
import { getScreenBgColor } from '../theme/screenBgColors';
import Card from '../components/Card';
import ProgressRing from '../components/ProgressRing';
import Header from '../components/Header';
import FloatingActionButton from '../components/FloatingActionButton';
import { RoutineRunnerModal, RoutineStep } from '../components/RoutineRunnerModal';

interface Habit {
  id: string;
  name: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  color: string;
  category: string;
  streak: number;
  streakTarget: number;
  completed: boolean;
  progress: number;
  completedDays?: Record<string, boolean>;
}

const ADD_HABIT_ICONS = ['sun', 'book', 'droplet', 'activity', 'x-circle', 'moon', 'heart', 'coffee', 'star', 'zap'] as const;
const HABIT_COLORS = ['#2ECC71', '#6C5CE7', '#00B4D8', '#F39C12', '#E74C3C', '#9B59B6', '#FF6B6B', '#1ABC9C'];
const HABIT_STREAK_TARGETS = ['3', '7', '14', '21', '30', '60', '90'] as const;
const HABIT_CATEGORIES = [
  { label: 'Food', icon: 'coffee' },
  { label: 'Health', icon: 'heart' },
  { label: 'Entertainment', icon: 'music' },
  { label: 'Daily Routine', icon: 'calendar' },
  { label: 'Others', icon: 'layers' },
] as const;
type HabitCategoryOption = typeof HABIT_CATEGORIES[number];

import { useHabitStore, getLocalTodayDateString } from '../store/useHabitStore';

const HabitTrackerScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const storeHabits = useHabitStore((state) => state.habits);
  const fetchHabits = useHabitStore((state) => state.fetchHabits);
  const storeToggleHabit = useHabitStore((state) => state.toggleHabit);
  const storeDeleteHabit = useHabitStore((state) => state.deleteHabit);

  const completedRoutines = useHabitStore((state) => state.completedRoutines) || {};
  const todayStr = getLocalTodayDateString();
  const isMorningDoneToday = completedRoutines['morning'] === todayStr;
  const isEveningDoneToday = completedRoutines['evening'] === todayStr;

  const [animatingHabitId, setAnimatingHabitId] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const slideAnim = useRef(new Animated.Value(-Dimensions.get('window').width)).current;

  const bgColor = getScreenBgColor('HabitTracker');

  useEffect(() => {
    fetchHabits();
  }, []);

  const habits: Habit[] = storeHabits.map((h) => ({
    id: h.id,
    name: h.name,
    icon: (h.icon || 'droplet') as any,
    color: h.color || '#2ECC71',
    category: h.category || 'Health',
    streak: h.current_streak || 0,
    streakTarget: h.streak_target || 7,
    completed: h.completed,
    progress: Math.min(1, (h.current_streak || 0) / (h.streak_target || 7)),
    completedDays: h.completed_days || {},
  }));

  const getWeekDates = (offset: number) => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + offset * 7);

    const weekDates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  const isCurrentWeek = weekOffset === 0;
  const weekDates = getWeekDates(weekOffset);

  const defaultSelectedDayIndex = weekDates.findIndex(
    date => date.toDateString() === new Date().toDateString()
  );
  const [selectedDayIndex, setSelectedDayIndex] = useState(
    defaultSelectedDayIndex >= 0 ? defaultSelectedDayIndex : 0
  );

  const getWeekMonthLabel = () => {
    if (weekDates.length === 0) return '';
    const firstDay = weekDates[0];
    const lastDay = weekDates[6];

    const firstMonth = firstDay.toLocaleDateString('en-US', { month: 'short' });
    const lastMonth = lastDay.toLocaleDateString('en-US', { month: 'short' });

    if (firstMonth === lastMonth) {
      return firstMonth;
    }
    return `${firstMonth} - ${lastMonth}`;
  };

  useEffect(() => {
    const currentIndex = weekDates.findIndex(
      date => date.toDateString() === new Date().toDateString()
    );
    setSelectedDayIndex(currentIndex >= 0 ? currentIndex : 0);
  }, [weekOffset]);

  const getDateKey = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getDayCompletionStats = (
    dayIndex: number
  ): { percentage: number; color: string } => {

    if (habits.length === 0) {
      return {
        percentage: 0,
        color: Colors.backgroundGray,
      };
    }

    const targetDate = weekDates[dayIndex];

    if (!targetDate) {
      return {
        percentage: 0,
        color: Colors.backgroundGray,
      };
    }

    const dateKey = getDateKey(targetDate);

    let completedTasksForDay = 0;

    habits.forEach(habit => {
      if (habit.completedDays?.[dateKey]) {
        completedTasksForDay++;
      }
    });

    const percentage =
      Math.round((completedTasksForDay / habits.length) * 100);

    let color = '#E5E7EB';

    // More detailed percentage color system
    if (percentage === 0) {
      color = '#E5E7EB'; // Gray
    }
    else if (percentage <= 20) {
      color = '#EF4444'; // Red
    }
    else if (percentage <= 40) {
      color = '#F97316'; // Orange
    }
    else if (percentage <= 60) {
      color = '#FACC15'; // Yellow
    }
    else if (percentage <= 80) {
      color = '#84CC16'; // Lime
    }
    else if (percentage < 100) {
      color = '#22C55E'; // Green
    }
    else {
      color = '#16A34A'; // Dark Green
    }

    return {
      percentage,
      color,
    };
  };

  const getTodayIndex = (): number => {
    if (!isCurrentWeek) return -1;
    const today = new Date();
    return weekDates.findIndex(d => d.toDateString() === today.toDateString());
  };

  const toggleHabit = (id: string) => {
    const selectedDate = weekDates[selectedDayIndex];
    if (!selectedDate) return;
    const dateKey = getDateKey(selectedDate);
    storeToggleHabit(id, dateKey);
  };

  const openAddHabitScreen = () => {
    navigation.navigate('CreateEditHabit', { habit: undefined });
  };

  const openEditHabitScreen = (habit: Habit) => {
    navigation.navigate('CreateEditHabit', { habit });
  };

  const handleDeleteHabit = (habitId: string) => {
    Alert.alert('Delete Habit', 'Are you sure you want to delete this habit?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => storeDeleteHabit(habitId) },
    ]);
  };

  const selectedDate = weekDates[selectedDayIndex];

  const selectedDateKey = selectedDate
    ? getDateKey(selectedDate)
    : '';

  const completedCount = habits.filter(
    habit => habit.completedDays?.[selectedDateKey]
  ).length;

  const canGoBack = navigation.canGoBack();
  const isTab = route?.name === 'Habits';

  // Habit Stacking Routines State
  const [activeRoutine, setActiveRoutine] = useState<'morning' | 'evening' | null>(null);
  const [morningHabitIds, setMorningHabitIds] = useState<string[]>([]);
  const [eveningHabitIds, setEveningHabitIds] = useState<string[]>([]);
  const [customizingRoutine, setCustomizingRoutine] = useState<'morning' | 'evening' | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('selftrack_morning_routine_habits').then((val) => {
      if (val) {
        try { setMorningHabitIds(JSON.parse(val)); } catch {}
      }
    });
    AsyncStorage.getItem('selftrack_evening_routine_habits').then((val) => {
      if (val) {
        try { setEveningHabitIds(JSON.parse(val)); } catch {}
      }
    });
  }, []);

  const saveRoutineHabits = async (routineType: 'morning' | 'evening', ids: string[]) => {
    if (routineType === 'morning') {
      setMorningHabitIds(ids);
      await AsyncStorage.setItem('selftrack_morning_routine_habits', JSON.stringify(ids));
    } else {
      setEveningHabitIds(ids);
      await AsyncStorage.setItem('selftrack_evening_routine_habits', JSON.stringify(ids));
    }
    setCustomizingRoutine(null);
  };

  const morningRoutineSteps: RoutineStep[] = useMemo(() => {
    const selected = habits.filter(
      (h) => morningHabitIds.includes(h.id) || (h as any).routine_type === 'morning'
    );
    if (selected.length > 0) {
      return selected.map((h) => ({
        id: h.id,
        title: h.name,
        subtitle: `${h.category} • Streak: ${h.streak}d`,
        icon: h.icon || 'sun',
        color: h.color || '#F59E0B',
      }));
    }
    if (habits.length > 0) {
      return habits.slice(0, 3).map((h) => ({
        id: h.id,
        title: h.name,
        subtitle: `${h.category} • Tap 'Customize' to configure`,
        icon: h.icon || 'sun',
        color: h.color || '#F59E0B',
      }));
    }
    return [
      {
        id: 'no-habits-morning',
        title: 'Add Morning Habits',
        subtitle: 'Tap the "+" button below to create habits for your Morning Kickstart.',
        icon: 'plus-circle',
        color: '#F59E0B',
      },
    ];
  }, [habits, morningHabitIds]);

  const eveningRoutineSteps: RoutineStep[] = useMemo(() => {
    const selected = habits.filter(
      (h) => eveningHabitIds.includes(h.id) || (h as any).routine_type === 'evening'
    );
    if (selected.length > 0) {
      return selected.map((h) => ({
        id: h.id,
        title: h.name,
        subtitle: `${h.category} • Streak: ${h.streak}d`,
        icon: h.icon || 'moon',
        color: h.color || '#6366F1',
      }));
    }
    if (habits.length > 0) {
      return habits.slice(-3).map((h) => ({
        id: h.id,
        title: h.name,
        subtitle: `${h.category} • Tap 'Customize' to configure`,
        icon: h.icon || 'moon',
        color: h.color || '#6366F1',
      }));
    }
    return [
      {
        id: 'no-habits-evening',
        title: 'Add Evening Habits',
        subtitle: 'Tap the "+" button below to create habits for your Evening Wind-down.',
        icon: 'plus-circle',
        color: '#6366F1',
      },
    ];
  }, [habits, eveningHabitIds]);

  const handleStepCompleteInRoutine = (stepId: string) => {
    const selectedDate = weekDates[selectedDayIndex];
    if (!selectedDate) return;
    const dateKey = getDateKey(selectedDate);

    const matchingHabit = habits.find((h) => h.id === stepId);
    if (matchingHabit && !matchingHabit.completedDays?.[dateKey]) {
      storeToggleHabit(matchingHabit.id, dateKey);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      {/* TOP LIGHT COLOR HERO PANEL (Warm Sunrise & Amber) */}
      <View style={styles.heroWrapper}>
        <LinearGradient
          colors={['#FFF7ED', '#FEF3C7', '#FFEDD5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          {/* Subtle decorative circles in soft golden tones */}
          <View style={styles.heroCircleOverlay1} />
          <View style={styles.heroCircleOverlay2} />

          <View style={styles.heroTopRow}>
            <View style={styles.heroTagBadge}>
              <Text style={styles.heroTagText}>HABIT MASTERY 🌱</Text>
            </View>

            {!isTab && canGoBack && (
              <TouchableOpacity 
                style={styles.heroBackBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.8}
              >
                <Icon name="arrow-left" size={18} color="#B45309" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.heroTitleRow}>
            <View>
              <Text style={styles.heroTitle}>Habit Tracker 🎯</Text>
              <Text style={styles.heroSubtitle}>
                {habits.length === 0 
                  ? 'Start building your streak today' 
                  : `${completedCount} of ${habits.length} habits completed for this day`}
              </Text>
            </View>
          </View>

          {/* Quick Metrics Bar inside Light Hero Panel */}
          <View style={styles.heroMetricsBar}>
            <View style={styles.heroMetricPill}>
              <Text style={styles.heroMetricEmoji}>🔥</Text>
              <Text style={styles.heroMetricLabel}>
                {habits.reduce((max, h) => Math.max(max, h.streak), 0)} Day Best
              </Text>
            </View>
            <View style={styles.heroMetricPill}>
              <Text style={styles.heroMetricEmoji}>📋</Text>
              <Text style={styles.heroMetricLabel}>{habits.length} Active</Text>
            </View>
            <View style={styles.heroMetricPill}>
              <Text style={styles.heroMetricEmoji}>⚡</Text>
              <Text style={styles.heroMetricLabel}>
                {habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0}% Today
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Weekly Consistency Header & Panel */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Weekly Consistency</Text>
            <View style={styles.headerRightActionArea}>
              {weekOffset !== 0 && (
                <TouchableOpacity onPress={() => setWeekOffset(0)} style={styles.resetButton} activeOpacity={0.7}>
                  <Text style={styles.resetButtonText}>Current Week</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.monthHeaderLabel}>{getWeekMonthLabel()}</Text>
            </View>
          </View>

          <View style={styles.weekCard}>
            <TouchableOpacity style={styles.weekArrow} onPress={() => setWeekOffset(weekOffset - 1)}>
              <Icon name="chevron-left" size={20} color={Colors.primary} />
            </TouchableOpacity>

            <View style={styles.weekRow}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => {
                const todayIdx = getTodayIndex();
                const isToday = i === todayIdx;
                const dateNum = weekDates[i] ? weekDates[i].getDate() : '';

                // Get the progressive percentage and color stats for this specific day block
                const { percentage, color } = getDayCompletionStats(i);

                const isSelectedDay = i === selectedDayIndex;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.weekDay, isSelectedDay && styles.weekDaySelected]}
                    activeOpacity={0.75}
                    onPress={() => setSelectedDayIndex(i)}
                  >
                    <Text style={[styles.weekLabel, isToday && styles.weekLabelToday]}>{day}</Text>

                    {/* Ring Container representing the custom percentage bar indicator */}
                    <View style={[styles.weekDotContainer, isToday && styles.weekDotTodayBorder]}>
                      {percentage === 0 ? (
                        // Empty indicator state
                        <View style={[styles.weekDotFill, { backgroundColor: Colors.backgroundGray }]} />
                      ) : percentage === 100 ? (
                        // 100% Filled Success state
                        <View style={[styles.weekDotFill, { backgroundColor: color }]}>
                          <Icon name="check" size={10} color={Colors.textWhite} />
                        </View>
                      ) : (
                        // Split Dynamic Percentage Bar Block
                        <View style={styles.splitDotWrapper}>
                          <View style={[styles.splitActiveSegment, { flex: percentage / 100, backgroundColor: color }]} />
                          <View style={[styles.splitInactiveSegment, { flex: (100 - percentage) / 100 }]} />
                        </View>
                      )}
                    </View>

                    <Text style={[styles.weekDateNumber, (isToday || isSelectedDay) && styles.weekDateTodayText]}>{dateNum}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.weekArrow} onPress={() => setWeekOffset(weekOffset + 1)}>
              <Icon name="chevron-right" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Habit Stacking Routines Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.sectionTitle}>Habit Stacking Flows</Text>
              <TouchableOpacity
                style={styles.customizeRitualsHeaderBtn}
                onPress={() => {
                  if (habits.length === 0) {
                    Alert.alert('No Habits Yet', 'Create your daily habits first using the "+" button, then assign them to rituals.');
                    return;
                  }
                  setCustomizingRoutine('morning');
                }}
                activeOpacity={0.7}
              >
                <Icon name="sliders" size={12} color="#4F46E5" style={{ marginRight: 4 }} />
                <Text style={styles.customizeRitualsHeaderText}>Customize</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.routineBadge}>
              <Text style={styles.routineBadgeText}>+50 XP RITUAL</Text>
            </View>
          </View>
          <View style={styles.routinesRow}>
            <TouchableOpacity
              style={styles.routineCard}
              activeOpacity={isMorningDoneToday ? 0.9 : 0.8}
              onPress={() => {
                if (isMorningDoneToday) {
                  Alert.alert(
                    'Morning Kickstart Completed! ✅',
                    'You have already completed your Morning Kickstart ritual for today. It will be available again tomorrow morning!'
                  );
                  return;
                }
                if (habits.length === 0) {
                  Alert.alert('No Habits Yet', 'Add habits using the "+" button below to build your custom morning ritual.');
                  return;
                }
                setActiveRoutine('morning');
              }}
            >
              <LinearGradient
                colors={isMorningDoneToday ? ['#F0FDF4', '#DCFCE7'] : ['#FFFBEB', '#FEF3C7']}
                style={styles.routineCardGradient}
              >
                <View style={[styles.routineIconCircle, isMorningDoneToday && { backgroundColor: '#DCFCE7' }]}>
                  <Text style={styles.routineEmoji}>{isMorningDoneToday ? '✅' : '🌅'}</Text>
                </View>
                <View style={styles.routineContent}>
                  <Text style={styles.routineTitle}>Morning Kickstart</Text>
                  <Text style={[styles.routineSubtitle, isMorningDoneToday && { color: '#16A34A', fontWeight: '700' }]}>
                    {isMorningDoneToday
                      ? 'Completed for today 🎉'
                      : habits.length === 0
                      ? 'Tap to add habits'
                      : `${morningRoutineSteps.length} Step${morningRoutineSteps.length !== 1 ? 's' : ''} • ${morningRoutineSteps.map((s) => s.title).slice(0, 2).join(', ')}`}
                  </Text>
                </View>
                <View style={[styles.routineActionBtn, { backgroundColor: isMorningDoneToday ? '#16A34A' : '#F59E0B' }]}>
                  <Icon name={isMorningDoneToday ? 'check' : 'play'} size={14} color="#FFF" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.routineCard}
              activeOpacity={isEveningDoneToday ? 0.9 : 0.8}
              onPress={() => {
                if (isEveningDoneToday) {
                  Alert.alert(
                    'Evening Wind-down Completed! ✅',
                    'You have already completed your Evening Wind-down ritual for today. It will be available again tomorrow evening!'
                  );
                  return;
                }
                if (habits.length === 0) {
                  Alert.alert('No Habits Yet', 'Add habits using the "+" button below to build your custom evening ritual.');
                  return;
                }
                setActiveRoutine('evening');
              }}
            >
              <LinearGradient
                colors={isEveningDoneToday ? ['#F0FDF4', '#DCFCE7'] : ['#EEF2FF', '#E0E7FF']}
                style={styles.routineCardGradient}
              >
                <View style={[styles.routineIconCircle, isEveningDoneToday && { backgroundColor: '#DCFCE7' }]}>
                  <Text style={styles.routineEmoji}>{isEveningDoneToday ? '✅' : '🌙'}</Text>
                </View>
                <View style={styles.routineContent}>
                  <Text style={styles.routineTitle}>Evening Wind-down</Text>
                  <Text style={[styles.routineSubtitle, isEveningDoneToday && { color: '#16A34A', fontWeight: '700' }]}>
                    {isEveningDoneToday
                      ? 'Completed for today 🌙'
                      : habits.length === 0
                      ? 'Tap to add habits'
                      : `${eveningRoutineSteps.length} Step${eveningRoutineSteps.length !== 1 ? 's' : ''} • ${eveningRoutineSteps.map((s) => s.title).slice(0, 2).join(', ')}`}
                  </Text>
                </View>
                <View style={[styles.routineActionBtn, { backgroundColor: isEveningDoneToday ? '#16A34A' : '#6366F1' }]}>
                  <Icon name={isEveningDoneToday ? 'check' : 'play'} size={14} color="#FFF" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Habits List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {weekDates[selectedDayIndex]
              ? `Habits for ${weekDates[selectedDayIndex].toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}`
              : "Selected Day's Habits"}
          </Text>
          {habits.length === 0 ? (
            <Text style={styles.emptyText}>No habits yet. Add one to get started! 🚀</Text>
          ) : (
            habits.map((habit) => {
              const isAnimating = habit.id === animatingHabitId;
              // const completedOnSelectedDay = habit.completedDays?.[selectedDayIndex] ?? false;
              const selectedDate = weekDates[selectedDayIndex];

              const selectedDateKey = selectedDate
                ? getDateKey(selectedDate)
                : '';

              const completedOnSelectedDay =
                habit.completedDays?.[selectedDateKey] ?? false;
              return (
                <Animated.View key={habit.id} style={isAnimating ? { transform: [{ translateX: slideAnim }] } : undefined}>
                  <TouchableOpacity style={styles.habitItem} onPress={() => toggleHabit(habit.id)} activeOpacity={0.7}>
                    <View style={[styles.habitIcon, { backgroundColor: habit.color + '15' }]}>
                      <Icon name={habit.icon} size={18} color={habit.color} />
                    </View>
                    <View style={styles.habitInfo}>
                      <Text style={[styles.habitName, completedOnSelectedDay && styles.habitCompleted]}>{habit.name}</Text>
                      <Text style={styles.habitCategory}>{habit.category}</Text>
                      <Text style={styles.habitStreak}>🔥 {habit.streak} / {habit.streakTarget} days</Text>
                      <Text style={styles.habitDayStatus}>
                        {completedOnSelectedDay ? 'Completed on this day' : 'Not completed'}
                      </Text>
                    </View>
                    <View style={styles.habitActionsInline}>
                      <TouchableOpacity style={styles.iconActionBtn} onPress={() => openEditHabitScreen(habit)}>
                        <Icon name="edit-2" size={16} color={Colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconActionBtn} onPress={() => handleDeleteHabit(habit.id)}>
                        <Icon name="trash-2" size={16} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={[styles.checkBox, completedOnSelectedDay && { backgroundColor: habit.color }]}
                      activeOpacity={0.7}
                      onPress={() => toggleHabit(habit.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {completedOnSelectedDay && <Icon name="check" size={14} color={Colors.textWhite} />}
                    </TouchableOpacity>
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* PopupModal removed. Create/Edit now handled in CreateEditHabitScreen */}
      <FloatingActionButton icon="plus" onPress={openAddHabitScreen} gradient style={{ bottom: 24 }} />

      {/* Habit Stacking Sequential Runner Modal */}
      <RoutineRunnerModal
        visible={Boolean(activeRoutine)}
        routineTitle={activeRoutine === 'morning' ? 'Morning Kickstart Ritual' : 'Evening Wind-Down Ritual'}
        routineType={activeRoutine || 'morning'}
        steps={activeRoutine === 'morning' ? morningRoutineSteps : eveningRoutineSteps}
        onClose={() => setActiveRoutine(null)}
        onStepComplete={handleStepCompleteInRoutine}
      />

      {/* Routine Habit Customizer Modal */}
      <Modal visible={Boolean(customizingRoutine)} transparent animationType="slide">
        <View style={styles.customizerModalOverlay}>
          <View style={styles.customizerModalCard}>
            <View style={styles.customizerModalHeader}>
              <View>
                <Text style={styles.customizerModalTitle}>
                  {customizingRoutine === 'morning' ? '🌅 Morning Kickstart Ritual' : '🌙 Evening Wind-down Ritual'}
                </Text>
                <Text style={styles.customizerModalSub}>
                  Select habits from your daily focus to include in this flow
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCustomizingRoutine(null)}>
                <Icon name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Routine Switcher Tab */}
            <View style={styles.customizerTabRow}>
              <TouchableOpacity
                style={[styles.customizerTab, customizingRoutine === 'morning' && styles.customizerTabActive]}
                onPress={() => setCustomizingRoutine('morning')}
              >
                <Text style={[styles.customizerTabText, customizingRoutine === 'morning' && styles.customizerTabTextActive]}>
                  🌅 Morning ({morningHabitIds.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.customizerTab, customizingRoutine === 'evening' && styles.customizerTabActive]}
                onPress={() => setCustomizingRoutine('evening')}
              >
                <Text style={[styles.customizerTabText, customizingRoutine === 'evening' && styles.customizerTabTextActive]}>
                  🌙 Evening ({eveningHabitIds.length})
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
              {habits.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center' }}>
                    No habits created yet. Tap "+" on the main screen to create your habits first!
                  </Text>
                </View>
              ) : (
                habits.map((habit) => {
                  const currentIds = customizingRoutine === 'morning' ? morningHabitIds : eveningHabitIds;
                  const isChecked = currentIds.includes(habit.id);
                  return (
                    <TouchableOpacity
                      key={habit.id}
                      style={[styles.customizerHabitRow, isChecked && styles.customizerHabitRowChecked]}
                      activeOpacity={0.7}
                      onPress={() => {
                        const newIds = isChecked
                          ? currentIds.filter((id) => id !== habit.id)
                          : [...currentIds, habit.id];
                        if (customizingRoutine === 'morning') {
                          setMorningHabitIds(newIds);
                        } else {
                          setEveningHabitIds(newIds);
                        }
                      }}
                    >
                      <View style={[styles.habitIconMini, { backgroundColor: (habit.color || '#4F46E5') + '20' }]}>
                        <Icon name={(habit.icon as any) || 'check'} size={16} color={habit.color || '#4F46E5'} />
                      </View>
                      <View style={{ flex: 1, marginHorizontal: 10 }}>
                        <Text style={styles.customizerHabitName}>{habit.name}</Text>
                        <Text style={styles.customizerHabitCategory}>{habit.category} • Streak: {habit.streak}d</Text>
                      </View>
                      <View style={[styles.customizerCheckCircle, isChecked && styles.customizerCheckCircleChecked]}>
                        {isChecked && <Icon name="check" size={14} color="#FFF" />}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.customizerSaveBtn}
              activeOpacity={0.8}
              onPress={() => {
                if (customizingRoutine) {
                  const ids = customizingRoutine === 'morning' ? morningHabitIds : eveningHabitIds;
                  saveRoutineHabits(customizingRoutine, ids);
                }
              }}
            >
              <Text style={styles.customizerSaveBtnText}>Save Ritual Flow</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  // HERO BANNER (LIGHT COLOR PANEL - WARM SUNRISE & AMBER)
  heroWrapper: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 10 : 6,
    paddingBottom: 4,
  },
  heroBanner: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  heroCircleOverlay1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    top: -40,
    right: -20,
  },
  heroCircleOverlay2: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(254, 215, 170, 0.45)',
    bottom: -20,
    left: -20,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroTagBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  heroTagText: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
    ...Shadow.sm,
  },
  heroTitleRow: {
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
    fontWeight: '500',
  },
  heroMetricsBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  heroMetricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.sm,
  },
  heroMetricEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  heroMetricLabel: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
  },
  content: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12 },
  overviewCard: { padding: 20, borderRadius: BorderRadius.xl, backgroundColor: Colors.card, ...Shadow.md, marginBottom: 24, marginTop: 10 },
  overviewRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  overviewText: { flex: 1 },
  overviewTitle: { ...Typography.heading3, color: Colors.textPrimary },
  overviewSubtitle: { ...Typography.body, color: Colors.textSecondary, marginTop: 4 },
  section: { marginBottom: 24 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { ...Typography.subtitle, fontWeight: '600', color: Colors.textPrimary },
  headerRightActionArea: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resetButton: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: BorderRadius.md, backgroundColor: Colors.backgroundGray },
  resetButtonText: { ...Typography.caption, color: Colors.primary, fontWeight: '600', fontSize: 11 },
  monthHeaderLabel: { ...Typography.body, fontWeight: '600', color: Colors.primary },

  weekCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.card, paddingVertical: 14, paddingHorizontal: 4, borderRadius: BorderRadius.xl, ...Shadow.sm },
  weekArrow: { width: 30, height: 40, justifyContent: 'center', alignItems: 'center' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-around', flex: 1 },
  weekDay: { alignItems: 'center', gap: 4 },

  // Custom Dynamic Ring Frame Structural Layout Specs
  weekDotContainer: { width: 26, height: 26, borderRadius: 13, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.backgroundGray },
  weekDotTodayBorder: { borderWidth: 1.5, borderColor: Colors.primary },
  weekDotFill: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },

  // Custom Split layout views that handle accurate fraction fills block metrics
  splitDotWrapper: { width: '100%', height: '100%', flexDirection: 'column-reverse' },
  splitActiveSegment: { width: '100%' },
  splitInactiveSegment: { width: '100%', backgroundColor: '#E0E0E0' },

  weekLabel: { ...Typography.caption, color: Colors.textSecondary, fontSize: 11 },
  weekLabelToday: { color: Colors.primary, fontWeight: '700' },
  weekDateNumber: { ...Typography.caption, color: Colors.textSecondary, fontSize: 11, fontWeight: '500' },
  weekDateTodayText: { color: Colors.primary, fontWeight: '700' },
  weekDaySelected: { backgroundColor: Colors.backgroundGray, borderRadius: BorderRadius.xl },

  habitItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10, backgroundColor: Colors.card, borderRadius: BorderRadius.xl, ...Shadow.sm },
  habitIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  habitInfo: { flex: 1 },
  habitName: { ...Typography.body, fontWeight: '500', color: Colors.textPrimary },
  habitCategory: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  habitCompleted: { textDecorationLine: 'line-through', color: Colors.textTertiary },
  habitDayStatus: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4 },
  habitStreak: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  checkBox: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  habitActionsInline: { flexDirection: 'row', gap: 8, alignItems: 'center', marginRight: 10 },
  iconActionBtn: { padding: 6, justifyContent: 'center', alignItems: 'center' },
  emptyText: { ...Typography.body, color: Colors.textTertiary, textAlign: 'center', marginTop: 20 },
  modalField: { width: '100%', marginBottom: 20 },
  modalScroll: { width: '100%', flex: 1, minHeight: 0 }, // allow ScrollView to expand inside modal's flexed container
  modalContent: { flexGrow: 1, paddingBottom: 24, paddingHorizontal: 2 }, // Extra breathing room for selection indicators
  modalLabel: { ...Typography.subtitle, color: Colors.textPrimary, fontWeight: '700', marginBottom: 10 },
  modalLabelTitle: { color: Colors.primaryDark },
  modalLabelStreak: { color: Colors.accent },
  modalLabelCategory: { color: Colors.secondary },
  modalLabelIcon: { color: Colors.warning },
  modalLabelColor: { color: Colors.info },
  sectionHeaderIcon: { width: 34, height: 34, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  sectionHeaderIconTitle: { backgroundColor: Colors.primary },
  sectionHeaderIconStreak: { backgroundColor: Colors.accent },
  sectionHeaderIconCategory: { backgroundColor: Colors.secondary },
  sectionHeaderIconIcon: { backgroundColor: Colors.warning },
  sectionHeaderIconColor: { backgroundColor: Colors.info },
  modalInput: { width: '100%', borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, color: Colors.textPrimary, backgroundColor: Colors.background, ...Typography.body },
  categoryList: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  categoryChoice: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: BorderRadius.lg, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, marginBottom: 10 },
  categoryChoiceActive: { backgroundColor: Colors.secondaryLight, borderColor: Colors.secondary },
  categoryChoiceText: { ...Typography.caption, color: Colors.textPrimary },
  categoryChoiceTextActive: { color: Colors.textWhite, fontWeight: '700' },
  categoryBadge: { width: 28, height: 28, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center', marginRight: 10, backgroundColor: Colors.primarySoft },
  categoryBadgeActive: { backgroundColor: Colors.secondary },
  sectionHeaderRowInner: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionHeaderLabelRow: { flexDirection: 'row', alignItems: 'center' },
  inlineIcon: { marginRight: 8 },
  charCount: { ...Typography.caption, color: Colors.textSecondary },
  hintText: { ...Typography.caption, color: Colors.textSecondary, fontSize: 12 },
  chipRow: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chipButton: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: BorderRadius.lg, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  chipButtonActive: { backgroundColor: Colors.accentLight, borderColor: Colors.accent },
  chipText: { ...Typography.caption, color: Colors.textPrimary },
  chipTextActive: { color: Colors.textDark, fontWeight: '700' },
  iconListGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 10, marginTop: 8 },
  iconChoice: { width: 44, height: 44, borderRadius: BorderRadius.lg, backgroundColor: Colors.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, marginBottom: 10 },
  iconChoiceActive: { backgroundColor: Colors.secondaryLight, borderColor: Colors.secondary },
  colorList: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  colorChoice: { width: 50, height: 50, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.border },
  colorChoiceActive: { borderColor: Colors.secondary, borderWidth: 3 },

  // HABIT STACKING ROUTINES
  routineBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  routineBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  routinesRow: {
    gap: 10,
    marginTop: 10,
  },
  routineCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.sm,
  },
  routineCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  routineIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  routineEmoji: {
    fontSize: 22,
  },
  routineContent: {
    flex: 1,
  },
  routineTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  routineSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  routineActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },

  /* ---------- RITUAL CUSTOMIZER MODAL ---------- */
  customizeRitualsHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  customizeRitualsHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  customizerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  customizerModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '85%',
  },
  customizerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  customizerModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  customizerModalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  customizerTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  customizerTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  customizerTabActive: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  customizerTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  customizerTabTextActive: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  customizerHabitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  customizerHabitRowChecked: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  habitIconMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customizerHabitName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  customizerHabitCategory: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  customizerCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customizerCheckCircleChecked: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  customizerSaveBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  customizerSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default HabitTrackerScreen;