import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Shadow, Spacing } from '../theme/spacing';

type CardVariant = 'default' | 'glass' | 'gradient' | 'elevated';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  padding?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  onPress,
  padding = Spacing.base,
  borderRadius = BorderRadius.xl,
  style,
}) => {
  const getCardStyle = (): ViewStyle => {
    switch (variant) {
      case 'glass':
        return styles.glass;
      case 'elevated':
        return styles.elevated;
      default:
        return styles.default;
    }
  };

  if (variant === 'gradient') {
    const content = (
      <LinearGradient
        colors={Colors.gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientCard, { padding, borderRadius }, style]}>
        {children}
      </LinearGradient>
    );
    return onPress ? (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>{content}</TouchableOpacity>
    ) : content;
  }

  const cardContent = (
    <View style={[{ padding, borderRadius }, getCardStyle(), style]}>{children}</View>
  );

  return onPress ? (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>{cardContent}</TouchableOpacity>
  ) : cardContent;
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  color: string;
  onPress?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, label, value, unit, color, onPress }) => (
  <Card onPress={onPress} style={statStyles.card}>
    <View style={[statStyles.iconBg, { backgroundColor: color + '20' }]}>{icon}</View>
    <View style={statStyles.textContainer}>
      <View style={statStyles.valueRow}>
        <Text style={[statStyles.value, { color }]}>{value}</Text>
        {unit ? <Text style={statStyles.unit}>{unit}</Text> : null}
      </View>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  </Card>
);

const styles = StyleSheet.create({
  default: { backgroundColor: Colors.card, ...Shadow.md },
  glass: { backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', ...Shadow.glass },
  elevated: { backgroundColor: Colors.card, ...Shadow.lg },
  gradientCard: { ...Shadow.md },
});

const statStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  iconBg: { width: 44, height: 44, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  textContainer: { flex: 1 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline' },
  value: { ...Typography.heading3 },
  unit: { ...Typography.caption, color: Colors.textTertiary, marginLeft: 4 },
  label: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
});

export default Card;
