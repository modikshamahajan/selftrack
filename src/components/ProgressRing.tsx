import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';

interface ProgressRingProps {
  progress?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  label?: string;
  centerContent?: React.ReactNode;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  progress = 0,
  size = 80,
  strokeWidth = 8,
  color = Colors.primary,
  backgroundColor = Colors.borderLight,
  showPercentage = true,
  label,
  centerContent,
}) => {
  const safeProgress = typeof progress === 'number' && !isNaN(progress) ? Math.max(0, Math.min(100, progress)) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safeProgress / 100) * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={[circumference]}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.centerContent}>
        {centerContent ? (
          centerContent
        ) : showPercentage ? (
          <View style={styles.textContainer}>
            <Text style={[styles.percentage, { fontSize: size * 0.22 }]}>
              {`${Math.round(safeProgress)}%`}
            </Text>
            {label ? <Text style={styles.label}>{label}</Text> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center' },
  svg: { position: 'absolute' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  textContainer: { alignItems: 'center' },
  percentage: { fontWeight: '700', color: Colors.textPrimary },
  label: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
});

export default ProgressRing;
