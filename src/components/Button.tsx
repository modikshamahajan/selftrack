import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Shadow, Layout } from '../theme/spacing';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  textStyle,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const base: ViewStyle = {
      ...styles.base,
      ...(fullWidth ? styles.fullWidth : {}),
      ...(size === 'sm' ? styles.sm : {}),
      ...(size === 'lg' ? styles.lg : {}),
    };

    switch (variant) {
      case 'primary':
        return { ...base, ...styles.primary };
      case 'secondary':
        return { ...base, ...styles.secondary };
      case 'outline':
        return { ...base, ...styles.outline };
      case 'ghost':
        return { ...base, ...styles.ghost };
      default:
        return base;
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case 'primary':
      case 'gradient':
        return styles.textWhite;
      case 'secondary':
        return styles.textPrimary;
      case 'outline':
        return styles.textOutline;
      case 'ghost':
        return styles.textGhost;
      default:
        return styles.textWhite;
    }
  };

  const renderContent = () => (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' ? Colors.primary : Colors.textWhite}
          size="small"
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text style={[styles.text, getTextStyle(), textStyle]}>{title}</Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </>
      )}
    </View>
  );

  if (variant === 'gradient') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[fullWidth && styles.fullWidth, style]}>
        <LinearGradient
          colors={Colors.gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.base, styles.gradient, disabled && styles.disabled]}>
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[getButtonStyle(), disabled && styles.disabled, style]}>
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    height: Layout.buttonHeight,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  fullWidth: { width: '100%' },
  sm: { height: 40, paddingHorizontal: 16 },
  lg: { height: 56, paddingHorizontal: 32 },
  primary: { backgroundColor: Colors.primary, ...Shadow.md },
  secondary: { backgroundColor: Colors.primarySoft },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
  ghost: { backgroundColor: 'transparent' },
  gradient: { ...Shadow.md },
  disabled: { opacity: 0.5 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  text: { ...Typography.button },
  textWhite: { color: Colors.textWhite },
  textPrimary: { color: Colors.primary },
  textOutline: { color: Colors.primary },
  textGhost: { color: Colors.primary },
  iconLeft: { marginRight: 8 },
  iconRight: { marginLeft: 8 },
});

export default Button;
