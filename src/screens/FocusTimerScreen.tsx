import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather as Icon, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Shadow } from '../theme/spacing';
import ProgressRing from '../components/ProgressRing';
import { useFocusEffect } from '@react-navigation/native';
import { ambientSoundEngine, SoundscapeType } from '../utils/ambientSoundscapes';
import { useFocusStore } from '../store/useFocusStore';
import { playCelebrationSound } from '../utils/celebrationSound';

const { width } = Dimensions.get('window');

type TimerMode = 'pomodoro' | 'breathing';

const POMODORO_PRESETS = [
  { label: '15m', minutes: 15 },
  { label: '25m', minutes: 25 },
  { label: '45m', minutes: 45 },
  { label: '60m', minutes: 60 },
];

const SOUNDSCAPES: { id: SoundscapeType; label: string; icon: string; emoji: string }[] = [
  { id: 'none', label: 'Silent', icon: 'volume-x', emoji: '🔇' },
  { id: 'rain', label: 'Rain', icon: 'cloud-rain', emoji: '🌧️' },
  { id: 'waves', label: 'Ocean', icon: 'wind', emoji: '🌊' },
  { id: 'forest', label: 'Forest', icon: 'feather', emoji: '🌲' },
  { id: 'lofi', label: 'Lo-Fi', icon: 'headphones', emoji: '☕' },
];

const BREATHE_PHASES = [
  { name: 'Inhale', duration: 4, label: 'Breathe in slowly through your nose...', color: '#38BDF8', kind: 'inhale' as const },
  { name: 'Hold', duration: 4, label: 'Hold your breath gently...', color: '#818CF8', kind: 'hold' as const },
  { name: 'Exhale', duration: 4, label: 'Release and exhale smoothly...', color: '#34D399', kind: 'exhale' as const },
  { name: 'Hold', duration: 4, label: 'Rest before the next breath...', color: '#A78BFA', kind: 'hold' as const },
];

