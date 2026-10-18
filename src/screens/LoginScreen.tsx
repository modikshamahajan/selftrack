import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather as Icon } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { Typography } from '../theme/typography';
import { BorderRadius, Shadow } from '../theme/spacing';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../store/useAuthStore';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen: React.FC<{ navigation: NavigationProp }> = ({ navigation }) => {
  // Step 1: 'phone' (Name & Mobile Number input), Step 2: 'otp' (6-digit OTP verification)
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  const otpInputsRef = useRef<(TextInput | null)[]>([]);
  const HEADER_LEAF = require('../../assets/Images/headerleaf.png');

  const isOtpComplete = otp.join('').length === 6;

  // Countdown timer for OTP resend - stops when OTP is completely entered or being verified
  useEffect(() => {
    let timer: any;
    if (step === 'otp' && countdown > 0 && !isOtpComplete && !isLoading) {
      timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [step, countdown, isOtpComplete, isLoading]);

  const cleanPhone = `${countryCode}${phoneNumber.trim().replace(/\D/g, '')}`;

  // Request OTP from backend
  const handleSendOtp = async () => {
    const trimmedName = fullName.trim();
    const digitsOnly = phoneNumber.trim().replace(/\D/g, '');

    if (!trimmedName || trimmedName.length < 2) {
      return Alert.alert('Name Required', 'Please enter your full name (at least 2 characters).');
    }

    if (!digitsOnly || digitsOnly.length < 10) {
      return Alert.alert('Invalid Mobile Number', 'Please enter a valid 10-digit mobile number.');
    }

    setIsLoading(true);
    try {
      const res = await useAuthStore.getState().sendOtp(cleanPhone, trimmedName);
      if (res.dev_otp) {
        setDevOtpHint(res.dev_otp);
      }
      setStep('otp');
      setCountdown(30);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpInputsRef.current[0]?.focus(), 300);
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.detail || 'Failed to send verification code. Please check your network connection.';
      Alert.alert('Request Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP and complete login
  const handleVerifyOtp = async (customOtp?: string) => {
    const fullOtp = customOtp || otp.join('');
    if (fullOtp.length !== 6) {
      return Alert.alert('Incomplete Code', 'Please enter the complete 6-digit verification code.');
    }

    setIsLoading(true);
    try {
      await useAuthStore.getState().loginWithOtp(cleanPhone, fullOtp, fullName.trim());
      navigation.replace('MainTabs');
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.detail || 'Invalid or expired OTP. Please try again.';
      Alert.alert('Verification Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle auto-progress across 6 OTP boxes
  const handleOtpChange = (text: string, index: number) => {
    const cleanChar = text.replace(/\D/g, '');
    const newOtp = [...otp];

    if (cleanChar.length > 1) {
      // User pasted full OTP
      const pasted = cleanChar.slice(0, 6).split('');
      pasted.forEach((char, i) => {
        if (i < 6) newOtp[i] = char;
      });
      setOtp(newOtp);
      if (pasted.length === 6) {
        handleVerifyOtp(pasted.join(''));
      }
      return;
    }

    newOtp[index] = cleanChar;
    setOtp(newOtp);

    if (cleanChar && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // Auto submit if 6th digit entered
    if (cleanChar && index === 5) {
      const full = newOtp.join('');
      if (full.length === 6) {
        handleVerifyOtp(full);
      }
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Botanical Illustration */}
          <View style={styles.headerImageContainer}>
            <Image
              source={HEADER_LEAF}
              style={styles.headerLeafImage}
              resizeMode="contain"
            />
          </View>

          {/* Branding & Titles */}
          <View style={styles.titleSection}>
            <View style={styles.brandBadge}>
              <Icon name="shield" size={14} color="#16A34A" />
              <Text style={styles.brandBadgeText}>SECURE OTP LOGIN</Text>
            </View>
            <Text style={styles.mainTitle}>
              {step === 'phone' ? 'Welcome to SelfTrack' : 'Enter Verification Code'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'phone'
                ? 'Empowering your habits, mindful journals, and daily health wellness.'
                : `We've sent a 6-digit one-time password to ${countryCode} ${phoneNumber.trim()}`}
            </Text>
          </View>

          {/* STEP 1: Full Name and Mobile Number */}
          {step === 'phone' ? (
            <View style={styles.formContainer}>
              {/* Full Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={styles.inputFieldBox}>
                  <Icon name="user" size={18} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your full name"
                    placeholderTextColor="#94A3B8"
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Mobile Number Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mobile Number</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.countryCodeBadge}>
                    <Text style={styles.flagEmoji}>🇮🇳</Text>
                    <Text style={styles.countryCodeText}>{countryCode}</Text>
                  </View>
                  <View style={[styles.inputFieldBox, styles.phoneNumberBox]}>
                    <Icon name="phone" size={18} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="10-digit mobile number"
                      placeholderTextColor="#94A3B8"
                      value={phoneNumber}
                      onChangeText={(t) => setPhoneNumber(t.replace(/\D/g, '').slice(0, 10))}
                      keyboardType="phone-pad"
                      maxLength={10}
                      returnKeyType="done"
                      onSubmitEditing={handleSendOtp}
                    />
                  </View>
                </View>
                <Text style={styles.phoneHelperText}>
                  We will send a 6-digit OTP code to verify and sign in.
                </Text>
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={[styles.primaryButton, (!fullName.trim() || phoneNumber.length < 10) && styles.buttonDisabled]}
                onPress={handleSendOtp}
                disabled={isLoading || !fullName.trim() || phoneNumber.length < 10}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Get Verification Code</Text>
                      <Icon name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            /* STEP 2: 6-Digit OTP Verification */
            <View style={styles.formContainer}>
              {/* Dev Helper Banner */}
              {devOtpHint && (
                <View style={styles.devOtpBanner}>
                  <Icon name="info" size={14} color="#047857" style={{ marginRight: 6 }} />
                  <Text style={styles.devOtpText}>
                    Development OTP: <Text style={{ fontWeight: '800' }}>{devOtpHint}</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      const split = devOtpHint.split('');
                      setOtp(split);
                      handleVerifyOtp(devOtpHint);
                    }}
                    style={styles.devFillBtn}
                  >
                    <Text style={styles.devFillBtnText}>Auto-Fill</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 6 Digit Input Boxes */}
              <View style={styles.otpBoxesRow}>
                {otp.map((digit, idx) => (
                  <TextInput
                    key={idx}
                    ref={(ref) => {
                      otpInputsRef.current[idx] = ref;
                    }}
                    style={[
                      styles.otpBox,
                      digit ? styles.otpBoxFilled : null,
                    ]}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, idx)}
                    onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                style={[styles.primaryButton, otp.join('').length < 6 && styles.buttonDisabled]}
                onPress={() => handleVerifyOtp()}
                disabled={isLoading || otp.join('').length < 6}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Verify & Sign In</Text>
                      <Icon name="check" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Resend and Edit options */}
              <View style={styles.otpOptionsRow}>
                <TouchableOpacity
                  onPress={() => {
                    setStep('phone');
                    setDevOtpHint(null);
                  }}
                  style={styles.editPhoneBtn}
                >
                  <Icon name="edit-2" size={14} color="#64748B" style={{ marginRight: 4 }} />
                  <Text style={styles.editPhoneText}>Change Mobile Number</Text>
                </TouchableOpacity>

                {!isOtpComplete ? (
                  <TouchableOpacity
                    onPress={handleSendOtp}
                    disabled={!canResend || isLoading}
                    style={styles.resendBtn}
                  >
                    <Text style={[styles.resendText, canResend && styles.resendTextActive]}>
                      {canResend ? 'Resend OTP' : `Resend in ${countdown}s`}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.resendBtn}>
                    <Text style={[styles.resendText, { color: '#10B981', fontWeight: '600' }]}>
                      {isLoading ? 'Verifying...' : 'Code entered'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Guest Exploration Option */}
          <View style={styles.guestContainer}>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
            <TouchableOpacity
              onPress={handleContinueAsGuest}
              style={styles.guestButton}
              activeOpacity={0.8}
            >
              <Icon name="compass" size={16} color="#475569" style={{ marginRight: 6 }} />
              <Text style={styles.guestButtonText}>Explore App as Guest</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 36,
  },
  headerImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  headerLeafImage: {
    width: 140,
    height: 110,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    marginBottom: 10,
    gap: 6,
  },
  brandBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.5,
  },
  mainTitle: {
    ...Typography.heading2,
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    ...Typography.body,
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 12,
    lineHeight: 20,
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputFieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 12,
    height: 52,
    gap: 4,
  },
  flagEmoji: {
    fontSize: 16,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  phoneNumberBox: {
    flex: 1,
  },
  phoneHelperText: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 6,
    marginLeft: 2,
  },
  primaryButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginTop: 10,
    ...Shadow.md,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    paddingHorizontal: 20,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  devOtpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.lg,
    marginBottom: 18,
  },
  devOtpText: {
    fontSize: 12,
    color: '#065F46',
    flex: 1,
  },
  devFillBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  devFillBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 54,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: BorderRadius.lg,
    backgroundColor: '#F8FAFC',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  otpBoxFilled: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  otpOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  editPhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editPhoneText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
  },
  resendBtn: {
    paddingVertical: 4,
  },
  resendText: {
    fontSize: 12.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  resendTextActive: {
    color: '#10B981',
    fontWeight: '700',
  },
  guestContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.xl,
    width: '100%',
  },
  guestButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#475569',
  },
});

export default LoginScreen;
