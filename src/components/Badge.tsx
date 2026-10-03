import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';

interface BadgeProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  color?: string;
  unlocked?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Badge: React.FC<BadgeProps> = ({
  icon,
  title,
  description,
  color = Colors.primary,
  unlocked = true,
  size = 'md',
}) => {
  const badgeSize = size === 'sm' ? 40 : size === 'lg' ? 72 : 56;

  return (
    <View style={[styles.container, !unlocked && styles.locked]}>
      <View
        style={[
          styles.badge,
          {
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            backgroundColor: unlocked ? color + '20' : Colors.backgroundGray,
          },
        ]}>
        {icon || (
          <Icon
            name="award"
            size={badgeSize * 0.45}
            color={unlocked ? color : Colors.textTertiary}
          />
        )}
      </View>
      {title && (
        <Text style={[styles.title, !unlocked && styles.lockedText]} numberOfLines={2}>
          {title}
        </Text>
      )}
      {description && (
        <Text style={styles.description} numberOfLines={1}>{description}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: 80 },
  locked: { opacity: 0.5 },
  badge: { justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  title: { ...Typography.caption, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  lockedText: { color: Colors.textTertiary },
  description: { ...Typography.overline, color: Colors.textTertiary, textAlign: 'center', marginTop: 2 },
});

export default Badge;
