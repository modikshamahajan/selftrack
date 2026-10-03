import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

interface ToggleProps {
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  activeColor?: string;
  inactiveColor?: string;
  size?: 'sm' | 'md';
}

const Toggle: React.FC<ToggleProps> = ({
  value = false,
  onValueChange,
  disabled = false,
  activeColor = Colors.primary,
  inactiveColor = Colors.border,
  size = 'md',
}) => {
  const translateX = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: value ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start();
  }, [value]);

  const trackWidth = size === 'sm' ? 40 : 50;
  const trackHeight = size === 'sm' ? 22 : 28;
  const thumbSize = size === 'sm' ? 18 : 24;
  const travel = trackWidth - thumbSize - 4;

  const thumbTranslate = translateX.interpolate({
    inputRange: [0, 1],
    outputRange: [2, travel],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => !disabled && onValueChange?.(!value)}
      disabled={disabled}
      style={disabled ? styles.disabled : undefined}>
      <View
        style={[styles.track, { width: trackWidth, height: trackHeight, borderRadius: trackHeight / 2, backgroundColor: value ? activeColor : inactiveColor }]}>
        <Animated.View
          style={[styles.thumb, { width: thumbSize, height: thumbSize, borderRadius: thumbSize / 2, transform: [{ translateX: thumbTranslate }] }]}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  disabled: { opacity: 0.5 },
  track: { justifyContent: 'center' },
  thumb: { backgroundColor: Colors.textWhite, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
});

export default Toggle;
