import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather as Icon } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Shadow } from '../theme/spacing';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: React.ComponentProps<typeof Icon>['name'];
  iconSize?: number;
  size?: number;
  color?: string;
  gradient?: boolean;
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
  style?: ViewStyle;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon = 'plus',
  iconSize = 24,
  size = 56,
  color = Colors.primary,
  gradient = false,
  position = 'bottom-right',
  style,
}) => {
  const positionStyle: ViewStyle =
    position === 'bottom-center'
      ? { bottom: 80, alignSelf: 'center' }
      : position === 'bottom-left'
      ? { bottom: 80, left: 20 }
      : { bottom: 80, right: 20 };

  if (gradient) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.container, positionStyle, style]}>
        <LinearGradient
          colors={Colors.gradients.primary}
          style={[styles.fab, { width: size, height: size, borderRadius: size / 2 }]}>
          <Icon name={icon} size={iconSize} color={Colors.textWhite} />
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.container, styles.fab, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }, positionStyle, style]}>
      <Icon name={icon} size={iconSize} color={Colors.textWhite} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute', zIndex: 100, ...Shadow.lg },
  fab: { justifyContent: 'center', alignItems: 'center', ...Shadow.lg },
});

export default FloatingActionButton;
