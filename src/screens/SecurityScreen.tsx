import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Feather as Icon } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Spacing, Shadow } from '../theme/spacing';
import { getScreenBgColor } from '../theme/screenBgColors';
import Header from '../components/Header';
import Toggle from '../components/Toggle';
import Card from '../components/Card';
import InputField from '../components/InputField';
import Button from '../components/Button';
import PinLockModal from '../components/PinLockModal';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';

const SecurityScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const bgColor = getScreenBgColor('Security');
  const { user, deleteAccount } = useAuthStore();
  const { settings, updateSetting } = useSettingsStore();

  const [hasBiometricHardware, setHasBiometricHardware] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // PIN Lock states
  const [savedPin, setSavedPin] = useState<string>('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'setup' | 'verify'>('setup');

  // Change Password states
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    checkBiometrics();
    loadPin();
  }, []);

  const loadPin = async () => {
    try {
      const pin = await AsyncStorage.getItem('userPin');
      if (pin) setSavedPin(pin);
    } catch {
      // Ignored
    }
  };

  const checkBiometrics = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setHasBiometricHardware(compatible);
      if (compatible) {
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setIsEnrolled(enrolled);
      }
    } catch {
      // Ignored
    }
  };

  const handleTogglePin = (enabled: boolean) => {
    if (enabled) {
      setPinModalMode('setup');
      setShowPinModal(true);
    } else {
      setPinModalMode('verify');
      setShowPinModal(true);
    }
  };

  const handlePinSuccess = async (enteredPin: string) => {
    setShowPinModal(false);
    if (pinModalMode === 'setup') {
      await AsyncStorage.setItem('userPin', enteredPin);
      setSavedPin(enteredPin);
      updateSetting('pin_lock', true);
      Alert.alert('PIN Configured', 'Your 4-digit passcode is active.');
    } else {
      await AsyncStorage.removeItem('userPin');
      setSavedPin('');
      updateSetting('pin_lock', false);
      Alert.alert('PIN Disabled', 'Passcode lock has been turned off.');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      return Alert.alert('Validation Error', 'Please fill in all password fields.');
    }
    if (newPassword.trim().length < 6) {
      return Alert.alert('Validation Error', 'New password must be at least 6 characters.');
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      return Alert.alert('Validation Error', 'New passwords do not match.');
    }

    setIsChangingPassword(true);
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword.trim(),
        new_password: newPassword.trim(),
      });
      Alert.alert('Password Updated', 'Your account password has been changed successfully.');
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      Alert.alert('Update Failed', err.response?.data?.detail || 'Failed to update password. Verify current password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleToggleBiometrics = async (enabled: boolean) => {
    if (enabled) {
      if (!hasBiometricHardware || !isEnrolled) {
        Alert.alert(
          'Biometrics Not Available',
          'Your device does not have biometric hardware or no fingerprints/face data are registered in device settings.'
        );
        return;
      }
      try {
        const auth = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Verify your identity to enable biometric unlock',
          fallbackLabel: 'Use PIN or Password',
        });
        if (auth.success) {
          updateSetting('biometrics_enabled', true);
        } else {
          updateSetting('biometrics_enabled', false);
        }
      } catch {
        updateSetting('biometrics_enabled', false);
      }
    } else {
      updateSetting('biometrics_enabled', false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account & Data',
      'Are you absolutely sure you want to delete your account? All your habits, health tracking records, journal entries, and progress will be permanently erased from our servers.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteAccount();
              Alert.alert('Account Deleted', 'Your account and data have been successfully deleted.');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete account. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await api.get('/users/me/export');
      const dataStr = JSON.stringify(res.data, null, 2);
      Alert.alert(
        'Data Export Ready',
        `Your personal data archive is ready (${(dataStr.length / 1024).toFixed(1)} KB).\n\nSummary:\n• ${res.data.habits?.length || 0} Habits\n• ${res.data.health_metrics?.length || 0} Health metrics\n• ${res.data.journal_entries?.length || 0} Journal entries\n• ${res.data.badges?.length || 0} Badges\n\nAll your personal data has been compiled in JSON format.`,
        [{ text: 'Close' }]
      );
    } catch (err: any) {
      Alert.alert('Export Failed', err.response?.data?.detail || 'Unable to generate data export at this time.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Header title="Security & Privacy" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Security Status Header */}
        <View style={styles.iconSection}>
          <View style={styles.shieldIcon}>
            <Icon name="shield" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.securityStatus}>
            {settings.biometrics_enabled ? 'Biometric Protection Active' : 'Basic Security'}
          </Text>
          <Text style={styles.securityDesc}>
            {settings.biometrics_enabled
              ? 'Your data is secured with device biometric verification'
              : 'Enable fingerprint or Face ID for fast and secure access'}
          </Text>
        </View>

        {/* Authentication Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authentication</Text>
          <Card style={styles.optionsCard}>
            <View style={[styles.optionRow, styles.optionBorder]}>
              <View style={[styles.optionIcon, { backgroundColor: Colors.primarySoft }]}>
                <Icon name="smartphone" size={18} color={Colors.primary} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Biometric Unlock</Text>
                <Text style={styles.optionDesc}>
                  {hasBiometricHardware
                    ? 'Fingerprint & Face recognition'
                    : 'Not supported on this device'}
                </Text>
              </View>
              <Toggle
                value={settings.biometrics_enabled}
                onValueChange={handleToggleBiometrics}
                size="sm"
              />
            </View>

            <View style={[styles.optionRow, styles.optionBorder]}>
              <View style={[styles.optionIcon, { backgroundColor: Colors.primarySoft }]}>
                <Icon name="hash" size={18} color={Colors.primary} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>PIN Lock</Text>
                <Text style={styles.optionDesc}>
                  {savedPin ? '4-digit passcode active' : 'Require 4-digit PIN on app launch'}
                </Text>
              </View>
              <Toggle
                value={settings.pin_lock}
                onValueChange={handleTogglePin}
                size="sm"
              />
            </View>

            <View style={[styles.optionRow, styles.optionBorder]}>
              <View style={[styles.optionIcon, { backgroundColor: Colors.primarySoft }]}>
                <Icon name="clock" size={18} color={Colors.primary} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Auto-Lock</Text>
                <Text style={styles.optionDesc}>Lock immediately when app goes to background</Text>
              </View>
              <Toggle
                value={settings.auto_lock}
                onValueChange={(v) => updateSetting('auto_lock', v)}
                size="sm"
              />
            </View>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setShowChangePassword(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: Colors.primarySoft }]}>
                <Icon name="key" size={18} color={Colors.primary} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Change Password</Text>
                <Text style={styles.optionDesc}>Update your account login password</Text>
              </View>
              <Icon name="chevron-right" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Privacy Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Privacy Controls</Text>
          <Card style={styles.optionsCard}>
            <View style={[styles.optionRow, styles.optionBorder]}>
              <View style={[styles.optionIcon, { backgroundColor: '#F0EEFF' }]}>
                <Icon name="eye-off" size={18} color={Colors.secondary} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Private Journal</Text>
                <Text style={styles.optionDesc}>Require authentication before viewing journals</Text>
              </View>
              <Toggle
                value={settings.privacy_private_journal}
                onValueChange={(v) => updateSetting('privacy_private_journal', v)}
                size="sm"
              />
            </View>

            <View style={styles.optionRow}>
              <View style={[styles.optionIcon, { backgroundColor: '#F0EEFF' }]}>
                <Icon name="cloud" size={18} color={Colors.secondary} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Cloud Sync</Text>
                <Text style={styles.optionDesc}>Sync encrypted habits and metrics with server</Text>
              </View>
              <Toggle
                value={settings.auto_sync}
                onValueChange={(v) => updateSetting('auto_sync', v)}
                size="sm"
              />
            </View>
          </Card>
        </View>

        {/* Data Portability (Google Play & GDPR) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Portability (GDPR & Google Play)</Text>
          <Card style={styles.optionsCard}>
            <View style={styles.deleteBox}>
              <Text style={[styles.deleteTitle, { color: Colors.primaryDark }]}>Export Personal Archive</Text>
              <Text style={styles.deleteDesc}>
                Download a machine-readable JSON archive containing your full profile, habit tracking history, daily health logs, journal entries, and reward badges.
              </Text>
              <TouchableOpacity
                style={[styles.deleteBtn, { backgroundColor: Colors.primary }]}
                onPress={handleExportData}
                disabled={isExporting}
                activeOpacity={0.8}
              >
                {isExporting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Icon name="download" size={18} color="#FFFFFF" />
                    <Text style={styles.deleteBtnText}>Export My Data (JSON)</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* Google Play Data Safety & Account Deletion */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>Danger Zone (Google Play Compliance)</Text>
          <Card style={[styles.optionsCard, { borderColor: '#FCA5A5', borderWidth: 1 }]}>
            <View style={styles.deleteBox}>
              <Text style={styles.deleteTitle}>Delete Account and All Associated Data</Text>
              <Text style={styles.deleteDesc}>
                In compliance with Google Play Store data safety guidelines, you have the right to request full erasure of your account, email ({user?.email || 'N/A'}), habit histories, AI conversations, and health logs.
              </Text>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDeleteAccount}
                disabled={isDeleting}
                activeOpacity={0.8}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Icon name="trash-2" size={18} color="#FFFFFF" />
                    <Text style={styles.deleteBtnText}>Delete Account & Data</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showChangePassword} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowChangePassword(false)} style={styles.modalClose}>
                <Icon name="x" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Enter your current password followed by your new password.
            </Text>

            <InputField
              label="Current Password"
              placeholder="••••••••"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              icon="lock"
              secureTextEntry
            />
            <InputField
              label="New Password"
              placeholder="Min 6 characters"
              value={newPassword}
              onChangeText={setNewPassword}
              icon="key"
              secureTextEntry
            />
            <InputField
              label="Confirm New Password"
              placeholder="Min 6 characters"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              icon="check"
              secureTextEntry
            />

            <Button
              title="Update Password"
              onPress={handleChangePassword}
              variant="primary"
              loading={isChangingPassword}
              style={{ marginTop: 12 }}
            />
          </View>
        </View>
      </Modal>

      {/* PIN Lock Setup / Verification Modal */}
      <PinLockModal
        visible={showPinModal}
        mode={pinModalMode}
        savedPin={savedPin}
        onSuccess={handlePinSuccess}
        onCancel={() => setShowPinModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  iconSection: { alignItems: 'center', paddingVertical: 24 },
  shieldIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  securityStatus: { ...Typography.heading3, color: Colors.textPrimary },
  securityDesc: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  section: { marginBottom: 24 },
  sectionTitle: { ...Typography.subtitle, fontWeight: '600', color: Colors.textPrimary, marginBottom: 12 },
  optionsCard: { borderRadius: BorderRadius.xl, backgroundColor: Colors.card, ...Shadow.sm, padding: 4 },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  optionBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  optionIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  optionInfo: { flex: 1 },
  optionLabel: { ...Typography.body, fontWeight: '500', color: Colors.textPrimary },
  optionDesc: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },
  deleteBox: { padding: 14 },
  deleteTitle: { ...Typography.body, fontWeight: '700', color: '#B91C1C', marginBottom: 6 },
  deleteDesc: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18, marginBottom: 14 },
  deleteBtn: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
  },
  deleteBtnText: { ...Typography.body, color: '#FFFFFF', fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    padding: 24,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    ...Typography.heading2,
    color: Colors.textPrimary,
  },
  modalClose: {
    padding: 4,
  },
  modalDesc: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
});

export default SecurityScreen;
