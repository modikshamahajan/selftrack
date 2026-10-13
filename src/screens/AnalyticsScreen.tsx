import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Spacing, Shadow } from '../theme/spacing';
import Card from '../components/Card';
import { useHabitStore } from '../store/useHabitStore';
import { useAuthStore } from '../store/useAuthStore';
import { useJournalStore } from '../store/useJournalStore';

const { width } = Dimensions.get('window');

const TABS = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

const AnalyticsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState(0);
  const habits = useHabitStore((s) => s.habits);
  const user = useAuthStore((s) => s.user);
  
  const entries = useJournalStore((s) => s.entries);
  const fetchEntries = useJournalStore((s) => s.fetchEntries);

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
    let labels: string[] = [];
    let habitCounts: number[] = [];
    let moodAverages: number[] = [];

    if (activeTab === 0) { // Daily (Last 7 Days)
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
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
      }
    } else if (activeTab === 1) { // Weekly (Last 4 Weeks)
      for (let i = 3; i >= 0; i--) {
        labels.push(`Wk ${4 - i}`);
        const start = new Date(today);
        start.setDate(start.getDate() - (i * 7 + 7));
        
        let hCount = 0;
        let mSum = 0;
        let mCount = 0;

        for (let j = 1; j <= 7; j++) {
          const d = new Date(start);
          d.setDate(d.getDate() + j);
          const dateStr = d.toISOString().split('T')[0];

          habits.forEach(h => {
            if (h.completed_days?.[dateStr]) hCount++;
          });

          const dayEntries = entries.filter(e => e.date === dateStr && typeof e.mood_score === 'number');
          dayEntries.forEach(e => {
            mSum += e.mood_score;
            mCount++;
          });
        }

        habitCounts.push(hCount);
        moodAverages.push(mCount > 0 ? (mSum / mCount) : 0);
      }
    } else if (activeTab === 2) { // Monthly (Last 6 Months)
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
        const yearMonth = d.toISOString().slice(0, 7);

        let hCount = 0;
        let mSum = 0;
        let mCount = 0;

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

        habitCounts.push(hCount);
        moodAverages.push(mCount > 0 ? (mSum / mCount) : 0);
      }
    } else if (activeTab === 3) { // Yearly (Last 5 Years)
      for (let i = 4; i >= 0; i--) {
        const year = (today.getFullYear() - i).toString();
        labels.push(year);

        let hCount = 0;
        let mSum = 0;
        let mCount = 0;

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

        habitCounts.push(hCount);
        moodAverages.push(mCount > 0 ? (mSum / mCount) : 0);
      }
    }

    // fallback to avoid chart crash if all values are identical or 0
    if (moodAverages.every(v => v === 0)) moodAverages = moodAverages.map(() => 0.1); 
    if (habitCounts.every(v => v === 0)) habitCounts = habitCounts.map(() => 0.1);

    return {
      labels,
      habitData: habitCounts,
      moodData: moodAverages,
    };
  }, [activeTab, habits, entries]);

  const moodData = { labels: dynamicData.labels, datasets: [{ data: dynamicData.moodData }] };
  const habitData = { labels: dynamicData.labels, datasets: [{ data: dynamicData.habitData }] };

  const allMoods = entries.filter(e => typeof e.mood_score === 'number').map(e => e.mood_score);
  const avgMoodNum = allMoods.length > 0 ? (allMoods.reduce((a, b) => a + b, 0) / allMoods.length) : 0;
  const avgMoodStr = avgMoodNum > 0 ? `${avgMoodNum.toFixed(1)}/5` : 'No data';

  const insightText = useMemo(() => {
    if (activeTab === 0) return "Daily consistency looks strong! Checking off habits in the morning boosts overall mood score.";
    if (activeTab === 1) return "Weekly progress is steady. Focus on keeping your top streak habits alive this weekend!";
    if (activeTab === 2) return "Monthly review: You're demonstrating steady habit building across multiple weeks. Keep it up!";
    return "Yearly trajectory: Consistent micro-habits compound into life-changing growth. Fantastic dedication!";
  }, [activeTab]);

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
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="arrow-left" size={18} color="#0369A1" />
            </TouchableOpacity>

            <View style={styles.heroTagBadge}>
              <Text style={styles.heroTagText}>INSIGHTS & GROWTH 📊</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Performance & Analytics</Text>
          <Text style={styles.heroSubtitle}>
            Track your habit trajectories, streak health & mindful growth.
          </Text>

          {/* Compact Hero Metrics Bar */}
          <View style={styles.heroMetricsBar}>
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
          </View>
        </LinearGradient>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Tab Selector */}
        <View style={styles.tabsContainer}>
          {TABS.map((tab, i) => {
            const isActive = activeTab === i;
            return (
              <TouchableOpacity 
                key={tab} 
                style={[styles.tab, isActive && styles.tabActive]} 
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
          colors={['#EEF2FF', '#FAF5FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.insightCard}
        >
          <View style={styles.insightHeader}>
            <View style={styles.insightIconBadge}>
              <Icon name="cpu" size={15} color="#4F46E5" />
            </View>
            <Text style={styles.insightTitle}>SMART AI INSIGHT</Text>
          </View>
          <Text style={styles.insightText}>{insightText}</Text>
        </LinearGradient>

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
