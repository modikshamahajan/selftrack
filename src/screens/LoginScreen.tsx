import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather as Icon } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import * as LocalAuthentication from 'expo-local-authentication';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Shadow } from '../theme/spacing';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../store/useAuthStore';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen: React.FC<{ navigation: NavigationProp }> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const HEADER_LEAF = require('../../assets/Images/headerleaf.png');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      return Alert.alert('Validation Error', 'Please enter both email and password.');
    }

    setIsLoading(true);
    try {
      await useAuthStore.getState().login(email.trim(), password);
      navigation.replace('MainTabs');
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.detail || error.response?.data?.message || 'Failed to login. Please check your credentials.';
      Alert.alert('Login Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueAsGuest = async () => {
    setIsLoading(true);
    try {
      await useAuthStore.getState().continueAsGuest();
      navigation.replace('MainTabs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestResetCode = async () => {
    if (!forgotEmail.trim()) {
      return Alert.alert('Required', 'Please enter your registered email address.');
    }
    setIsForgotLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      Alert.alert(
        'Reset Code Sent',
        res.data.message + (res.data.dev_code ? `\n(Dev Code: ${res.data.dev_code})` : '')
      );
      if (res.data.dev_code) {
        setResetCode(res.data.dev_code);
      }
      setForgotStep(2);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to request password reset.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleConfirmResetPassword = async () => {
    if (!resetCode.trim() || !newPassword.trim()) {
      return Alert.alert('Required', 'Please enter both the reset code and your new password.');
    }
    if (newPassword.trim().length < 6) {
      return Alert.alert('Validation Error', 'Password must be at least 6 characters.');
    }
    setIsForgotLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: forgotEmail.trim(),
        reset_code: resetCode.trim(),
        new_password: newPassword.trim(),
      });
      Alert.alert('Success', 'Your password has been updated. Please sign in with your new password.');
      setShowForgotModal(false);
      setForgotStep(1);
      setEmail(forgotEmail.trim());
      setPassword(newPassword.trim());
    } catch (err: any) {
      Alert.alert('Reset Failed', err.response?.data?.detail || 'Invalid code or unable to reset.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    Alert.alert(
      'Google Sign-In',
      'Google Play Services authentication will connect using your Google account in production. Would you like to proceed with the Demo Account for now?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue with Demo',
          onPress: async () => {
            setIsLoading(true);
            try {
              await useAuthStore.getState().login('demo@selftrack.app', 'demo1234');
              navigation.replace('MainTabs');
            } catch (e: any) {
              Alert.alert('Sign In Error', e.message);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAppleLogin = () => {
    Alert.alert(
      'Apple Sign-In',
      'Apple authentication is available on iOS devices with an active Apple ID. Would you like to proceed with the Demo Account for now?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue with Demo',
          onPress: async () => {
            setIsLoading(true);
            try {
              await useAuthStore.getState().login('demo@selftrack.app', 'demo1234');
              navigation.replace('MainTabs');
            } catch (e: any) {
              Alert.alert('Sign In Error', e.message);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleBiometricLogin = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!compatible || !enrolled) {
        return Alert.alert(
          'Biometrics Not Configured',
          'No biometric sensor or registered fingerprint/face recognition found on this device.'
        );
      }

      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in to SelfTrack',
        fallbackLabel: 'Use Email & Password',
      });

      if (auth.success) {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const isAuth = await useAuthStore.getState().initializeAuth();
          if (isAuth) {
            navigation.replace('MainTabs');
            return;
          }
        }
        try {
          await useAuthStore.getState().login('demo@selftrack.app', 'demo1234');
          navigation.replace('MainTabs');
        } catch {
          Alert.alert('Sign In', 'Please enter your email and password once to link biometrics.');
        }
      }
    } catch (err: any) {
      Alert.alert('Authentication Failed', err.message || 'Unable to authenticate with biometrics.');
    }
  };

  return (
    <LinearGradient colors={['#E8F8F0', '#FFFFFF']} style={styles.container}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.flex}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            <View style={styles.header}>
              <Image source={HEADER_LEAF} style={styles.leafImage} />
              <Text style={styles.welcomeText}>Welcome Back!</Text>
              <Text style={styles.subtitleText}>Sign in to continue your journey</Text>
            </View>

            <View style={styles.card}>
              <InputField
                label="Email"
                placeholder="demo@selftrack.app"
                value={email}
                onChangeText={setEmail}
                icon="mail"
                keyboardType="email-address"
              />
              <InputField
                label="Password"
                placeholder="demo1234"
                value={password}
                onChangeText={setPassword}
                icon="lock"
                secureTextEntry
              />

              <TouchableOpacity style={styles.forgotPassword} onPress={() => { setForgotEmail(email); setForgotStep(1); setShowForgotModal(true); }}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              <Button
                title="Sign In"
                onPress={handleLogin}
                variant="gradient"
                style={styles.signInButton}
                loading={isLoading}
              />

              <TouchableOpacity style={styles.guestButton} onPress={handleContinueAsGuest} activeOpacity={0.8}>
                <Icon name="smartphone" size={18} color={Colors.primaryDark} style={{ marginRight: 8 }} />
                <Text style={styles.guestButtonText}>Continue Locally (Skip Login)</Text>
              </TouchableOpacity>

              <View style={styles.biometricSection}>
                <View style={styles.dividerRow}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>or sign in with</Text>
                  <View style={styles.divider} />
                </View>

                <View style={styles.socialButtons}>
                  <TouchableOpacity
                    style={[styles.socialBtn, styles.socialBtnFirst]}
                    onPress={handleGoogleLogin}
                    activeOpacity={0.8}
                  >
                    <Icon name="mail" size={20} color="#DB4437" style={styles.socialIcon} />
                    <Text style={styles.socialBtnText}>Google</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.socialBtn, styles.socialBtnSecond]}
                    onPress={handleAppleLogin}
                    activeOpacity={0.8}
                  >
                    <Icon name="smartphone" size={20} color="#000" style={styles.socialIcon} />
                    <Text style={styles.socialBtnText}>Apple</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometricLogin} activeOpacity={0.8}>
                  <View style={styles.biometricIcon}>
                    <Icon name="smartphone" size={24} color={Colors.primary} />
                  </View>
                  <Text style={styles.biometricText}>Sign in with Face ID / Fingerprint</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.biometricBtn, { marginTop: 12, borderColor: Colors.borderLight, backgroundColor: Colors.backgroundGray }]}
                  onPress={() => navigation.navigate('AdminDashboard')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.biometricIcon, { backgroundColor: Colors.borderLight }]}>
                    <Icon name="shield" size={20} color={Colors.textTertiary} />
                  </View>
                  <Text style={[styles.biometricText, { color: Colors.textTertiary }]}>Admin Portal</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.signupRow}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Forgot Password Modal */}
      <Modal visible={showForgotModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity onPress={() => setShowForgotModal(false)} style={styles.modalClose}>
                <Icon name="x" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {forgotStep === 1 ? (
              <View>
                <Text style={styles.modalDesc}>
                  Enter the email address associated with your account. We will send you a verification code to reset your password.
                </Text>
                <InputField
                  label="Registered Email"
                  placeholder="name@example.com"
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  icon="mail"
                  keyboardType="email-address"
                />
                <Button
                  title="Send Verification Code"
                  onPress={handleRequestResetCode}
                  variant="primary"
                  loading={isForgotLoading}
                  style={{ marginTop: 12 }}
                />
              </View>
            ) : (
              <View>
                <Text style={styles.modalDesc}>
                  Enter the 6-digit verification code and your new password.
                </Text>
                <InputField
                  label="Verification Code"
                  placeholder="123456"
                  value={resetCode}
                  onChangeText={setResetCode}
                  icon="key"
                  keyboardType="number-pad"
                />
                <InputField
                  label="New Password"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  icon="lock"
                  secureTextEntry
                />
                <Button
                  title="Update Password"
                  onPress={handleConfirmResetPassword}
                  variant="primary"
                  loading={isForgotLoading}
                  style={{ marginTop: 12 }}
                />
                <TouchableOpacity
                  onPress={() => setForgotStep(1)}
                  style={{ marginTop: 12, alignItems: 'center' }}
                >
                  <Text style={{ ...Typography.caption, color: Colors.textSecondary }}>Back to Email Entry</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'flex-start', paddingHorizontal: 24, paddingVertical: 20 },
  header: { alignItems: 'center', marginBottom: 32 },
  welcomeText: { ...Typography.heading2, color: Colors.textPrimary, marginBottom: 8 },
  subtitleText: { ...Typography.body, color: Colors.textSecondary },
  card: { backgroundColor: Colors.background, borderRadius: BorderRadius['2xl'], padding: 26, borderWidth: 1, borderColor: Colors.borderLight, ...Shadow.sm },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 20, marginTop: -8 },
  forgotText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
  biometricSection: { marginTop: 24 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  divider: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { ...Typography.caption, color: Colors.textTertiary, marginHorizontal: 12 },
  socialButtons: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  socialBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.backgroundGray, paddingVertical: 12, borderRadius: BorderRadius.lg, paddingHorizontal: 18 },
  socialIcon: { marginRight: 10 },
  socialBtnText: { ...Typography.body, color: Colors.textPrimary, fontWeight: '500' },
  socialBtnFirst: { marginRight: 10 },
  socialBtnSecond: { marginLeft: 10 },
  biometricBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 18, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, marginTop: 8, backgroundColor: Colors.background },
  biometricIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primarySoft, justifyContent: 'center', alignItems: 'center' },
  biometricText: { ...Typography.caption, color: Colors.primary, fontWeight: '500' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  signupText: { ...Typography.body, color: Colors.textSecondary },
  signupLink: { ...Typography.body, color: Colors.primary, fontWeight: '700' },
  signInButton: { marginTop: 16 },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 12,
    backgroundColor: Colors.primarySoft,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  guestButtonText: {
    ...Typography.body,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  leafImage: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    lineHeight: 18,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
});

export default LoginScreen;