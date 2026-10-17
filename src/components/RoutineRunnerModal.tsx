import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Feather as Icon, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { Colors } from '../theme/colors';
import { Shadow } from '../theme/spacing';
import { ambientSoundEngine } from '../utils/ambientSoundscapes';
import { playCelebrationSound } from '../utils/celebrationSound';
import { useAuthStore } from '../store/useAuthStore';
import { useHabitStore } from '../store/useHabitStore';

const { width } = Dimensions.get('window');

export interface RoutineStep {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  durationMins?: number;
}

interface RoutineRunnerModalProps {
  visible: boolean;
  routineTitle: string;
  routineType: 'morning' | 'evening' | 'custom';
  steps: RoutineStep[];
  onClose: () => void;
  onStepComplete?: (stepId: string) => void;
  onRoutineFinished?: () => void;
}

export const RoutineRunnerModal: React.FC<RoutineRunnerModalProps> = ({
  visible,
  routineTitle,
  routineType,
  steps,
  onClose,
  onStepComplete,
  onRoutineFinished,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [wasAlreadyClaimed, setWasAlreadyClaimed] = useState(false);

  useEffect(() => {
    if (visible) {
      setCurrentStepIndex(0);
      setIsFinished(false);
      setSecondsElapsed(0);
      setWasAlreadyClaimed(false);
    }
  }, [visible]);

  // Elapsed timer for active step
  useEffect(() => {
    let timer: any = null;
    if (visible && !isFinished) {
      timer = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [visible, isFinished, currentStepIndex]);

  const activeStep = steps[currentStepIndex];
  const totalSteps = steps.length;
  const progressPct = Math.round(((currentStepIndex + (isFinished ? 1 : 0)) / totalSteps) * 100);

  const handleNextStep = () => {
    if (activeStep && onStepComplete) {
      onStepComplete(activeStep.id);
    }
    ambientSoundEngine.playChime('complete');

    if (currentStepIndex + 1 < totalSteps) {
      setCurrentStepIndex((prev) => prev + 1);
      setSecondsElapsed(0);
    } else {
      // Completed entire routine!
      setIsFinished(true);
      playCelebrationSound();

      // Claim daily routine reward safely (guarantees XP is awarded once per day)
      try {
        const claimResult = useHabitStore.getState().claimRoutineReward(routineType);
        setWasAlreadyClaimed(claimResult.alreadyClaimed);
      } catch (e) {}

      if (onRoutineFinished) {
        onRoutineFinished();
      }
    }
  };

  const getGradientColors = (): [string, string] => {
    if (routineType === 'morning') return ['#F59E0B', '#D97706'];
    if (routineType === 'evening') return ['#6366F1', '#4338CA'];
    return ['#10B981', '#059669'];
  };

  const mins = Math.floor(secondsElapsed / 60);
  const secs = secondsElapsed % 60;
  const formattedTimer = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* TOP BAR */}
          <View style={styles.topBar}>
            <View style={styles.routineHeaderLeft}>
              <Text style={styles.routineTypeLabel}>
                {routineType === 'morning' ? '🌅 MORNING FLOW' : routineType === 'evening' ? '🌙 EVENING RITUAL' : '⚡ HABIT STACK'}
              </Text>
              <Text style={styles.routineMainTitle}>{routineTitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Icon name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* PROGRESS BAR */}
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={getGradientColors()}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progressPct}%` }]}
            />
          </View>
          <Text style={styles.stepProgressText}>
            {isFinished ? 'Routine Complete!' : `Step ${currentStepIndex + 1} of ${totalSteps}`}
          </Text>

          {!isFinished && activeStep ? (
            /* ACTIVE HABIT STEP */
            <Animated.View entering={FadeInDown.duration(300)} style={styles.stepBody}>
              <View style={[styles.stepIconWrap, { backgroundColor: activeStep.color + '18' }]}>
                <Icon name={(activeStep.icon as any) || 'check'} size={36} color={activeStep.color} />
              </View>

              <Text style={styles.stepTitle}>{activeStep.title}</Text>
              <Text style={styles.stepSubtitle}>{activeStep.subtitle}</Text>

              <View style={styles.timerPill}>
                <Icon name="clock" size={14} color="#64748B" />
                <Text style={styles.timerText}>{formattedTimer}</Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleNextStep}
                style={styles.doneBtn}
              >
                <LinearGradient
                  colors={getGradientColors()}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.doneGradient}
                >
                  <Icon name="check-circle" size={22} color="#FFF" />
                  <Text style={styles.doneBtnText}>
                    {currentStepIndex + 1 === totalSteps ? 'Complete Routine ✨' : 'Complete & Next Step'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            /* FINISHED CELEBRATION */
            <Animated.View entering={FadeIn.duration(400)} style={styles.finishedBody}>
              <Text style={styles.finishedEmoji}>🎉</Text>
              <Text style={styles.finishedTitle}>Ritual Mastered!</Text>
              <Text style={styles.finishedDesc}>
                You completed your stacked routine without friction. Consistency compounds every single day!
              </Text>

              <View style={[styles.rewardChip, wasAlreadyClaimed && styles.rewardChipAlready]}>
                <Text style={[styles.rewardChipText, wasAlreadyClaimed && styles.rewardChipTextAlready]}>
                  {wasAlreadyClaimed ? '✨ ROUTINE RE-COMPLETED (Daily +50 XP claimed today)' : '⚡ +50 BONUS XP EARNED'}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onClose}
                style={styles.doneBtn}
              >
                <LinearGradient
                  colors={getGradientColors()}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.doneGradient}
                >
                  <Text style={styles.doneBtnText}>Awesome, Let's Go!</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: Math.min(width - 40, 420),
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    ...Shadow.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  routineHeaderLeft: {
    flex: 1,
  },
  routineTypeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  routineMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepProgressText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'right',
    marginBottom: 20,
  },

  // STEP BODY
  stepBody: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  stepIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    fontVariant: ['tabular-nums'],
  },
  doneBtn: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 8,
    ...Shadow.md,
  },
  doneGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // FINISHED BODY
  finishedBody: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  finishedEmoji: {
    fontSize: 54,
    marginBottom: 12,
  },
  finishedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  finishedDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  rewardChip: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginVertical: 20,
  },
  rewardChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  rewardChipAlready: {
    backgroundColor: '#F1F5F9',
    borderColor: '#94A3B8',
  },
  rewardChipTextAlready: {
    color: '#475569',
  },
});