export const FocusTimerScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<TimerMode>('pomodoro');

  // Pomodoro State
  const [selectedMinutes, setSelectedMinutes] = useState(25);
  const [isBreak, setIsBreak] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [activeSound, setActiveSound] = useState<SoundscapeType>('none');

  // Box Breathing State
  const [isBreathingRunning, setIsBreathingRunning] = useState(false);
  const [breathPhaseIndex, setBreathPhaseIndex] = useState(0);
  const [breathSecondsLeft, setBreathSecondsLeft] = useState(4);
  const [breathCyclesCompleted, setBreathCyclesCompleted] = useState(0);

  // Focus Store
  const {
    todayFocusMinutes,
    sessionsCompletedToday,
    recordCompletedSession,
    resetDailyIfNewDate,
  } = useFocusStore();

  useEffect(() => {
    resetDailyIfNewDate();
  }, []);

  // Breathing animated scale & glow
  const breatheScale = useSharedValue(1);
  const breatheOpacity = useSharedValue(0.85);

  const animatedBreatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breatheScale.value }],
    opacity: breatheOpacity.value,
  }));

  // Clean up soundscape on unmount or when navigating away
  useEffect(() => {
    return () => {
      ambientSoundEngine.stopSoundscape();
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        ambientSoundEngine.stopSoundscape();
        setActiveSound('none');
      };
    }, [])
  );

  // Handle Pomodoro countdown
  useEffect(() => {
    let timer: any = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      // Completed Pomodoro session!
      setIsRunning(false);
      ambientSoundEngine.stopSoundscape();
      setActiveSound('none');
      playCelebrationSound();

      if (!isBreak) {
        // Record focus session
        recordCompletedSession(selectedMinutes, 'pomodoro');
        setIsBreak(true);
        setTimeLeft(5 * 60); // 5 min break
      } else {
        setIsBreak(false);
        setTimeLeft(selectedMinutes * 60);
      }
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, timeLeft, isBreak, selectedMinutes]);

  // Synchronize Reanimated breathing animation safely inside useEffect (never during render)
  useEffect(() => {
    if (!isBreathingRunning) {
      breatheScale.value = withTiming(1.0, { duration: 1000 });
      breatheOpacity.value = withTiming(0.85, { duration: 1000 });
      return;
    }

    if (breathPhaseIndex === 0) {
      // Inhale: expand circle smoothly
      breatheScale.value = withTiming(1.4, { duration: 4000, easing: Easing.inOut(Easing.ease) });
      breatheOpacity.value = withTiming(1, { duration: 4000 });
    } else if (breathPhaseIndex === 1) {
      // Hold (Full): gentle pulse hold
      breatheScale.value = withTiming(1.38, { duration: 4000, easing: Easing.inOut(Easing.ease) });
      breatheOpacity.value = withTiming(0.95, { duration: 4000 });
    } else if (breathPhaseIndex === 2) {
      // Exhale: contract circle smoothly
      breatheScale.value = withTiming(1.0, { duration: 4000, easing: Easing.inOut(Easing.ease) });
      breatheOpacity.value = withTiming(0.7, { duration: 4000 });
    } else if (breathPhaseIndex === 3) {
      // Hold (Empty): resting hold
      breatheScale.value = withTiming(1.02, { duration: 4000, easing: Easing.inOut(Easing.ease) });
      breatheOpacity.value = withTiming(0.75, { duration: 4000 });
    }
  }, [isBreathingRunning, breathPhaseIndex]);

  // Handle Box Breathing cycle (4s Inhale, 4s Hold, 4s Exhale, 4s Hold)
  useEffect(() => {
    let timer: any = null;
    if (isBreathingRunning) {
      timer = setInterval(() => {
        setBreathSecondsLeft((prev) => {
          if (prev > 1) {
            return prev - 1;
          } else {
            // Next phase
            const nextIndex = (breathPhaseIndex + 1) % 4;
            setBreathPhaseIndex(nextIndex);

            // Audio chime for next phase
            const nextPhase = BREATHE_PHASES[nextIndex];
            ambientSoundEngine.playChime(nextPhase.kind);

            if (nextIndex === 0) {
              // Completed 1 full cycle
              setBreathCyclesCompleted((c) => {
                const nextC = c + 1;
                if (nextC >= 4) {
                  // 1 Full Minute Finished!
                  setIsBreathingRunning(false);
                  playCelebrationSound();
                  recordCompletedSession(1, 'breathing');
                }
                return nextC;
              });
            }

            return nextPhase.duration;
          }
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isBreathingRunning, breathPhaseIndex]);

  const handleToggleTimer = () => {
    if (!isRunning) {
      ambientSoundEngine.playChime('start');
      if (activeSound !== 'none') {
        ambientSoundEngine.startSoundscape(activeSound);
      }
      setIsRunning(true);
    } else {
      ambientSoundEngine.stopSoundscape();
      setIsRunning(false);
    }
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    ambientSoundEngine.stopSoundscape();
    setIsBreak(false);
    setTimeLeft(selectedMinutes * 60);
  };

  const handleSelectPreset = (minutes: number) => {
    setSelectedMinutes(minutes);
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(minutes * 60);
  };

  const handleSelectSound = (sound: SoundscapeType) => {
    if (activeSound === sound) {
      setActiveSound('none');
      ambientSoundEngine.stopSoundscape();
    } else {
      setActiveSound(sound);
      if (isRunning || activeTab === 'pomodoro') {
        ambientSoundEngine.startSoundscape(sound);
      }
    }
  };

  const handleStartBreathing = () => {
    if (!isBreathingRunning) {
      setBreathPhaseIndex(0);
      setBreathSecondsLeft(4);
      setBreathCyclesCompleted(0);
      setIsBreathingRunning(true);
      ambientSoundEngine.playChime('inhale');
    } else {
      setIsBreathingRunning(false);
    }
  };

  // Time format
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const totalTargetSecs = (isBreak ? 5 : selectedMinutes) * 60;
  const progressPercent = Math.min(100, Math.round(((totalTargetSecs - timeLeft) / totalTargetSecs) * 100));

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            ambientSoundEngine.stopSoundscape();
            navigation.goBack();
          }}
          style={styles.backBtn}
        >
          <Icon name="arrow-left" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Focus & Mindfulness</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {/* MODE TABS */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setActiveTab('pomodoro');
            if (isBreathingRunning) setIsBreathingRunning(false);
          }}
          style={[styles.tabBtn, activeTab === 'pomodoro' && styles.tabBtnActive]}
        >
          <Icon name="clock" size={16} color={activeTab === 'pomodoro' ? '#FFF' : '#64748B'} />
          <Text style={[styles.tabBtnText, activeTab === 'pomodoro' && styles.tabBtnTextActive]}>
            Pomodoro Flow
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setActiveTab('breathing');
            if (isRunning) {
              setIsRunning(false);
              ambientSoundEngine.stopSoundscape();
            }
          }}
          style={[styles.tabBtn, activeTab === 'breathing' && styles.tabBtnActive]}
        >
          <Icon name="wind" size={16} color={activeTab === 'breathing' ? '#FFF' : '#64748B'} />
          <Text style={[styles.tabBtnText, activeTab === 'breathing' && styles.tabBtnTextActive]}>
            Box Breathing (1m)
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'pomodoro' ? (
          <Animated.View entering={FadeInDown.duration(400)}>
            {/* PRESET CHIPS */}
            <View style={styles.presetRow}>
              {POMODORO_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  disabled={isRunning}
                  onPress={() => handleSelectPreset(preset.minutes)}
                  style={[
                    styles.presetChip,
                    selectedMinutes === preset.minutes && !isBreak && styles.presetChipActive,
                    isRunning && styles.presetChipDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      selectedMinutes === preset.minutes && !isBreak && styles.presetChipTextActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* MAIN TIMER DISPLAY */}
            <View style={styles.timerCircleOuter}>
              <ProgressRing
                progress={progressPercent}
                size={230}
                strokeWidth={12}
                color={isBreak ? '#10B981' : '#6366F1'}
                showPercentage={false}
              >
                <View style={styles.timerCenterContent}>
                  <View
                    style={[
                      styles.phaseTag,
                      { backgroundColor: isBreak ? '#ECFDF5' : '#EEF2FF' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.phaseTagText,
                        { color: isBreak ? '#059669' : '#4F46E5' },
                      ]}
                    >
                      {isBreak ? '☕ SHORT BREAK' : '🚀 DEEP WORK FLOW'}
                    </Text>
                  </View>

                  <Text style={styles.timeBigText}>{timeFormatted}</Text>

                  <Text style={styles.timeSubText}>
                    {isRunning ? 'Stay in the zone...' : 'Tap start when ready'}
                  </Text>
                </View>
              </ProgressRing>
            </View>

            {/* CONTROLS */}
            <View style={styles.controlsRow}>
              <TouchableOpacity
                onPress={handleResetTimer}
                style={styles.secondaryControlBtn}
                activeOpacity={0.7}
              >
                <Icon name="rotate-ccw" size={22} color="#64748B" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleToggleTimer}
                style={styles.primaryControlBtn}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={isRunning ? ['#F59E0B', '#D97706'] : ['#6366F1', '#4F46E5']}
                  style={styles.primaryControlGradient}
                >
                  <Icon name={isRunning ? 'pause' : 'play'} size={28} color="#FFF" />
                  <Text style={styles.primaryControlText}>
                    {isRunning ? 'Pause' : 'Start Focus'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setIsBreak(!isBreak);
                  setTimeLeft(isBreak ? selectedMinutes * 60 : 5 * 60);
                }}
                style={styles.secondaryControlBtn}
                activeOpacity={0.7}
              >
                <Icon name="coffee" size={22} color={isBreak ? '#10B981' : '#64748B'} />
              </TouchableOpacity>
            </View>

            {/* SOUNDSCAPES BAR */}
            <View style={styles.soundscapesCard}>
              <View style={styles.soundscapeHeader}>
                <View style={styles.soundscapeTitleRow}>
                  <Icon name="headphones" size={16} color="#6366F1" />
                  <Text style={styles.soundscapeTitle}>Ambient Soundscapes</Text>
                </View>
                {activeSound !== 'none' && (
                  <View style={styles.playingBadge}>
                    <Text style={styles.playingBadgeText}>Playing</Text>
                  </View>
                )}
              </View>

              <View style={styles.soundGrid}>
                {SOUNDSCAPES.map((s) => {
                  const isSelected = activeSound === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      activeOpacity={0.8}
                      onPress={() => handleSelectSound(s.id)}
                      style={[styles.soundBtn, isSelected && styles.soundBtnActive]}
                    >
                      <Text style={styles.soundEmoji}>{s.emoji}</Text>
                      <Text style={[styles.soundLabel, isSelected && styles.soundLabelActive]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* DAILY STATS BANNER */}
            <View style={styles.statsBanner}>
              <View style={styles.statCol}>
                <Text style={styles.statVal}>{todayFocusMinutes}m</Text>
                <Text style={styles.statLabel}>Today's Focus</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statVal}>{sessionsCompletedToday}</Text>
                <Text style={styles.statLabel}>Sessions Completed</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={[styles.statVal, { color: '#F59E0B' }]}>
                  +{sessionsCompletedToday * 15}
                </Text>
                <Text style={styles.statLabel}>XP Earned</Text>
              </View>
            </View>
          </Animated.View>
        ) : (
          /* BOX BREATHING MODE */
          <Animated.View entering={FadeInDown.duration(400)} style={styles.breathingContainer}>
            <View style={styles.breatheHeaderBlock}>
              <Text style={styles.breatheTitle}>Pranayama Box Breathing</Text>
              <Text style={styles.breatheSubtitle}>
                Inhale 4s • Hold 4s • Exhale 4s • Hold 4s
              </Text>
            </View>

            {/* ANIMATED SPHERE */}
            <View style={styles.breatheSphereContainer}>
              <Animated.View
                style={[
                  styles.breatheOuterGlow,
                  { backgroundColor: BREATHE_PHASES[breathPhaseIndex].color + '25' },
                  animatedBreatheStyle,
                ]}
              />
              <Animated.View
                style={[
                  styles.breatheCoreCircle,
                  { backgroundColor: BREATHE_PHASES[breathPhaseIndex].color },
                  animatedBreatheStyle,
                ]}
              >
                <Text style={styles.breatheCountdownNum}>
                  {isBreathingRunning ? breathSecondsLeft : '4s'}
                </Text>
                <Text style={styles.breathePhaseTitle}>
                  {isBreathingRunning ? BREATHE_PHASES[breathPhaseIndex].name : 'Ready'}
                </Text>
              </Animated.View>
            </View>

            {/* GUIDANCE TEXT */}
            <View style={styles.breatheGuidanceWrap}>
              <Text style={styles.breatheInstruction}>
                {isBreathingRunning
                  ? BREATHE_PHASES[breathPhaseIndex].label
                  : 'Take a relaxed posture, gently close your eyes, and tap Start.'}
              </Text>
              <Text style={styles.breatheCycleTracker}>
                Cycle {isBreathingRunning ? Math.min(4, breathCyclesCompleted + 1) : 0} of 4 (1 min)
              </Text>
            </View>

            {/* BREATHING ACTION BUTTON */}
            <TouchableOpacity
              onPress={handleStartBreathing}
              style={styles.breatheActionBtn}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={isBreathingRunning ? ['#EF4444', '#DC2626'] : ['#38BDF8', '#0284C7']}
                style={styles.breatheActionGradient}
              >
                <Icon name={isBreathingRunning ? 'square' : 'play'} size={24} color="#FFF" />
                <Text style={styles.breatheActionText}>
                  {isBreathingRunning ? 'End Session' : 'Start 1-Min Reset'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerRightPlaceholder: {
    width: 40,
  },

  // MODE TABS
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  tabBtnActive: {
    backgroundColor: '#4F46E5',
    ...Shadow.sm,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // PRESETS
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  presetChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  presetChipDisabled: {
    opacity: 0.5,
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  presetChipTextActive: {
    color: '#4F46E5',
  },

  // TIMER CIRCLE
  timerCircleOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 250,
    marginVertical: 10,
  },
  timerCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  phaseTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  timeBigText: {
    fontSize: 44,
    fontWeight: '900',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  timeSubText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },

  // CONTROLS
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    marginTop: 18,
    marginBottom: 24,
  },
  secondaryControlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.sm,
  },
  primaryControlBtn: {
    borderRadius: 30,
    overflow: 'hidden',
    ...Shadow.md,
  },
  primaryControlGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 10,
  },
  primaryControlText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // SOUNDSCAPES
  soundscapesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    ...Shadow.sm,
  },
  soundscapeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  soundscapeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  soundscapeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  playingBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  playingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  soundGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  soundBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  soundBtnActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#818CF8',
  },
  soundEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  soundLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  soundLabelActive: {
    color: '#4F46E5',
    fontWeight: '700',
  },

  // STATS BANNER
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.sm,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#F1F5F9',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },

  // BOX BREATHING
  breathingContainer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  breatheHeaderBlock: {
    alignItems: 'center',
    marginBottom: 36,
  },
  breatheTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  breatheSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  breatheSphereContainer: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  breatheOuterGlow: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
  },
  breatheCoreCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  breatheCountdownNum: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  breathePhaseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  breatheGuidanceWrap: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  breatheInstruction: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 22,
    minHeight: 44,
  },
  breatheCycleTracker: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366F1',
    marginTop: 8,
  },
  breatheActionBtn: {
    borderRadius: 30,
    overflow: 'hidden',
    width: '80%',
    ...Shadow.md,
  },
  breatheActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  breatheActionText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default FocusTimerScreen;
