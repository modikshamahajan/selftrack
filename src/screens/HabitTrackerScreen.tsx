import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather as Icon } from '@expo/vector-icons';
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

import { useHabitStore } from '../store/useHabitStore';

const HabitTrackerScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const storeHabits = useHabitStore((state) => state.habits);
  const fetchHabits = useHabitStore((state) => state.fetchHabits);
  const storeToggleHabit = useHabitStore((state) => state.toggleHabit);
  const storeDeleteHabit = useHabitStore((state) => state.deleteHabit);

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
    return date.toISOString().split('T')[0];
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

  return (
    <SafeAreaView edges={['bottom']} style={[styles.container, { backgroundColor: bgColor }]}>
      <Header title="Habit Tracker" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Overview Card */}
        <Card style={styles.overviewCard}>
          <View style={styles.overviewRow}>
            <ProgressRing progress={habits.length === 0 ? 0 : (completedCount / habits.length) * 100} size={80} color={Colors.primary} strokeWidth={8} />
            <View style={styles.overviewText}>
              <Text style={styles.overviewTitle}>{completedCount}/{habits.length} Completed</Text>
              <Text style={styles.overviewSubtitle}>Keep going! Almost there 🎯</Text>
            </View>
          </View>
        </Card>

        {/* Weekly Consistency Header & Panel */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Weekly Consistency</Text>
            <View style={styles.headerRightActionArea}>
              {weekOffset !== 0 && (
                <TouchableOpacity onPress={() => setWeekOffset(0)} style={styles.resetButton} activeOpacity={0.7}>
                  <Text style={styles.resetButtonText}>Reset</Text>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 20 },
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
});

export default HabitTrackerScreen; 