import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Spacing, Shadow } from '../theme/spacing';
import { getScreenBgColor } from '../theme/screenBgColors';
import Card from '../components/Card';
import Header from '../components/Header';
import { useHabitStore } from '../store/useHabitStore';
import { useAuthStore } from '../store/useAuthStore';
import { useJournalStore } from '../store/useJournalStore';

const { width } = Dimensions.get('window');

const TABS = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

const AnalyticsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState(0);
  const bgColor = getScreenBgColor('Analytics');
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
    backgroundGradientFrom: Colors.card,
    backgroundGradientTo: Colors.card,
    color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
    labelColor: () => Colors.textSecondary,
    strokeWidth: 2,
    decimalPlaces: 0,
    barPercentage: 0.6,
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
    if (moodAverages.every(v => v === 0)) moodAverages = moodAverages.map(v => 0.1); 
    if (habitCounts.every(v => v === 0)) habitCounts = habitCounts.map(v => 0.1);

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
    if (activeTab === 0) return "Your daily consistency looks great! Keep logging your mood and checking off habits.";
    if (activeTab === 1) return "Weekly progress is steady. Try focusing on the habits you missed this past week.";
    if (activeTab === 2) return "Monthly review: You've made significant progress over the past few months. Keep it up!";
    return "Yearly overview: Look at how far you've come! Consistency over the long term is key.";
  }, [activeTab]);

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Header title="Analytics" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Tab Selector */}
        <View style={styles.tabs}>
          {TABS.map((tab, i) => (
            <TouchableOpacity key={tab} style={[styles.tab, activeTab === i && styles.tabActive]} onPress={() => setActiveTab(i)}>
              <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* AI Insights */}
        <Card style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Icon name="cpu" size={16} color={Colors.primary} />
            <Text style={styles.insightTitle}>AI Insight</Text>
          </View>
          <Text style={styles.insightText}>{insightText}</Text>
        </Card>

        {/* Mood Trend */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mood Trend</Text>
          <Card style={styles.chartCard}>
            <LineChart data={moodData} width={width - 72} height={160} chartConfig={chartConfig} bezier withInnerLines={false} style={styles.chart} />
          </Card>
        </View>

        {/* Habit Completion */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Habits Completed</Text>
          <Card style={styles.chartCard}>
            <BarChart data={habitData} width={width - 72} height={160} chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(108, 92, 231, ${opacity})` }} withInnerLines={false} style={styles.chart} yAxisLabel="" yAxisSuffix="" />
          </Card>
        </View>

        {/* Performance Summary */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <Text style={styles.sectionTitle}>Performance Summary</Text>
          <View style={styles.summaryGrid}>
            {[
              { label: 'Avg Mood', value: avgMoodStr, icon: 'smile', color: '#F39C12' },
              { label: 'Habit Rate', value: `${habitRatePercent}%`, icon: 'check-circle', color: Colors.primary },
              { label: 'Streak Best', value: `${bestStreak} days`, icon: 'zap', color: '#E74C3C' },
              { label: 'XP Earned', value: (user?.total_xp || 0).toLocaleString(), icon: 'star', color: '#6C5CE7' },
            ].map((item) => (
              <Card key={item.label} style={styles.summaryItem}>
                <Icon name={item.icon as any} size={20} color={item.color} />
                <Text style={[styles.summaryValue, { color: item.color }]}>{item.value}</Text>
                <Text style={styles.summaryLabel}>{item.label}</Text>
              </Card>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: getScreenBgColor('AnalyticsScreen') },
  content: { paddingHorizontal: 20 },
  tabs: { flexDirection: 'row', backgroundColor: Colors.backgroundGray, borderRadius: BorderRadius.lg, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.md },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { ...Typography.caption, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.textWhite },
  insightCard: { padding: 16, borderRadius: BorderRadius.xl, backgroundColor: Colors.primarySoft, marginBottom: 24 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  insightTitle: { ...Typography.caption, fontWeight: '700', color: Colors.primaryDark },
  insightText: { ...Typography.body, color: Colors.textSecondary, lineHeight: 22 },
  section: { marginBottom: 24 },
  sectionTitle: { ...Typography.subtitle, fontWeight: '600', color: Colors.textPrimary, marginBottom: 12 },
  chartCard: { padding: 12, borderRadius: BorderRadius.xl, backgroundColor: Colors.card, ...Shadow.sm },
  chart: { borderRadius: BorderRadius.lg, marginLeft: -16 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryItem: { width: '47%', padding: 16, borderRadius: BorderRadius.xl, alignItems: 'center', ...Shadow.sm, backgroundColor: Colors.card },
  summaryValue: { ...Typography.heading3, marginTop: 8 },
  summaryLabel: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4 },
});

export default AnalyticsScreen;
