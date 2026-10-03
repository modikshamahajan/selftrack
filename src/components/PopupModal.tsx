import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Spacing, Shadow } from '../theme/spacing';
import Button from './Button';

interface ModalAction {
  title: string;
  onPress: () => void;
}

interface PopupModalProps {
  visible?: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  icon?: React.ComponentProps<typeof Icon>['name'];
  iconColor?: string;
  primaryAction?: ModalAction;
  secondaryAction?: ModalAction;
  children?: React.ReactNode;
}

const PopupModal: React.FC<PopupModalProps> = ({
  visible = false,
  onClose,
  title,
  message,
  icon,
  iconColor = Colors.primary,
  primaryAction,
  secondaryAction,
  children,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 32 : 0}
            style={styles.keyboardAvoidingView}
          >
          <TouchableWithoutFeedback>
            <View style={styles.modal}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Icon name="x" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
              {icon && (
                <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
                  <Icon name={icon} size={32} color={iconColor} />
                </View>
              )}
              {title && <Text style={styles.title}>{title}</Text>}
              {message && <Text style={styles.message}>{message}</Text>}
              {children}
              <View style={styles.actions}>
                {primaryAction && (
                  <Button title={primaryAction.title} onPress={primaryAction.onPress} variant="primary" style={styles.actionBtnPrimary} />
                )}
                {secondaryAction && (
                  <Button title={secondaryAction.title} onPress={secondaryAction.onPress} variant="secondary" style={styles.actionBtnSecondary} />
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  keyboardAvoidingView: { flex: 1, width: '100%' },
  modal: { width: '100%', maxHeight: '85%', backgroundColor: Colors.background, borderRadius: BorderRadius['2xl'], padding: Spacing['2xl'], alignItems: 'center', ...Shadow.xl },
  closeButton: { position: 'absolute', top: Spacing.base, right: Spacing.base, padding: Spacing.xs },
  iconContainer: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.base },
  title: { ...Typography.heading3, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
  message: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl },
  actions: { width: '100%', marginTop: Spacing.base, flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  actionBtnPrimary: { width: '48%' },
  actionBtnSecondary: { width: '48%' },
});

export default PopupModal;
