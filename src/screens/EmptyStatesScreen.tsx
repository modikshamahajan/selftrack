import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Spacing } from '../theme/spacing';
import Button from '../components/Button';

// Reusable Empty State Component
interface EmptyStateProps {
  icon: string;
  iconColor?: string;
  title: string;
  message: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  iconColor = Colors.primary,
  title,
  message,
  actionTitle,
  onAction,
  style,
}) => (
  <View style={[styles.emptyContainer, style]}>
    <View style={[styles.emptyIcon, { backgroundColor: iconColor + '15' }]}>
      <Icon name={icon as any} size={40} color={iconColor} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyMessage}>{message}</Text>
    {actionTitle && onAction && (
      <Button title={actionTitle} onPress={onAction} variant="primary" size="sm" fullWidth={false} style={styles.emptyBtn} />
    )}
  </View>
);

// Reusable Success State Component
interface SuccessStateProps {
  title: string;
  message: string;
  xpEarned?: number;
  badgeTitle?: string;
  onContinue?: () => void;
}

export const SuccessState: React.FC<SuccessStateProps> = ({
  title,
  message,
  xpEarned,
  badgeTitle,
  onContinue,
}) => (
  <View style={styles.successContainer}>
    <View style={styles.successIcon}>
      <Icon name="check-circle" size={56} color={Colors.primary} />
    </View>
    <Text style={styles.successTitle}>{title}</Text>
    <Text style={styles.successMessage}>{message}</Text>
    {xpEarned && (
      <View style={styles.xpBadge}>
        <Icon name="star" size={16} color={Colors.xpGold} />
        <Text style={styles.xpText}>+{xpEarned} XP</Text>
      </View>
    )}
    {badgeTitle && (
      <View style={styles.badgeEarned}>
        <Icon name="award" size={16} color={Colors.secondary} />
        <Text style={styles.badgeText}>{badgeTitle}</Text>
      </View>
    )}
    {onContinue && (
      <Button title="Continue" onPress={onContinue} variant="gradient" style={styles.continueBtn} />
    )}
  </View>
);

// Predefined empty states for common screens
export const EmptyHabits: React.FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <EmptyState icon="check-square" title="No Habits Yet" message="Start building better habits today. Add your first habit to begin tracking!" actionTitle="Add Habit" onAction={onAdd} />
);

export const EmptyJournal: React.FC<{ onWrite: () => void }> = ({ onWrite }) => (
  <EmptyState icon="book-open" iconColor={Colors.secondary} title="Your Journal is Empty" message="Start writing your thoughts, feelings, and daily reflections." actionTitle="Write Entry" onAction={onWrite} />
);

export const EmptyFeed: React.FC = () => (
  <EmptyState icon="users" iconColor={Colors.accent} title="No Posts Yet" message="Connect with friends to see their updates and share your achievements!" actionTitle="Find Friends" onAction={() => { }} />
);

const styles = StyleSheet.create({
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingVertical: 60 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { ...Typography.heading3, color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  emptyMessage: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyBtn: { paddingHorizontal: 32 },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingVertical: 60 },
  successIcon: { marginBottom: 20 },
  successTitle: { ...Typography.heading2, color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  successMessage: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  xpBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF8E1', paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full, marginBottom: 8 },
  xpText: { ...Typography.body, fontWeight: '700', color: Colors.xpGold },
  badgeEarned: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0EEFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full, marginBottom: 24 },
  badgeText: { ...Typography.body, fontWeight: '600', color: Colors.secondary },
  continueBtn: { marginTop: 16, width: '100%' },
});

export default EmptyState;
