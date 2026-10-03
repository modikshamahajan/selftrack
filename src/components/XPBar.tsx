import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Spacing } from '../theme/spacing';

interface XPBarProps {
  currentXP?: number;
  maxXP?: number;
  level?: number;
  showLabel?: boolean;
  height?: number;
  color?: string;
  style?: ViewStyle;
}

const XPBar: React.FC<XPBarProps> = ({
  currentXP = 0,
  maxXP = 1000,
  level = 1,
  showLabel = true,
  height = 12,
  color,
  style,
}) => {
  const progress = Math.min((currentXP / maxXP) * 100, 100);

  return (
    <View style={[styles.container, style]}>
      {showLabel ? (
        <View style={styles.labelRow}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{`Lv. ${level || 1}`}</Text>
          </View>
          <Text style={styles.xpText}>
            {`${(currentXP || 0).toLocaleString()} / ${(maxXP || 1000).toLocaleString()} XP`}
          </Text>
        </View>
      ) : null}
      <View style={[styles.track, { height }]}>
        <LinearGradient
          colors={color ? [color, color] : Colors.gradients.success}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${progress}%`, height, borderRadius: height / 2 }]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  levelBadge: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  levelText: { ...Typography.caption, fontWeight: '700', color: Colors.primary },
  xpText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '500' },
  track: {
    width: '100%',
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  fill: { borderRadius: BorderRadius.full },
});

export default XPBar;
