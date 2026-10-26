import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Shadow } from '../theme/spacing';
import Card from '../components/Card';
import { useHabitStore } from '../store/useHabitStore';
import { useAuthStore } from '../store/useAuthStore';
import { useJournalStore } from '../store/useJournalStore';
import { useHealthStore } from '../store/useHealthStore';
import { safeGoBack } from '../utils/navigation';

const { width } = Dimensions.get('window');

const TABS = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

const formatLocalDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const AnalyticsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [viewCategory, setViewCategory] = useState<'habits' | 'health'>('habits');
  const habits = useHabitStore((s) => s.habits);
  const user = useAuthStore((s) => s.user);
  
  const entries = useJournalStore((s) => s.entries);
  const fetchEntries = useJournalStore((s) => s.fetchEntries);

  const dailyMetrics = useHealthStore((s) => s.dailyMetrics);
  const currentMetrics = useHealthStore((s) => s.metrics);

  useEffect(() => {
    fetchEntries();
  }, []);

  const completedCount = habits.filter((h) => h.completed).length;
  const totalHabits = habits.length || 1;
  const habitRatePercent = Math.round((completedCount / totalHabits) * 100);
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.current_streak || 0), 0);

  const chartConfig = {
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
    labelColor: () => '#64748B',
    strokeWidth: 2.5,
    decimalPlaces: 0,
    barPercentage: 0.55,
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#4F46E5',
    },
  };

  const dynamicData = useMemo(() => {
    const today = new Date();
    const todayStr = formatLocalDate(today);
    const labels: string[] = [];
    let habitCounts: number[] = [];
    let moodAverages: number[] = [];
    let stepCounts: number[] = [];
    let sleepHours: number[] = [];
    let waterCounts: number[] = [];
    const calCounts: number[] = [];

    const getMetricsForDate = (dateStr: string) => {
      if (dailyMetrics[dateStr]) return dailyMetrics[dateStr];
      if (dateStr === todayStr && currentMetrics) return currentMetrics;
      return null;
    };

    if (activeTab === 0) { // Daily (Last 7 Days)
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = formatLocalDate(d);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        labels.push(dayName);

        let hCount = 0;
        habits.forEach(h => {
          if (h.completed_days?.[dateStr]) hCount++;
        });
        habitCounts.push(hCount);

        const dayEntries = entries.filter(e => e.date === dateStr && typeof e.mood_score === 'number');
        if (dayEntries.length > 0) {
          const avg = dayEntries.reduce((sum, e) => sum + e.mood_score, 0) / dayEntries.length;
          moodAverages.push(avg);
        } else {
          moodAverages.push(0);
        }

        const m = getMetricsForDate(dateStr);
        stepCounts.push(m ? m.steps || 0 : 0);
        sleepHours.push(m ? m.sleep_hours || 0 : 0);
        waterCounts.push(m ? m.water_glasses || 0 : 0);
        calCounts.push(m ? m.calories_burned || 0 : 0);
      }
    } else if (activeTab === 1) { // Weekly (Last 4 Weeks)
      for (let i = 3; i >= 0; i--) {
        labels.push(`Wk ${4 - i}`);
        const start = new Date(today);
        start.setDate(start.getDate() - (i * 7 + 7));
        
        let hCount = 0;
        let mSum = 0;
        let mCount = 0;
        let stepsSum = 0;
        let sleepSum = 0;
        let waterSum = 0;
        let calSum = 0;
        let dayCount = 0;

        for (let j = 1; j <= 7; j++) {
          const d = new Date(start);
          d.setDate(d.getDate() + j);
          const dateStr = formatLocalDate(d);

          habits.forEach(h => {
            if (h.completed_days?.[dateStr]) hCount++;
          });

          const dayEntries = entries.filter(e => e.date === dateStr && typeof e.mood_score === 'number');
          dayEntries.forEach(e => {
            mSum += e.mood_score;
            mCount++;
          });

          const m = getMetricsForDate(dateStr);
          if (m) {
            stepsSum += m.steps || 0;
            sleepSum += m.sleep_hours || 0;
            waterSum += m.water_glasses || 0;
            calSum += m.calories_burned || 0;
            dayCount++;
          }
        }

        habitCounts.push(hCount);
        moodAverages.push(mCount > 0 ? (mSum / mCount) : 0);
        stepCounts.push(dayCount > 0 ? Math.round(stepsSum / dayCount) : 0);
        sleepHours.push(dayCount > 0 ? parseFloat((sleepSum / dayCount).toFixed(1)) : 0);
        waterCounts.push(dayCount > 0 ? Math.round(waterSum / dayCount) : 0);
        calCounts.push(dayCount > 0 ? Math.round(calSum / dayCount) : 0);
      }
    } else if (activeTab === 2) { // Monthly (Last 6 Months)
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
        const yearMonth = d.toISOString().slice(0, 7);

        let hCount = 0;
        let mSum = 0;
        let mCount = 0;
        let stepsSum = 0;
        let sleepSum = 0;
        let waterSum = 0;
        let calSum = 0;
        let healthDays = 0;

        habits.forEach(h => {
          Object.keys(h.completed_days || {}).forEach(dateStr => {
            if (dateStr.startsWith(yearMonth) && h.completed_days?.[dateStr]) hCount++;
          });
        });

        entries.forEach(e => {
          if (e.date.startsWith(yearMonth) && typeof e.mood_score === 'number') {
            mSum += e.mood_score;
            mCount++;
          }
        });

        Object.keys(dailyMetrics).forEach(dateStr => {
          if (dateStr.startsWith(yearMonth)) {
            const m = dailyMetrics[dateStr];
            stepsSum += m.steps || 0;
            sleepSum += m.sleep_hours || 0;
            waterSum += m.water_glasses || 0;
            calSum += m.calories_burned || 0;
            healthDays++;
          }
        });

        habitCounts.push(hCount);
        moodAverages.push(mCount > 0 ? (mSum / mCount) : 0);
        stepCounts.push(healthDays > 0 ? Math.round(stepsSum / healthDays) : 0);
        sleepHours.push(healthDays > 0 ? parseFloat((sleepSum / healthDays).toFixed(1)) : 0);
        waterCounts.push(healthDays > 0 ? Math.round(waterSum / healthDays) : 0);
        calCounts.push(healthDays > 0 ? Math.round(calSum / healthDays) : 0);
      }
    } else if (activeTab === 3) { // Yearly (Last 5 Years)
      for (let i = 4; i >= 0; i--) {
        const year = (today.getFullYear() - i).toString();
        labels.push(year);

        let hCount = 0;
        let mSum = 0;
        let mCount = 0;
        let stepsSum = 0;
        let sleepSum = 0;
        let waterSum = 0;
        let calSum = 0;
        let healthDays = 0;

        habits.forEach(h => {
          Object.keys(h.completed_days || {}).forEach(dateStr => {
            if (dateStr.startsWith(year) && h.completed_days?.[dateStr]) hCount++;
          });
        });

        entries.forEach(e => {
          if (e.date.startsWith(year) && typeof e.mood_score === 'number') {
            mSum += e.mood_score;
            mCount++;
          }
        });

        Object.keys(dailyMetrics).forEach(dateStr => {
          if (dateStr.startsWith(year)) {
            const m = dailyMetrics[dateStr];
            stepsSum += m.steps || 0;
            sleepSum += m.sleep_hours || 0;
            waterSum += m.water_glasses || 0;
            calSum += m.calories_burned || 0;
            healthDays++;
          }
        });

        habitCounts.push(hCount);
        moodAverages.push(mCount > 0 ? (mSum / mCount) : 0);
        stepCounts.push(healthDays > 0 ? Math.round(stepsSum / healthDays) : 0);
        sleepHours.push(healthDays > 0 ? parseFloat((sleepSum / healthDays).toFixed(1)) : 0);
        waterCounts.push(healthDays > 0 ? Math.round(waterSum / healthDays) : 0);
        calCounts.push(healthDays > 0 ? Math.round(calSum / healthDays) : 0);
      }
    }

    // fallback to avoid chart crash if all values are identical or 0
    if (moodAverages.every(v => v === 0)) moodAverages = moodAverages.map(() => 0.1); 
    if (habitCounts.every(v => v === 0)) habitCounts = habitCounts.map(() => 0.1);
    if (stepCounts.every(v => v === 0)) stepCounts = stepCounts.map(() => 1);
    if (sleepHours.every(v => v === 0)) sleepHours = sleepHours.map(() => 0.1);
    if (waterCounts.every(v => v === 0)) waterCounts = waterCounts.map(() => 0.1);

    return {
      labels,
      habitData: habitCounts,
      moodData: moodAverages,
      stepData: stepCounts,
      sleepData: sleepHours,
      waterData: waterCounts,
      calData: calCounts,
    };
  }, [activeTab, habits, entries, dailyMetrics, currentMetrics]);

  const moodData = { labels: dynamicData.labels, datasets: [{ data: dynamicData.moodData }] };
  const habitData = { labels: dynamicData.labels, datasets: [{ data: dynamicData.habitData }] };
  const stepChartData = { labels: dynamicData.labels, datasets: [{ data: dynamicData.stepData }] };
  const sleepChartData = { labels: dynamicData.labels, datasets: [{ data: dynamicData.sleepData }] };
  const waterChartData = { labels: dynamicData.labels, datasets: [{ data: dynamicData.waterData }] };

  const allMoods = entries.filter(e => typeof e.mood_score === 'number').map(e => e.mood_score);
  const avgMoodNum = allMoods.length > 0 ? (allMoods.reduce((a, b) => a + b, 0) / allMoods.length) : 0;
  const avgMoodStr = avgMoodNum > 0 ? `${avgMoodNum.toFixed(1)}/5` : 'No data';

  // Health summary metrics
  const activeSteps = dynamicData.stepData.filter(v => v > 1);
  const avgSteps = activeSteps.length > 0 
    ? Math.round(activeSteps.reduce((a, b) => a + b, 0) / activeSteps.length) 
    : (currentMetrics.steps || 0);

  const activeSleep = dynamicData.sleepData.filter(v => v > 0.1);
  const avgSleep = activeSleep.length > 0
    ? (activeSleep.reduce((a, b) => a + b, 0) / activeSleep.length).toFixed(1)
    : (currentMetrics.sleep_hours ? currentMetrics.sleep_hours.toFixed(1) : '0');

  const activeWater = dynamicData.waterData.filter(v => v > 0.1);
  const avgWater = activeWater.length > 0
    ? (activeWater.reduce((a, b) => a + b, 0) / activeWater.length).toFixed(1)
    : (currentMetrics.water_glasses || 0);

  const activeCalories = currentMetrics.calories_burned || Math.round((avgSteps || 0) * 0.04);

  const insightText = useMemo(() => {
    if (viewCategory === 'health') {
      if (activeTab === 0) return "Daily Vitals Sync: Hydration and 7-8 hours of sleep maximize mental clarity and energy.";
      if (activeTab === 1) return "Weekly Health: Aiming for 7,500+ daily steps maintains cardiovascular endurance and lowers stress.";
      if (activeTab === 2) return "Monthly Health Review: Consistent sleep schedules correlate directly with higher habit streaks and energy.";
      return "Yearly Wellness: Long-term vitality is sustained through daily movement, hydration, and restorative sleep.";
    }
    if (activeTab === 0) return "Daily consistency looks strong! Checking off habits in the morning boosts overall mood score.";
    if (activeTab === 1) return "Weekly progress is steady. Focus on keeping your top streak habits alive this weekend!";
    if (activeTab === 2) return "Monthly review: You're demonstrating steady habit building across multiple weeks. Keep it up!";
    return "Yearly trajectory: Consistent micro-habits compound into life-changing growth. Fantastic dedication!";
  }, [activeTab, viewCategory]);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* LIGHT COLOR HERO PANEL (Electric Sky Blue & Cyan) */}
      <View style={styles.heroWrapper}>
        <LinearGradient
          colors={['#E0F2FE', '#E0E7FF', '#CFFAFE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          {/* Subtle decorative circles in soft cyan/sky tones */}
          <View style={styles.heroCircleOverlay1} />
          <View style={styles.heroCircleOverlay2} />

          <View style={styles.heroTopRow}>
            <TouchableOpacity 
              style={styles.heroActionBtn} 
              onPress={() => safeGoBack(navigation, 'MainTabs', { screen: 'Home' })}
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="arrow-left" size={18} color="#0369A1" />
            </TouchableOpacity>

            <View style={styles.heroTagBadge}>
              <Text style={styles.heroTagText}>
                {viewCategory === 'health' ? 'HEALTH & VITALS 🩺' : 'INSIGHTS & GROWTH 📊'}
              </Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Performance & Analytics</Text>
          <Text style={styles.heroSubtitle}>
            {viewCategory === 'health' 
              ? 'Analyze steps, sleep patterns, hydration trends & vitals.' 
              : 'Track your habit trajectories, streak health & mindful growth.'}
          </Text>

          {/* Compact Hero Metrics Bar */}
          <View style={styles.heroMetricsBar}>
            {viewCategory === 'health' ? (
              <>
                <View style={styles.heroMetricPill}>
                  <Text style={styles.heroMetricEmoji}>👟</Text>
                  <Text style={styles.heroMetricLabel}>{(currentMetrics.steps || 0).toLocaleString()} Steps</Text>
                </View>
                <View style={styles.heroMetricPill}>
                  <Text style={styles.heroMetricEmoji}>🌙</Text>
                  <Text style={styles.heroMetricLabel}>{currentMetrics.sleep_hours || 0}h Sleep</Text>
                </View>
                <View style={styles.heroMetricPill}>
                  <Text style={styles.heroMetricEmoji}>💧</Text>
                  <Text style={styles.heroMetricLabel}>{currentMetrics.water_glasses || 0} Glasses</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.heroMetricPill}>
                  <Text style={styles.heroMetricEmoji}>🔥</Text>
                  <Text style={styles.heroMetricLabel}>{bestStreak}d Best Streak</Text>
                </View>
                <View style={styles.heroMetricPill}>
                  <Text style={styles.heroMetricEmoji}>🎯</Text>
                  <Text style={styles.heroMetricLabel}>{habitRatePercent}% Completed</Text>
                </View>
                <View style={styles.heroMetricPill}>
                  <Text style={styles.heroMetricEmoji}>⭐</Text>
                  <Text style={styles.heroMetricLabel}>{(user?.total_xp || 0).toLocaleString()} XP</Text>
                </View>
              </>
            )}
          </View>
        </LinearGradient>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Category Switcher: Habits & Mood vs Health & Vitals */}
        <View style={styles.categoryToggleContainer}>
          <TouchableOpacity
            style={[styles.categoryBtn, viewCategory === 'habits' && styles.categoryBtnActive]}
            onPress={() => setViewCategory('habits')}
            activeOpacity={0.8}
          >
            <Icon name="check-square" size={14} color={viewCategory === 'habits' ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.categoryBtnText, viewCategory === 'habits' && styles.categoryBtnTextActive]}>
              Habits & Mood
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.categoryBtn, viewCategory === 'health' && styles.categoryBtnActiveHealth]}
            onPress={() => setViewCategory('health')}
            activeOpacity={0.8}
          >
            <Icon name="activity" size={14} color={viewCategory === 'health' ? '#FFFFFF' : '#0369A1'} />
            <Text style={[styles.categoryBtnText, viewCategory === 'health' && styles.categoryBtnTextActive]}>
              Health & Vitals 🩺
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Selector (Daily, Weekly, Monthly, Yearly) */}
        <View style={styles.tabsContainer}>
          {TABS.map((tab, i) => {
            const isActive = activeTab === i;
            return (
              <TouchableOpacity 
                key={tab} 
                style={[
                  styles.tab, 
                  isActive && (viewCategory === 'health' ? styles.tabActiveHealth : styles.tabActive)
                ]} 
                onPress={() => setActiveTab(i)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* AI Insight Card */}
        <LinearGradient
          colors={viewCategory === 'health' ? ['#F0FDFA', '#E0F2FE'] : ['#EEF2FF', '#FAF5FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.insightCard}
        >
          <View style={styles.insightHeader}>
            <View style={[styles.insightIconBadge, viewCategory === 'health' && { backgroundColor: '#E0F2FE' }]}>
              <Icon 
                name={viewCategory === 'health' ? 'heart' : 'cpu'} 
                size={15} 
                color={viewCategory === 'health' ? '#0284C7' : '#4F46E5'} 
              />
            </View>
            <Text style={[styles.insightTitle, viewCategory === 'health' && { color: '#0369A1' }]}>
              {viewCategory === 'health' ? 'HEALTH INTELLIGENCE INSIGHT' : 'SMART AI INSIGHT'}
            </Text>
          </View>
          <Text style={styles.insightText}>{insightText}</Text>
        </LinearGradient>

        {viewCategory === 'habits' ? (
          <>
            {/* Performance Metric Summary Cards */}
            <View style={styles.summaryGrid}>
              {[
                { label: 'Avg Mood', value: avgMoodStr, icon: 'smile', color: '#F59E0B', bg: '#FEF3C7' },
                { label: 'Habit Rate', value: `${habitRatePercent}%`, icon: 'check-circle', color: '#10B981', bg: '#D1FAE5' },
                { label: 'Streak Best', value: `${bestStreak} days`, icon: 'zap', color: '#EF4444', bg: '#FEE2E2' },
                { label: 'Total Habits', value: `${habits.length}`, icon: 'target', color: '#6366F1', bg: '#EEF2FF' },
              ].map((item) => (
                <Card key={item.label} style={styles.summaryItem}>
                  <View style={[styles.summaryIconWrap, { backgroundColor: item.bg }]}>
                    <Icon name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <Text style={[styles.summaryValue, { color: item.color }]}>{item.value}</Text>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                </Card>
              ))}
            </View>

            {/* Mood Trend Chart */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Wellbeing & Mood Trend</Text>
                <View style={styles.chartTagBadge}>
                  <Text style={styles.chartTagBadgeText}>1-5 Scale</Text>
                </View>
              </View>
              <Card style={styles.chartCard}>
                <LineChart 
                  data={moodData} 
                  width={width - 56} 
                  height={170} 
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                    propsForDots: { r: '4', strokeWidth: '2', stroke: '#10B981' }
                  }} 
                  bezier 
                  withInnerLines={false} 
                  style={styles.chart} 
                />
              </Card>
            </View>

            {/* Habit Completion Bar Chart */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Habits Completed</Text>
                <View style={styles.chartTagBadge}>
                  <Text style={styles.chartTagBadgeText}>Completions</Text>
                </View>
              </View>
              <Card style={styles.chartCard}>
                <BarChart 
                  data={habitData} 
                  width={width - 56} 
                  height={170} 
                  chartConfig={{ 
                    ...chartConfig, 
                    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})` 
                  }} 
                  withInnerLines={false} 
                  style={styles.chart} 
                  yAxisLabel="" 
                  yAxisSuffix="" 
                />
              </Card>
            </View>
          </>
        ) : (
          <>
            {/* Health & Vitals Metric Summary Cards */}
            <View style={styles.summaryGrid}>
              {[
                { label: 'Avg Daily Steps', value: (avgSteps || 0).toLocaleString(), icon: 'navigation', color: '#0284C7', bg: '#E0F2FE' },
                { label: 'Avg Sleep', value: `${avgSleep} hrs`, icon: 'moon', color: '#8B5CF6', bg: '#EDE9FE' },
                { label: 'Hydration', value: `${avgWater} gls`, icon: 'droplet', color: '#06B6D4', bg: '#CFFAFE' },
                { label: 'Active Burn', value: `${activeCalories} kcal`, icon: 'zap', color: '#F59E0B', bg: '#FEF3C7' },
              ].map((item) => (
                <Card key={item.label} style={styles.summaryItem}>
                  <View style={[styles.summaryIconWrap, { backgroundColor: item.bg }]}>
                    <Icon name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <Text style={[styles.summaryValue, { color: item.color }]}>{item.value}</Text>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                </Card>
              ))}
            </View>

            {/* Steps Activity Trend */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Daily Step Activity</Text>
                <View style={[styles.chartTagBadge, { backgroundColor: '#E0F2FE' }]}>
                  <Text style={[styles.chartTagBadgeText, { color: '#0369A1' }]}>Steps Count</Text>
                </View>
              </View>
              <Card style={styles.chartCard}>
                <BarChart 
                  data={stepChartData} 
                  width={width - 56} 
                  height={170} 
                  chartConfig={{ 
                    ...chartConfig, 
                    color: (opacity = 1) => `rgba(2, 132, 199, ${opacity})` 
                  }} 
                  withInnerLines={false} 
                  style={styles.chart} 
                  yAxisLabel="" 
                  yAxisSuffix="" 
                />
              </Card>
            </View>

            {/* Sleep Duration Trend */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Sleep Duration Trend</Text>
                <View style={[styles.chartTagBadge, { backgroundColor: '#EDE9FE' }]}>
                  <Text style={[styles.chartTagBadgeText, { color: '#6D28D9' }]}>Hours / Night</Text>
                </View>
              </View>
              <Card style={styles.chartCard}>
                <LineChart 
                  data={sleepChartData} 
                  width={width - 56} 
                  height={170} 
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
                    propsForDots: { r: '4', strokeWidth: '2', stroke: '#8B5CF6' }
                  }} 
                  bezier 
                  withInnerLines={false} 
                  style={styles.chart} 
                />
              </Card>
            </View>

            {/* Water Hydration Trend */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Hydration Intake</Text>
                <View style={[styles.chartTagBadge, { backgroundColor: '#CFFAFE' }]}>
                  <Text style={[styles.chartTagBadgeText, { color: '#0891B2' }]}>Glasses (250ml)</Text>
                </View>
              </View>
              <Card style={styles.chartCard}>
                <BarChart 
                  data={waterChartData} 
                  width={width - 56} 
                  height={170} 
                  chartConfig={{ 
                    ...chartConfig, 
                    color: (opacity = 1) => `rgba(6, 182, 212, ${opacity})` 
                  }} 
                  withInnerLines={false} 
                  style={styles.chart} 
                  yAxisLabel="" 
                  yAxisSuffix="" 
                />
              </Card>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  // HERO BANNER (LIGHT COLOR PANEL - ELECTRIC SKY & CYAN)
  heroWrapper: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 10 : 6,
    paddingBottom: 4,
  },
  heroBanner: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    backgroundColor: '#E0F2FE',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  heroCircleOverlay1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  heroCircleOverlay2: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(186, 230, 253, 0.45)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heroActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    ...Shadow.sm,
  },
  heroTagBadge: {
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.22)',
  },
  heroTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369A1',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#475569',
    marginTop: 3,
    lineHeight: 18,
    fontWeight: '500',
  },
  heroMetricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  heroMetricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.sm,
  },
  heroMetricEmoji: { fontSize: 12, marginRight: 4 },
  heroMetricLabel: { fontSize: 11, fontWeight: '700', color: '#0369A1' },

  // CONTENT
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },

  // CATEGORY SWITCHER
  categoryToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 4,
    marginBottom: 14,
    gap: 6,
  },
  categoryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  categoryBtnActive: {
    backgroundColor: '#4F46E5',
    ...Shadow.sm,
  },
  categoryBtnActiveHealth: {
    backgroundColor: '#0284C7',
    ...Shadow.sm,
  },
  categoryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  categoryBtnTextActive: {
    color: '#FFFFFF',
  },

  // TABS
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 14,
  },
  tabActive: {
    backgroundColor: '#4F46E5',
    ...Shadow.sm,
  },
  tabActiveHealth: {
    backgroundColor: '#0284C7',
    ...Shadow.sm,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  // INSIGHT CARD
  insightCard: {
    padding: 14,
    borderRadius: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    ...Shadow.sm,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  insightIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.6,
  },
  insightText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
    fontWeight: '500',
  },

  // SUMMARY GRID
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  summaryItem: {
    width: '48.2%',
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    ...Shadow.sm,
  },
  summaryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },

  // SECTION & CHARTS
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  chartTagBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  chartTagBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
  },
  chartCard: {
    padding: 10,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    ...Shadow.sm,
  },
  chart: {
    borderRadius: 16,
    marginLeft: -10,
  },
});

export default AnalyticsScreen;
