import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  KeyboardTypeOptions,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Spacing, Layout } from '../theme/spacing';

interface InputFieldProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  icon?: React.ComponentProps<typeof Icon>['name'];
  rightIcon?: React.ReactNode;
  error?: string;
  helperText?: string;
  multiline?: boolean;
  numberOfLines?: number;
  editable?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  icon,
  rightIcon,
  error,
  helperText,
  multiline = false,
  numberOfLines = 1,
  editable = true,
  style,
  inputStyle,
}) => {
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.focused,
          error ? styles.error : undefined,
          !editable ? styles.disabled : undefined,
        ]}>
        {icon && (
          <View style={styles.iconContainer}>
            <Icon name={icon} size={20} color={Colors.textTertiary} />
          </View>
        )}
        <TextInput
          style={[
            styles.input,
            icon ? styles.inputWithIcon : undefined,
            multiline ? styles.multiline : undefined,
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}>
            <Icon
              name={showPassword ? 'eye' : 'eye-off'}
              size={20}
              color={Colors.textTertiary}
            />
          </TouchableOpacity>
        )}
        {rightIcon ? <View style={styles.rightIconContainer}>{rightIcon}</View> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {helperText && !error ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.base },
  label: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: Layout.inputHeight,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.backgroundGray,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: Spacing.base,
  },
  focused: { borderColor: Colors.primary, backgroundColor: Colors.background },
  error: { borderColor: Colors.error },
  disabled: { opacity: 0.6 },
  iconContainer: { marginRight: Spacing.md },
  input: { flex: 1, ...Typography.body, color: Colors.textPrimary, height: '100%' },
  inputWithIcon: { paddingLeft: 0 },
  multiline: { height: 'auto', minHeight: 100, textAlignVertical: 'top', paddingTop: Spacing.md },
  eyeIcon: { padding: Spacing.xs },
  rightIconContainer: { marginLeft: Spacing.sm },
  errorText: { ...Typography.caption, color: Colors.error, marginTop: Spacing.xs },
  helperText: { ...Typography.caption, color: Colors.textTertiary, marginTop: Spacing.xs },
});

export default InputField;
