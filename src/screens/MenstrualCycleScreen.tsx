import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather as Icon, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  useMenstrualStore,
  formatYMD,
  parseYMD,
  getDaysDiff,
  calculateCycleInfo,
} from '../store/useMenstrualStore';
import { BorderRadius, Shadow } from '../theme/spacing';
import { safeGoBack } from '../utils/navigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MOOD_OPTIONS = [
  { id: 'Calm', label: 'Calm', emoji: '😌' },
  { id: 'Happy', label: 'Happy', emoji: '🥰' },
  { id: 'Energetic', label: 'Energetic', emoji: '⚡' },
  { id: 'Moody', label: 'Moody', emoji: '🎭' },
  { id: 'Anxious', label: 'Anxious', emoji: '😰' },
  { id: 'Irritable', label: 'Irritable', emoji: '😠' },
  { id: 'Sad', label: 'Sad', emoji: '🥺' },
  { id: 'Tender', label: 'Sensitive', emoji: '🌸' },
];

const SYMPTOM_OPTIONS = [
  { id: 'Cramps', label: 'Cramps', emoji: '⚡' },
  { id: 'Headache', label: 'Headache', emoji: '🤕' },
  { id: 'Bloating', label: 'Bloating', emoji: '🎈' },
  { id: 'Tender Breasts', label: 'Tender Breasts', emoji: '🥥' },
  { id: 'Acne', label: 'Skin Breakouts', emoji: '🫧' },
  { id: 'Fatigue', label: 'Fatigue', emoji: '😴' },
  { id: 'Backache', label: 'Lower Backache', emoji: '🛌' },
  { id: 'Cravings', label: 'Food Cravings', emoji: '🍫' },
];


const FLOW_LEVELS: { id: 'none' | 'spotting' | 'light' | 'medium' | 'heavy'; label: string; icon: string }[] = [
  { id: 'none', label: 'None', icon: '○' },
  { id: 'spotting', label: 'Spotting', icon: '💧' },
  { id: 'light', label: 'Light', icon: '🩸' },
  { id: 'medium', label: 'Medium', icon: '🩸🩸' },
  { id: 'heavy', label: 'Heavy', icon: '🩸🩸🩸' },
];

const PHASE_DETAILS = {
  menstrual: {
    title: 'Menstrual Phase',
    hormone: 'Estrogen & progesterone at lowest levels',
    energy: 'Lower energy • Inner winter',
    nutrition: 'Iron-rich foods, leafy greens, warm bone broth, dark chocolate',
    workout: 'Restorative stretching, gentle walking, slow yoga',
    tip: 'Honor your body’s need for rest and stay deeply hydrated with warm herbal teas.',
  },
  follicular: {
    title: 'Follicular Phase',
    hormone: 'Estrogen steadily climbing to stimulate follicle growth',
    energy: 'Surging energy, mental clarity & creativity',
    nutrition: 'Fermented foods, lean proteins, avocados, vibrant salads',
    workout: 'Strength training, cardio, hiking, trying new dance or sports',
    tip: 'Your brain is primed for brainstorming and strategic planning. Start new projects!',
  },
  ovulation: {
    title: 'Ovulation Phase',
    hormone: 'Luteinizing hormone (LH) and estrogen peak',
    energy: 'Peak confidence, magnetic social energy & stamina',
    nutrition: 'Antioxidant berries, fiber, asparagus, wild-caught fish',
    workout: 'HIIT, heavy lifting, high-intensity endurance workouts',
    tip: 'Your verbal communication and magnetism are highest. Great for presentations & connection.',
  },
  luteal: {
    title: 'Luteal Phase',
    hormone: 'Progesterone peaks to nurture the body, then gradually declines',
    energy: 'Winding down • Focus shifts inward',
    nutrition: 'Magnesium-rich pumpkin seeds, sweet potatoes, bananas, warm soups',
    workout: 'Pilates, moderate resistance training, scenic nature walks',
    tip: 'Practice intentional boundary-setting. Prioritize relaxing bedtime rituals to soothe PMS.',
  },
};

const MenstrualCycleScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const {
    settings,
    dailyLogs,
    loadState,
    updateSettings,
    logPeriodToggle,
    saveDailyLog,
    clearMenstrualData,
  } = useMenstrualStore();

  const todayStr = useMemo(() => formatYMD(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Settings modal temporary form state
  const [tempCycleLength, setTempCycleLength] = useState(settings.cycleLength);
  const [tempPeriodDuration, setTempPeriodDuration] = useState(settings.periodDuration);
  const [tempLastPeriod, setTempLastPeriod] = useState(settings.lastPeriodStart);

  useEffect(() => {
    loadState();
  }, []);

  useEffect(() => {
    setTempCycleLength(settings.cycleLength);
    setTempPeriodDuration(settings.periodDuration);
    setTempLastPeriod(settings.lastPeriodStart);
  }, [settings]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Calculations for Today & Selected Date
  const todayCycle = useMemo(
    () => calculateCycleInfo(todayStr, settings, dailyLogs),
    [todayStr, settings, dailyLogs]
  );

  const selectedDayCycle = useMemo(
    () => calculateCycleInfo(selectedDate, settings, dailyLogs),
    [selectedDate, settings, dailyLogs]
  );

  // Daily log state for selectedDate
  const currentLog = dailyLogs[selectedDate] || {
    date: selectedDate,
    moods: [],
    symptoms: [],
    flow: 'none',
    notes: '',
  };

  const [localFlow, setLocalFlow] = useState<'none' | 'spotting' | 'light' | 'medium' | 'heavy'>(
    currentLog.flow || 'none'
  );
  const [localMoods, setLocalMoods] = useState<string[]>(currentLog.moods || []);
  const [localSymptoms, setLocalSymptoms] = useState<string[]>(currentLog.symptoms || []);
  const [localNotes, setLocalNotes] = useState<string>(currentLog.notes || '');

  // Sync local inputs when selectedDate changes
  useEffect(() => {
    const log = dailyLogs[selectedDate];
    setLocalFlow(log?.flow || (selectedDayCycle.isPeriodActive ? 'medium' : 'none'));
    setLocalMoods(log?.moods || []);
    setLocalSymptoms(log?.symptoms || []);
    setLocalNotes(log?.notes || '');
  }, [selectedDate, dailyLogs, selectedDayCycle.isPeriodActive]);

  // Calendar Day Matrix Generation
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Leading days from previous month to align with Sunday start
    const startDayOfWeek = firstDay.getDay();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({
        dateStr: formatYMD(prevDate),
        dayNum: prevDate.getDate(),
        isCurrentMonth: false,
      });
    }

    // Days in current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const curDate = new Date(year, month, d);
      days.push({
        dateStr: formatYMD(curDate),
        dayNum: d,
        isCurrentMonth: true,
      });
    }

    // Trailing days to fill the final week
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        dateStr: formatYMD(nextDate),
        dayNum: nextDate.getDate(),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [calendarMonth]);

  const shiftMonth = (delta: number) => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const handleToggleMood = (id: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalMoods((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const handleToggleSymptom = (id: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalSymptoms((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const handleSaveDailyLog = async () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const isPeriodNow = localFlow !== 'none';
    await saveDailyLog(selectedDate, {
      flow: localFlow,
      isPeriod: isPeriodNow,
      moods: localMoods,
      symptoms: localSymptoms,
      notes: localNotes.trim(),
    });

    // If marked as period flow, only start a NEW cycle if selectedDate is at least 16 days after the last period start
    // (a biological cycle cannot restart on day 2, 3, or 4 of an ongoing period)
    const daysSinceLastStart = settings.lastPeriodStart ? getDaysDiff(settings.lastPeriodStart, selectedDate) : 999;
    if (isPeriodNow && (!settings.lastPeriodStart || daysSinceLastStart >= 16)) {
      await updateSettings({
        previousPeriodStart: settings.lastPeriodStart,
        lastPeriodStart: selectedDate,
      });
    } else if (!isPeriodNow && settings.lastPeriodStart === selectedDate && settings.previousPeriodStart) {
      await updateSettings({
        lastPeriodStart: settings.previousPeriodStart,
        previousPeriodStart: undefined,
      });
    }

    showToast('Daily wellness & symptoms saved ✨');
  };

  const handleSaveSettings = async () => {
    const trimmed = tempLastPeriod.trim();
    await updateSettings({
      cycleLength: tempCycleLength,
      periodDuration: tempPeriodDuration,
      lastPeriodStart: trimmed,
      hasUserEnteredData: trimmed !== '',
    });
    setSettingsModalVisible(false);
    showToast(trimmed !== '' ? 'Cycle configuration updated 🌸' : 'Cycle reset to Day 0 ✨');
  };

  const handleResetCycle = async () => {
    await clearMenstrualData();
    setTempLastPeriod('');
    setSettingsModalVisible(false);
    showToast('Cycle reset to Day 0 (Untracked) 🌸');
  };

  const currentPhaseInsight = todayCycle.isInitialized
    ? PHASE_DETAILS[todayCycle.phase]
    : {
        title: 'Cycle Not Started',
        hormone: 'Personalized hormone balance activates once your period is logged',
        energy: 'Track daily energy, moods, and symptoms using the logger below',
        nutrition: 'Focus on nutrient-dense meals, leafy greens, and proper hydration',
        workout: 'Enjoy your favorite workouts, yoga, or daily walking',
        tip: 'Tap "Period Started Today" or set your last period in settings (⚙️ top right) to unlock cycle phases.',
      };

  const androidNavPadding = Platform.OS === 'android' ? Math.max(insets.bottom, 28) : insets.bottom;
  const scrollBottomPadding = androidNavPadding + (Platform.OS === 'android' ? 84 : 40);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      {/* HEADER BAR */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.headerCircleBtn}
          onPress={() => safeGoBack(navigation, 'MainTabs', { screen: 'Health' })}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={20} color="#881337" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Women's Health 🌸</Text>
          <Text style={styles.headerSubtitle}>Menstrual Cycle & Vitality</Text>
        </View>

        <TouchableOpacity
          style={styles.headerCircleBtn}
          onPress={() => setSettingsModalVisible(true)}
          activeOpacity={0.7}
        >
          <Icon name="sliders" size={19} color="#881337" />
        </TouchableOpacity>
      </View>

      {/* TOAST FEEDBACK */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
      >
        {/* ===================== HERO CYCLE DIAL CARD ===================== */}
        <LinearGradient
          colors={['#FFF1F2', '#FFE4E6', '#FCE7F3']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroDialCard}
        >
          {/* Decorative ambient blurred accents */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />

          <View style={styles.heroTopStatusRow}>
            {todayCycle.isInitialized && todayCycle.cycleDay > 0 ? (
              <>
                <View style={[styles.fertilityBadge, { backgroundColor: todayCycle.fertilityChance === 'High' ? '#F43F5E20' : '#A855F720' }]}>
                  <Text style={[styles.fertilityBadgeText, { color: todayCycle.fertilityChance === 'High' ? '#BE123C' : '#7E22CE' }]}>
                    {todayCycle.fertilityChance === 'High' ? '🔥 High Fertility Window' : todayCycle.fertilityChance === 'Medium' ? '✨ Moderate Conception' : '🌱 Low Conception Risk'}
                  </Text>
                </View>

                <View style={styles.phaseTagPill}>
                  <Text style={styles.phaseTagText}>{todayCycle.badgeEmoji} {todayCycle.phaseTitle}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.fertilityBadge, { backgroundColor: '#F1F5F9' }]}>
                  <Text style={[styles.fertilityBadgeText, { color: '#64748B' }]}>
                    🌸 Untracked Cycle
                  </Text>
                </View>

                <View style={styles.phaseTagPill}>
                  <Text style={styles.phaseTagText}>✨ Tap to Begin</Text>
                </View>
              </>
            )}
          </View>

          {/* Central Interactive Dial Display */}
          <View style={styles.centralDialWrap}>
            <View style={[styles.dialOuterRing, { borderColor: todayCycle.isInitialized && todayCycle.cycleDay > 0 ? todayCycle.themeColor + '40' : '#E2E8F0' }]}>
              <View style={[styles.dialInnerDisc, { backgroundColor: '#FFFFFF' }]}>
                <Text style={styles.dialEmojiTop}>{todayCycle.isInitialized && todayCycle.cycleDay > 0 ? todayCycle.badgeEmoji : '🌸'}</Text>
                <Text style={[styles.dialDayNumber, { color: todayCycle.isInitialized && todayCycle.cycleDay > 0 ? todayCycle.themeColor : '#64748B' }]}>
                  {todayCycle.isInitialized && todayCycle.cycleDay > 0 ? `Day ${todayCycle.cycleDay}` : 'Day 0'}
                </Text>
                <Text style={styles.dialSubLabel}>
                  {todayCycle.isInitialized && todayCycle.cycleDay > 0 ? `of ${settings.cycleLength} days cycle` : 'No cycle data yet'}
                </Text>
              </View>
            </View>
          </View>

          {/* Phase Summary & Next Period */}
          <View style={styles.heroPhaseSummaryBox}>
            <Text style={styles.heroPhaseMainText}>{todayCycle.phaseDescription}</Text>
            {todayCycle.isInitialized && todayCycle.daysUntilNextPeriod > 0 ? (
              <View style={styles.nextPeriodCountdownPill}>
                <Ionicons name="calendar-outline" size={14} color="#9F1239" style={{ marginRight: 6 }} />
                <Text style={styles.nextPeriodCountdownText}>
                  Next period expected in <Text style={{ fontWeight: '800' }}>{todayCycle.daysUntilNextPeriod} days</Text> (~{todayCycle.nextPeriodDate})
                </Text>
              </View>
            ) : (
              <View style={[styles.nextPeriodCountdownPill, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
                <Ionicons name="information-circle-outline" size={14} color="#64748B" style={{ marginRight: 6 }} />
                <Text style={[styles.nextPeriodCountdownText, { color: '#64748B' }]}>
                  No period data entered yet • Log below to start
                </Text>
              </View>
            )}
          </View>

          {/* Quick Period Log Action Button */}
          <TouchableOpacity
            style={[
              styles.periodLogQuickBtn,
              todayCycle.isPeriodActive ? styles.periodLogQuickBtnActive : null,
            ]}
            activeOpacity={0.85}
            onPress={async () => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              const willBeActive = !todayCycle.isPeriodActive;
              await logPeriodToggle(todayStr);
              showToast(
                willBeActive
                  ? 'Period started today logged 🩸 (Tap again to cancel)'
                  : 'Period cancelled & cycle reset ✨'
              );
            }}
          >
            <Text style={styles.periodLogQuickBtnText}>
              {todayCycle.isPeriodActive
                ? '🩸 Period Active Today • Tap to Cancel / Reset'
                : '🌸 Period Started Today? Log Here'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* ===================== INTERACTIVE CALENDAR SECTION ===================== */}
        <View style={styles.sectionCard}>
          <View style={styles.calendarHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Cycle Calendar 🗓️</Text>
              <Text style={styles.sectionSubtitle}>
                {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
            </View>

            <View style={styles.monthNavRow}>
              <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.monthNavBtn}>
                <Icon name="chevron-left" size={18} color="#475569" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.monthNavBtn}>
                <Icon name="chevron-right" size={18} color="#475569" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Weekday headers */}
          <View style={styles.weekdayRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <Text key={idx} style={styles.weekdayText}>
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar Day Grid */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((item, index) => {
              const dayCycle = calculateCycleInfo(item.dateStr, settings, dailyLogs);
              const isSelected = selectedDate === item.dateStr;
              const isToday = todayStr === item.dateStr;
              const hasLog = Boolean(dailyLogs[item.dateStr]);

              const isUntracked =
                settings.hasUserEnteredData === false ||
                !settings.lastPeriodStart ||
                settings.lastPeriodStart.trim() === '';

              const isPeriodDay = !isUntracked && dayCycle.isInitialized && dayCycle.isPeriodActive;
              const isOvulationDay = !isUntracked && dayCycle.isInitialized && dayCycle.phase === 'ovulation';

              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    setSelectedDate(item.dateStr);
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.7}
                  style={[
                    styles.calendarDayCell,
                    !item.isCurrentMonth && styles.dayOtherMonth,
                    isPeriodDay && styles.dayPeriodActive,
                    isOvulationDay && !isPeriodDay && styles.dayOvulationActive,
                    isSelected && styles.daySelectedRing,
                  ]}
                >
                  <Text
                    style={[
                      styles.calendarDayNum,
                      !item.isCurrentMonth && styles.dayNumOtherMonth,
                      isPeriodDay && styles.dayNumPeriod,
                      isOvulationDay && !isPeriodDay && styles.dayNumOvulation,
                      isSelected && styles.dayNumSelected,
                    ]}
                  >
                    {item.dayNum}
                  </Text>

                  {/* Day Indicator Dots */}
                  <View style={styles.dayDotContainer}>
                    {isPeriodDay && <View style={styles.periodDot} />}
                    {isOvulationDay && !isPeriodDay && <View style={styles.ovulationDot} />}
                    {!isUntracked && hasLog && !isPeriodDay && !isOvulationDay && <View style={styles.logDot} />}
                    {isToday && !isSelected && !isPeriodDay && !isOvulationDay && <View style={styles.todayDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Calendar Legend Bar */}
          <View style={styles.legendBar}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F43F5E' }]} />
              <Text style={styles.legendText}>Period Flow</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#A855F7' }]} />
              <Text style={styles.legendText}>Fertile / Ovulation</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>Logged Notes</Text>
            </View>
          </View>
        </View>

        {/* ===================== DAILY SYMPTOM & MOOD LOGGER ===================== */}
        <View style={styles.sectionCard}>
          <View style={styles.dailyLogHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>
                {selectedDate === todayStr ? "Today's Log 🌸" : `Log for ${parseYMD(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {selectedDayCycle.isInitialized
                  ? `Day ${selectedDayCycle.cycleDay} • ${selectedDayCycle.phaseTitle}`
                  : 'Day 0 • No Cycle Data'}
              </Text>
            </View>

            {dailyLogs[selectedDate] && (
              <View style={styles.loggedBadge}>
                <Text style={styles.loggedBadgeText}>Saved</Text>
              </View>
            )}
          </View>

          {/* 1. Period Flow Selector */}
          <Text style={styles.groupLabel}>Menstrual Flow</Text>
          <View style={styles.flowRow}>
            {FLOW_LEVELS.map((item) => {
              const isActive = localFlow === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.flowPill, isActive && styles.flowPillActive]}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setLocalFlow(item.id);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.flowPillText, isActive && styles.flowPillTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 2. Mood Chips */}
          <Text style={styles.groupLabel}>Mood & Emotions</Text>
          <View style={styles.chipsWrap}>
            {MOOD_OPTIONS.map((mood) => {
              const active = localMoods.includes(mood.id);
              return (
                <TouchableOpacity
                  key={mood.id}
                  style={[styles.chipBox, active && styles.chipBoxActive]}
                  onPress={() => handleToggleMood(mood.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipEmoji}>{mood.emoji}</Text>
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                    {mood.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 3. Physical Symptoms Chips */}
          <Text style={styles.groupLabel}>Body & Symptoms</Text>
          <View style={styles.chipsWrap}>
            {SYMPTOM_OPTIONS.map((sym) => {
              const active = localSymptoms.includes(sym.id);
              return (
                <TouchableOpacity
                  key={sym.id}
                  style={[styles.chipBox, active && styles.chipBoxActive]}
                  onPress={() => handleToggleSymptom(sym.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipEmoji}>{sym.emoji}</Text>
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                    {sym.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 4. Personal Notes */}
          <Text style={styles.groupLabel}>Personal Reflections & Symptoms</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Log energy levels, body temperature, or special sensations..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            value={localNotes}
            onChangeText={setLocalNotes}
          />

          {/* Save Daily Log Button */}
          <TouchableOpacity
            style={styles.saveLogBtn}
            onPress={handleSaveDailyLog}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#F43F5E', '#E11D48']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveLogGradient}
            >
              <Text style={styles.saveLogBtnText}>Save Symptoms & Daily Notes</Text>
              <Icon name="check" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ===================== PHASE INSIGHTS & HOLISTIC GUIDANCE ===================== */}
        <View style={styles.sectionCard}>
          <View style={styles.insightHeaderRow}>
            <Text style={styles.sectionTitle}>Phase Insights & Body Care 🌿</Text>
            <View style={styles.phasePillSmall}>
              <Text style={styles.phasePillSmallText}>{currentPhaseInsight.title}</Text>
            </View>
          </View>

          <View style={styles.insightItemBox}>
            <View style={styles.insightIconWrap}>
              <Text style={{ fontSize: 18 }}>🧠</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.insightItemTitle}>Hormones & Energy</Text>
              <Text style={styles.insightItemDesc}>{currentPhaseInsight.hormone}</Text>
              <Text style={[styles.insightItemDesc, { marginTop: 2, color: '#64748B' }]}>
                {currentPhaseInsight.energy}
              </Text>
            </View>
          </View>

          <View style={styles.insightItemBox}>
            <View style={styles.insightIconWrap}>
              <Text style={{ fontSize: 18 }}>🥗</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.insightItemTitle}>Recommended Nutrition</Text>
              <Text style={styles.insightItemDesc}>{currentPhaseInsight.nutrition}</Text>
            </View>
          </View>

          <View style={styles.insightItemBox}>
            <View style={styles.insightIconWrap}>
              <Text style={{ fontSize: 18 }}>🧘‍♀️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.insightItemTitle}>Movement & Exercise</Text>
              <Text style={styles.insightItemDesc}>{currentPhaseInsight.workout}</Text>
            </View>
          </View>

          <View style={[styles.insightItemBox, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <View style={styles.insightIconWrap}>
              <Text style={{ fontSize: 18 }}>💖</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.insightItemTitle}>Self-Care Ritual</Text>
              <Text style={styles.insightItemDesc}>{currentPhaseInsight.tip}</Text>
            </View>
          </View>
        </View>

        {/* ===================== CYCLE STATS & REGULARITY ===================== */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Cycle Regularity & Overview 📊</Text>
          <View style={styles.statsThreeCols}>
            <View style={styles.statsCardCol}>
              <Text style={styles.statsColValue}>{settings.cycleLength}d</Text>
              <Text style={styles.statsColLabel}>Cycle Length</Text>
            </View>

            <View style={styles.statsCardCol}>
              <Text style={styles.statsColValue}>{settings.periodDuration}d</Text>
              <Text style={styles.statsColLabel}>Period Duration</Text>
            </View>

            <View style={styles.statsCardCol}>
              <Text style={[styles.statsColValue, { color: '#10B981' }]}>Regular</Text>
              <Text style={styles.statsColLabel}>Cycle Pattern</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.adjustConfigBtn}
            onPress={() => setSettingsModalVisible(true)}
            activeOpacity={0.8}
          >
            <Icon name="edit-2" size={15} color="#BE123C" style={{ marginRight: 6 }} />
            <Text style={styles.adjustConfigBtnText}>Adjust Cycle Length & Period Parameters</Text>
          </TouchableOpacity>
        </View>

        {/* Generous bottom spacing spacer ensuring complete clearance above Android navigation bar */}
        <View style={{ height: Platform.OS === 'android' ? 44 : 20 }} />
      </ScrollView>

      {/* ===================== SETTINGS & SETUP MODAL ===================== */}
      <Modal
        visible={settingsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheet,
              {
                paddingBottom:
                  Platform.OS === 'android'
                    ? Math.max(insets.bottom, 28) + 28
                    : Math.max(insets.bottom, 16) + 24,
              },
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Cycle Configuration ⚙️</Text>
              <TouchableOpacity
                onPress={() => setSettingsModalVisible(false)}
                style={styles.modalCloseCircle}
              >
                <Icon name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Stepper: Cycle Length */}
            <View style={styles.stepperContainer}>
              <View>
                <Text style={styles.stepperTitle}>Average Cycle Length</Text>
                <Text style={styles.stepperSubtitle}>Time between period starts (21 - 45 days)</Text>
              </View>

              <View style={styles.stepperControls}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setTempCycleLength((prev) => Math.max(21, prev - 1))}
                >
                  <Icon name="minus" size={16} color="#475569" />
                </TouchableOpacity>
                <Text style={styles.stepperValueText}>{tempCycleLength} days</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setTempCycleLength((prev) => Math.min(45, prev + 1))}
                >
                  <Icon name="plus" size={16} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Stepper: Period Duration */}
            <View style={styles.stepperContainer}>
              <View>
                <Text style={styles.stepperTitle}>Average Period Duration</Text>
                <Text style={styles.stepperSubtitle}>Number of flow days (2 - 10 days)</Text>
              </View>

              <View style={styles.stepperControls}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setTempPeriodDuration((prev) => Math.max(2, prev - 1))}
                >
                  <Icon name="minus" size={16} color="#475569" />
                </TouchableOpacity>
                <Text style={styles.stepperValueText}>{tempPeriodDuration} days</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setTempPeriodDuration((prev) => Math.min(10, prev + 1))}
                >
                  <Icon name="plus" size={16} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Last Period Start Date */}
            <View style={styles.lastPeriodInputRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepperTitle}>Last Period Start Date</Text>
                <Text style={styles.stepperSubtitle}>Format: YYYY-MM-DD</Text>
              </View>
              <TextInput
                style={styles.dateInputField}
                value={tempLastPeriod}
                onChangeText={setTempLastPeriod}
                placeholder="YYYY-MM-DD"
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={styles.modalSaveBtn}
              onPress={handleSaveSettings}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={['#F43F5E', '#E11D48']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalSaveGradient}
              >
                <Text style={styles.modalSaveBtnText}>Save Parameters & Recalculate</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Clear / Reset to Day 0 Button */}
            <TouchableOpacity
              style={{
                marginTop: 12,
                paddingVertical: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#CBD5E1',
                backgroundColor: '#F8FAFC',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={handleResetCycle}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B' }}>
                Reset Cycle Data to Day 0 (Untracked)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default MenstrualCycleScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FDF4EE',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FDF4EE',
  },
  headerCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3E8DF',
    ...Shadow.sm,
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#881337',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#9F1239',
    marginTop: 2,
    fontWeight: '500',
  },
  toastContainer: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    zIndex: 999,
    backgroundColor: '#1E293B',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    ...Shadow.md,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  /* ==================== HERO DIAL CARD ==================== */
  heroDialCard: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECDD3',
    position: 'relative',
    overflow: 'hidden',
    ...Shadow.sm,
  },
  decorCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FB718520',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#A855F715',
  },
  heroTopStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  fertilityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  fertilityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  phaseTagPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#FCE7F3',
  },
  phaseTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#881337',
  },
  centralDialWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  dialOuterRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F2',
  },
  dialInnerDisc: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  dialEmojiTop: {
    fontSize: 22,
    marginBottom: 2,
  },
  dialDayNumber: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  dialSubLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  heroPhaseSummaryBox: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  heroPhaseMainText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4C0519',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  nextPeriodCountdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FCE7F3',
  },
  nextPeriodCountdownText: {
    fontSize: 12,
    color: '#881337',
    fontWeight: '500',
  },
  periodLogQuickBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F43F5E',
    borderRadius: BorderRadius.xl,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodLogQuickBtnActive: {
    backgroundColor: '#FFE4E6',
    borderColor: '#E11D48',
  },
  periodLogQuickBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#BE123C',
  },

  /* ==================== GENERAL SECTION CARD ==================== */
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3E8DF',
    ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },

  /* ==================== CALENDAR STYLES ==================== */
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  weekdayText: {
    width: (SCREEN_WIDTH - 76) / 7,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  calendarDayCell: {
    width: (SCREEN_WIDTH - 76) / 7,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dayOtherMonth: {
    opacity: 0.35,
  },
  dayPeriodActive: {
    backgroundColor: '#FFE4E6',
    borderColor: '#FDA4AF',
  },
  dayOvulationActive: {
    backgroundColor: '#F3E8FF',
    borderColor: '#D8B4FE',
  },
  daySelectedRing: {
    borderColor: '#BE123C',
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  calendarDayNum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  dayNumOtherMonth: {
    color: '#94A3B8',
  },
  dayNumPeriod: {
    color: '#BE123C',
    fontWeight: '800',
  },
  dayNumOvulation: {
    color: '#7E22CE',
    fontWeight: '800',
  },
  dayNumSelected: {
    color: '#BE123C',
    fontWeight: '900',
  },
  dayDotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 6,
    marginTop: 2,
    gap: 2,
  },
  periodDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F43F5E',
  },
  ovulationDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#A855F7',
  },
  logDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#0284C7',
  },
  legendBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },

  /* ==================== DAILY SYMPTOM LOGGER ==================== */
  dailyLogHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  loggedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  loggedBadgeText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '700',
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 14,
    marginBottom: 8,
  },
  flowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  flowPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  flowPillActive: {
    backgroundColor: '#FFE4E6',
    borderColor: '#F43F5E',
  },
  flowPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  flowPillTextActive: {
    color: '#BE123C',
    fontWeight: '800',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipBoxActive: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FB7185',
  },
  chipEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chipLabelActive: {
    color: '#BE123C',
    fontWeight: '800',
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: '#1E293B',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  saveLogBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    ...Shadow.sm,
  },
  saveLogGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  saveLogBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  /* ==================== PHASE INSIGHTS ==================== */
  insightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  phasePillSmall: {
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  phasePillSmallText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BE123C',
  },
  insightItemBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  insightIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  insightItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  insightItemDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },

  /* ==================== CYCLE STATS ==================== */
  statsThreeCols: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 14,
    gap: 8,
  },
  statsCardCol: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statsColValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  statsColLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  adjustConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
  },
  adjustConfigBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#BE123C',
  },

  /* ==================== MODAL STYLES ==================== */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 34,
    ...Shadow.lg,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepperTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  stepperSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    minWidth: 60,
    textAlign: 'center',
  },
  lastPeriodInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  dateInputField: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
    width: 120,
    textAlign: 'center',
  },
  modalSaveBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    ...Shadow.sm,
  },
  modalSaveGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
