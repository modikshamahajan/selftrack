import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather as Icon } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing, BorderRadius } from '../theme/spacing';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  transparent?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, onBack, rightAction, transparent = false }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[
      styles.container,
      transparent && styles.transparent,
      { paddingTop: Math.max(insets.top + Spacing.sm, Spacing.base) }
    ]}>
      {onBack ? (
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Icon name="arrow-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : <View style={styles.placeholder} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm, // Default fallbacks used with override
    paddingBottom: Spacing.base,
    backgroundColor: Colors.background,
  },
  transparent: { backgroundColor: 'transparent' },
  backBtn: {
    width: 40, height: 40, borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundGray, justifyContent: 'center', alignItems: 'center',
  },
  title: { ...Typography.heading3, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  rightAction: { width: 40, alignItems: 'flex-end' },
  placeholder: { width: 40 },
});

export default Header;
