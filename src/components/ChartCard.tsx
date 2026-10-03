import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Spacing, Shadow } from '../theme/spacing';
import Card from './Card';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  children,
  rightAction,
  style,
}) => {
  return (
    <Card style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {rightAction && <View>{rightAction}</View>}
      </View>
      <View style={styles.chartContainer}>{children}</View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.base,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.card,
    ...Shadow.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.base,
  },
  titleContainer: { flex: 1 },
  title: { ...Typography.subtitle, fontWeight: '600', color: Colors.textPrimary },
  subtitle: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  chartContainer: { marginTop: Spacing.sm },
});

export default ChartCard;
