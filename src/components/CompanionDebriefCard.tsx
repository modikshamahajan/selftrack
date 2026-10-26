import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Shadow } from '../theme/spacing';

interface CompanionDebriefCardProps {
  vitalityScore: number;
  habitsDone: number;
  totalHabits: number;
  waterGlasses: number;
  waterTarget: number;
  hasJournalToday: boolean;
  focusMinutes: number;
  onNavigateToFocus: () => void;
  onNavigateToJournal: () => void;
  onNavigateToAIChat: () => void;
}

export const CompanionDebriefCard: React.FC<CompanionDebriefCardProps> = ({
  vitalityScore,
  habitsDone,
  totalHabits,
  waterGlasses,
  waterTarget,
  hasJournalToday,
  focusMinutes,
  onNavigateToFocus,
  onNavigateToJournal,
  onNavigateToAIChat,
}) => {
  const currentHour = new Date().getHours();
  const timePeriod =
    currentHour >= 5 && currentHour < 12
      ? 'morning'
      : currentHour >= 12 && currentHour < 17
      ? 'afternoon'
      : 'evening';

  const { title, subtitle, aiMessage, promptAction, promptActionLabel, gradientColors, badgeText } = useMemo(() => {
    if (timePeriod === 'evening') {
      const isHighVitality = vitalityScore >= 70;
      return {
        title: "Evening Companion Debrief",
        subtitle: "Daily Reflection & Wind-Down",
        badgeText: "8:00 PM REPORT",
        gradientColors: ['#1E1B4B', '#312E81'] as [string, string],
        aiMessage: isHighVitality
          ? `Outstanding work today! You attained a ${vitalityScore}/100 Vitality score with ${habitsDone} habit${habitsDone !== 1 ? 's' : ''} completed. Wind down with calm breathing for restful sleep.`
          : `You've got ${Math.max(0, totalHabits - habitsDone)} habit${totalHabits - habitsDone !== 1 ? 's' : ''} remaining today. Reflect on 1 win in your journal or take 1 minute to breathe and reset.`,
        promptAction: hasJournalToday ? onNavigateToFocus : onNavigateToJournal,
        promptActionLabel: hasJournalToday ? "1-Min Box Breathing" : "Write Night Reflection",
      };
    } else if (timePeriod === 'morning') {
      return {
        title: "Morning Companion Briefing",
        subtitle: "Prime Your Focus & Mind",
        badgeText: "DAILY LAUNCH",
        gradientColors: ['#065F46', '#047857'] as [string, string],
        aiMessage:
          waterGlasses < 2
            ? `Good morning! Kickstart your biological clock with a tall glass of water and check off your first morning habit.`
            : `Great early momentum! You've already logged ${waterGlasses} glasses. Keep this energy rolling into your priority goals.`,
        promptAction: onNavigateToFocus,
        promptActionLabel: "Start 25m Focus Block",
      };
    } else {
      return {
        title: "Midday Momentum Check",
        subtitle: "Sustain Your Flow",
        badgeText: "MIDDAY PULSE",
        gradientColors: ['#1E293B', '#334155'] as [string, string],
        aiMessage:
          habitsDone >= Math.ceil(totalHabits / 2)
            ? `Solid midday execution! You're over halfway through daily habits. Hydrate and take a 5-min screen rest.`
            : `Afternoon dip? Re-focus with a quick glass of water (${waterGlasses}/${waterTarget} done) and a 1-minute breath reset.`,
        promptAction: onNavigateToFocus,
        promptActionLabel: "Quick Focus / Breathe",
      };
    }
  }, [timePeriod, vitalityScore, habitsDone, totalHabits, waterGlasses, waterTarget, hasJournalToday]);

  return (
    <View style={styles.cardContainer}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientCard}
      >
        {/* TOP ROW */}
        <View style={styles.topRow}>
          <View>
            <View style={styles.badgeRow}>
              <View style={styles.coachBadge}>
                <Icon name="cpu" size={12} color="#A7F3D0" />
                <Text style={styles.coachBadgeText}>AI LIFE COMPANION</Text>
              </View>
              <View style={styles.timeBadge}>
                <Text style={styles.timeBadgeText}>{badgeText}</Text>
              </View>
            </View>
            <Text style={styles.mainTitle}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <TouchableOpacity
            onPress={onNavigateToAIChat}
            activeOpacity={0.8}
            style={styles.chatBubbleBtn}
          >
            <Icon name="message-square" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* AI SYNTHESIS MESSAGE */}
        <View style={styles.aiMessageWrap}>
          <View style={styles.aiPulseDot} />
          <Text style={styles.aiMessageText}>{aiMessage}</Text>
        </View>

        {/* COMPANION STATS STRIP */}
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{vitalityScore}%</Text>
            <Text style={styles.statLabel}>Vitality</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{habitsDone}/{totalHabits}</Text>
            <Text style={styles.statLabel}>Habits</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{focusMinutes}m</Text>
            <Text style={styles.statLabel}>Focus</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{hasJournalToday ? 'Done ✨' : '0'}</Text>
            <Text style={styles.statLabel}>Journal</Text>
          </View>
        </View>

        {/* ACTION ROW */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={promptAction}
            activeOpacity={0.85}
          >
            <Icon name="play" size={14} color="#0F172A" />
            <Text style={styles.primaryActionText}>{promptActionLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={onNavigateToAIChat}
            activeOpacity={0.8}
          >
            <Icon name="send" size={14} color="#FFF" />
            <Text style={styles.secondaryActionText}>Ask Coach</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    ...Shadow.md,
  },
  gradientCard: {
    padding: 20,
    borderRadius: 24,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  coachBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  coachBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#A7F3D0',
    letterSpacing: 0.6,
  },
  timeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  timeBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  mainTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  chatBubbleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  // AI MESSAGE
  aiMessageWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    borderRadius: 14,
    gap: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  aiPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
    marginTop: 4,
  },
  aiMessageText: {
    flex: 1,
    fontSize: 13,
    color: '#F1F5F9',
    lineHeight: 18,
    fontWeight: '500',
  },

  // STATS STRIP
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },

  // ACTIONS ROW
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
    ...Shadow.sm,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
