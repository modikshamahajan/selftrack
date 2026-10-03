import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Vibration,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Spacing, Shadow } from '../theme/spacing';

interface PinLockModalProps {
  visible: boolean;
  mode: 'setup' | 'verify';
  savedPin?: string;
  title?: string;
  onSuccess: (pin: string) => void;
  onCancel: () => void;
}

const PinLockModal: React.FC<PinLockModalProps> = ({
  visible,
  mode,
  savedPin,
  title,
  onSuccess,
  onCancel,
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [errorMsg, setErrorMsg] = useState('');

  const handleKeyPress = (num: string) => {
    setErrorMsg('');
    if (step === 'enter') {
      if (pin.length < 4) {
        const next = pin + num;
        setPin(next);
        if (next.length === 4) {
          if (mode === 'setup') {
            setTimeout(() => {
              setStep('confirm');
            }, 150);
          } else {
            // Verify mode
            if (savedPin && next === savedPin) {
              onSuccess(next);
              resetState();
            } else if (!savedPin) {
              // No saved PIN supplied, accept
              onSuccess(next);
              resetState();
            } else {
              Vibration.vibrate(200);
              setErrorMsg('Incorrect PIN. Please try again.');
              setTimeout(() => setPin(''), 500);
            }
          }
        }
      }
    } else {
      // Confirming PIN for setup
      if (confirmPin.length < 4) {
        const next = confirmPin + num;
        setConfirmPin(next);
        if (next.length === 4) {
          if (next === pin) {
            onSuccess(next);
            resetState();
          } else {
            Vibration.vibrate(200);
            setErrorMsg('PINs do not match. Try again.');
            setTimeout(() => {
              setConfirmPin('');
              setPin('');
              setStep('enter');
            }, 600);
          }
        }
      }
    }
  };

  const handleDelete = () => {
    setErrorMsg('');
    if (step === 'enter') {
      setPin((prev) => prev.slice(0, -1));
    } else {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
  };

  const resetState = () => {
    setPin('');
    setConfirmPin('');
    setStep('enter');
    setErrorMsg('');
  };

  const handleClose = () => {
    resetState();
    onCancel();
  };

  const activePin = step === 'enter' ? pin : confirmPin;
  const headingText =
    title ||
    (mode === 'setup'
      ? step === 'enter'
        ? 'Create 4-Digit PIN'
        : 'Confirm Your PIN'
      : 'Enter Your PIN');

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{headingText}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Icon name="x" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            {mode === 'setup'
              ? step === 'enter'
                ? 'Set a passcode to secure your personal data'
                : 'Re-enter your 4-digit PIN to confirm'
              : 'Enter passcode to authorize security changes'}
          </Text>

          {/* 4 Dots Indicator */}
          <View style={styles.dotsContainer}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  activePin.length > i && styles.dotFilled,
                  errorMsg ? styles.dotError : null,
                ]}
              />
            ))}
          </View>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          {/* Keypad */}
          <View style={styles.keypad}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['', '0', 'del'],
            ].map((row, rIdx) => (
              <View key={rIdx} style={styles.keyRow}>
                {row.map((item, cIdx) => {
                  if (item === '') {
                    return <View key={cIdx} style={styles.keyEmpty} />;
                  }
                  if (item === 'del') {
                    return (
                      <TouchableOpacity
                        key={cIdx}
                        style={styles.keyBtn}
                        onPress={handleDelete}
                        activeOpacity={0.7}
                      >
                        <Icon name="delete" size={20} color={Colors.textPrimary} />
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={cIdx}
                      style={styles.keyBtn}
                      onPress={() => handleKeyPress(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.keyText}>{item}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 36,
    alignItems: 'center',
    ...Shadow.md,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    ...Typography.heading2,
    color: Colors.textPrimary,
  },
  closeBtn: {
    padding: 6,
  },
  subtitle: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dotError: {
    borderColor: Colors.error,
    backgroundColor: Colors.error,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    fontWeight: '600',
    marginBottom: 12,
  },
  keypad: {
    width: '100%',
    maxWidth: 280,
    marginTop: 8,
    gap: 12,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keyBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.backgroundGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyEmpty: {
    width: 70,
    height: 70,
  },
  keyText: {
    ...Typography.heading2,
    fontSize: 22,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
});

export default PinLockModal;
