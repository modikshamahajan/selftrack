import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
  ActivityIndicator,
  Image,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Typography } from '../theme/typography';
import { BorderRadius, Shadow } from '../theme/spacing';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../store/useAuthStore';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;
type LoginRouteProp = RouteProp<RootStackParamList, 'Login'>;

const HEADER_LEAF = require('../../assets/Images/headerleaf.png');

interface LoginScreenProps {
  navigation: NavigationProp;
  route?: LoginRouteProp;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation, route }) => {
  const initialMode = route?.params?.initialMode || 'register';
  const [authMode, setAuthMode] = useState<'signin' | 'register'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const countryCode = '+91';
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [activeErrorField, setActiveErrorField] = useState<'name' | 'phone' | 'pin' | 'confirmPin' | null>(null);
  const [fieldErrorMessages, setFieldErrorMessages] = useState<{ [key: string]: string }>({});

  const scrollViewRef = useRef<any>(null);
  const phoneInputRef = useRef<any>(null);
  const pinInputRef = useRef<any>(null);
  const confirmPinInputRef = useRef<any>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height || 280);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const cleanPhone = `${countryCode}${phoneNumber.trim().replace(/\D/g, '')}`;
  const digitsOnly = phoneNumber.trim().replace(/\D/g, '');

  const clearFormFields = () => {
    setFullName('');
    setPhoneNumber('');
    setPin('');
    setConfirmPin('');
    setAuthErrorMessage(null);
    setActiveErrorField(null);
    setFieldErrorMessages({});
  };

  const handleTabChange = (mode: 'signin' | 'register') => {
    if (isLoading) return;
    if (mode !== authMode) {
      try {
        Haptics.selectionAsync().catch(() => {});
      } catch {}
      setAuthMode(mode);
      clearFormFields();
    }
  };

  const validateForm = (): boolean => {
    const trimmedName = fullName.trim();
    const cleanPin = pin.trim();
    const cleanConfirmPin = confirmPin.trim();
    const digits = phoneNumber.trim().replace(/\D/g, '');

    // Reset previous errors
    setActiveErrorField(null);
    setFieldErrorMessages({});
    setAuthErrorMessage(null);

    // 1. Full Name (only in register mode)
    if (authMode === 'register') {
      if (!trimmedName) {
        setActiveErrorField('name');
        const msg = 'Please enter your full name.';
        setFieldErrorMessages({ name: msg });
        setAuthErrorMessage(msg);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        } catch {}
        Alert.alert('Full Name Required', msg);
        return false;
      }
      if (trimmedName.length < 2) {
        setActiveErrorField('name');
        const msg = 'Full name must be at least 2 characters.';
        setFieldErrorMessages({ name: msg });
        setAuthErrorMessage(msg);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        } catch {}
        Alert.alert('Invalid Name', msg);
        return false;
      }
    }

    // 2. Mobile Number (both modes)
    if (!digits) {
      setActiveErrorField('phone');
      const msg = 'Please enter your 10-digit mobile number.';
      setFieldErrorMessages({ phone: msg });
      setAuthErrorMessage(msg);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      } catch {}
      Alert.alert('Mobile Number Required', msg);
      return false;
    }
    if (digits.length !== 10) {
      setActiveErrorField('phone');
      const msg = `Mobile number must be exactly 10 digits (currently ${digits.length} digits).`;
      setFieldErrorMessages({ phone: msg });
      setAuthErrorMessage(msg);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      } catch {}
      Alert.alert('Invalid Mobile Number', msg);
      return false;
    }
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setActiveErrorField('phone');
      const msg = 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.';
      setFieldErrorMessages({ phone: msg });
      setAuthErrorMessage(msg);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      } catch {}
      Alert.alert('Invalid Mobile Number', msg);
      return false;
    }

    // 3. Security PIN (both modes)
    if (!cleanPin) {
      setActiveErrorField('pin');
      const msg = 'Please enter your 4-digit security PIN.';
      setFieldErrorMessages({ pin: msg });
      setAuthErrorMessage(msg);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      } catch {}
      Alert.alert('Security PIN Required', msg);
      return false;
    }
    if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      setActiveErrorField('pin');
      const msg = `PIN must be exactly 4 numeric digits (currently ${cleanPin.length} digits).`;
      setFieldErrorMessages({ pin: msg });
      setAuthErrorMessage(msg);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      } catch {}
      Alert.alert('Invalid Security PIN', msg);
      return false;
    }

    // 4. Confirm PIN (only in register mode)
    if (authMode === 'register') {
      if (!cleanConfirmPin) {
        setActiveErrorField('confirmPin');
        const msg = 'Please confirm your 4-digit security PIN.';
        setFieldErrorMessages({ confirmPin: msg });
        setAuthErrorMessage(msg);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        } catch {}
        Alert.alert('Confirm PIN Required', msg);
        return false;
      }
      if (cleanConfirmPin.length !== 4 || !/^\d{4}$/.test(cleanConfirmPin)) {
        setActiveErrorField('confirmPin');
        const msg = `Confirmation PIN must be exactly 4 numeric digits (currently ${cleanConfirmPin.length} digits).`;
        setFieldErrorMessages({ confirmPin: msg });
        setAuthErrorMessage(msg);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        } catch {}
        Alert.alert('Invalid Confirmation PIN', msg);
        return false;
      }
      if (cleanPin !== cleanConfirmPin) {
        setActiveErrorField('confirmPin');
        const msg = 'PINs do not match. Please ensure both 4-digit PINs are identical.';
        setFieldErrorMessages({ confirmPin: msg });
        setAuthErrorMessage(msg);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        } catch {}
        Alert.alert('PINs Do Not Match', msg);
        return false;
      }
    }

    return true;
  };

  const handlePhonePinAuth = async () => {
    // 1. Cross-check and validate all field data
    const isValid = validateForm();
    if (!isValid) return;

    // 2. Lock & disable all fields immediately by setting isLoading = true
    setIsLoading(true);
    setActiveErrorField(null);
    setFieldErrorMessages({});
    setAuthErrorMessage(null);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}

    const trimmedName = fullName.trim();
    const cleanPin = pin.trim();

    try {
      await useAuthStore.getState().loginWithPhonePin(
        trimmedName,
        cleanPhone,
        cleanPin,
        authMode === 'register'
      );
      if (authMode === 'register') {
        useAuthStore.getState().setHasPendingWelcomeBonus(true);
      }
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {}
      setIsLoading(false);
      navigation.replace('MainTabs', { showWelcomeBonus: authMode === 'register' });
    } catch (error: any) {
      console.error(error);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      } catch {}

      const statusCode = error.response?.status;
      const detailMessage = error.response?.data?.detail;

      if (authMode === 'signin') {
        if (statusCode === 404) {
          const msg =
            detailMessage ||
            'No registered account found with this mobile number. Either check your number or tap "Register" to create a new account.';
          setAuthErrorMessage(msg);
          setActiveErrorField('phone');
          Alert.alert('Account Not Found', msg, [
            { text: 'Check Number', style: 'cancel' },
            {
              text: 'Register Now',
              style: 'default',
              onPress: () => {
                setAuthMode('register');
                clearFormFields();
              },
            },
          ]);
          return;
        }

        if (statusCode === 401) {
          const msg =
            detailMessage ||
            'The PIN you entered does not match this mobile number. Either the mobile number or PIN is not correct, or please register as a new user.';
          setAuthErrorMessage(msg);
          setActiveErrorField('pin');
          Alert.alert('Incorrect PIN', msg, [
            { text: 'Try Again', style: 'cancel' },
            {
              text: 'Register New Account',
              style: 'default',
              onPress: () => {
                setAuthMode('register');
                clearFormFields();
              },
            },
          ]);
          return;
        }
      } else if (authMode === 'register') {
        if (statusCode === 400 && detailMessage?.includes('already registered')) {
          setAuthErrorMessage(detailMessage);
          setActiveErrorField('phone');
          Alert.alert('Already Registered', detailMessage, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign In Now',
              style: 'default',
              onPress: () => {
                setAuthMode('signin');
                clearFormFields();
              },
            },
          ]);
          return;
        }
      }

      const message =
        detailMessage ||
        'Authentication failed. Please check your credentials and network connection.';
      setAuthErrorMessage(message);
      Alert.alert(authMode === 'register' ? 'Registration Failed' : 'Sign In Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueAsGuest = async () => {
    if (isLoading) return;
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
      {/* Soft Ambient Backdrop */}
      <LinearGradient
        colors={['#ECFDF5', '#F8FAFC', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        enabled={Platform.OS === 'ios'}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          {/* Header Botanical Illustration */}
          <View style={[styles.headerImageContainer, keyboardHeight > 0 && { marginTop: 0, marginBottom: 0 }]}>
            <Image
              source={HEADER_LEAF}
              style={[
                styles.headerLeafImage,
                keyboardHeight > 0 && { width: 80, height: 50 },
              ]}
              resizeMode="contain"
            />
          </View>

          {/* Header Brand Section */}
          <View style={[styles.headerSection, keyboardHeight > 0 && { marginBottom: 8 }]}>
            <Text style={[styles.appName, keyboardHeight > 0 && { fontSize: 22 }]}>SelfTrack</Text>
            {keyboardHeight === 0 && (
              <Text style={styles.appTagline}>Mindful Habits • Growth • Wellness</Text>
            )}
          </View>

          {/* Card Container */}
          <View style={styles.mainCard}>
            {/* Segmented Mode Switcher */}
            <View style={styles.segmentedContainer}>
              <TouchableOpacity
                style={[
                  styles.segmentTab,
                  authMode === 'signin' && styles.segmentTabActive,
                  isLoading && styles.tabDisabled,
                ]}
                onPress={() => handleTabChange('signin')}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Icon
                  name="log-in"
                  size={15}
                  color={authMode === 'signin' ? '#065F46' : '#64748B'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.segmentText,
                    authMode === 'signin' && styles.segmentTextActive,
                  ]}
                >
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentTab,
                  authMode === 'register' && styles.segmentTabActive,
                  isLoading && styles.tabDisabled,
                ]}
                onPress={() => handleTabChange('register')}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Icon
                  name="user-plus"
                  size={15}
                  color={authMode === 'register' ? '#065F46' : '#64748B'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.segmentText,
                    authMode === 'register' && styles.segmentTextActive,
                  ]}
                >
                  New User
                </Text>
              </TouchableOpacity>
            </View>

            {/* Mode Sub-Header */}
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
              </Text>
              <Text style={styles.cardSubtitle}>
                {authMode === 'signin'
                  ? 'Enter your mobile number and 4-digit PIN to sign in'
                  : 'Enter your name, mobile, and create a 4-digit security PIN'}
              </Text>
            </View>

            {/* Inline Error Notice */}
            {authErrorMessage ? (
              <View style={styles.errorBanner}>
                <Icon
                  name="alert-triangle"
                  size={17}
                  color="#DC2626"
                  style={{ marginTop: 2, marginRight: 8 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorBannerText}>{authErrorMessage}</Text>
                  {authMode === 'signin' && (
                    <TouchableOpacity
                      onPress={() => {
                        setAuthMode('register');
                        clearFormFields();
                      }}
                      disabled={isLoading}
                      style={styles.errorBannerAction}
                    >
                      <Text style={styles.errorBannerActionText}>
                        Tap here to Register as New User →
                      </Text>
                    </TouchableOpacity>
                  )}
                  {authMode === 'register' &&
                    authErrorMessage.includes('already registered') && (
                      <TouchableOpacity
                        onPress={() => {
                          setAuthMode('signin');
                          clearFormFields();
                        }}
                        disabled={isLoading}
                        style={styles.errorBannerAction}
                      >
                        <Text style={styles.errorBannerActionText}>
                          Tap here to Sign In with PIN →
                        </Text>
                      </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity
                  onPress={() => setAuthErrorMessage(null)}
                  disabled={isLoading}
                  style={{ padding: 4 }}
                >
                  <Icon name="x" size={15} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Form Fields */}
            <View style={styles.formFields}>
              {/* 1. Full Name (Register Mode Only) */}
              {authMode === 'register' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      isLoading && styles.inputContainerDisabled,
                      activeErrorField === 'name' && styles.inputErrorBorder,
                    ]}
                  >
                    <Icon name="user" size={18} color="#059669" style={styles.fieldIcon} />
                    <TextInput
                      style={[styles.textInput, isLoading && styles.inputDisabled]}
                      placeholder="e.g. Tushar Sharma"
                      placeholderTextColor="#94A3B8"
                      value={fullName}
                      editable={!isLoading}
                      onChangeText={(text) => {
                        setFullName(text);
                        if (activeErrorField === 'name') setActiveErrorField(null);
                        if (authErrorMessage) setAuthErrorMessage(null);
                      }}
                      autoCapitalize="words"
                      returnKeyType="next"
                      onSubmitEditing={() => phoneInputRef.current?.focus()}
                    />
                  </View>
                  {activeErrorField === 'name' && !!fieldErrorMessages.name && (
                    <Text style={styles.fieldErrorText}>{fieldErrorMessages.name}</Text>
                  )}
                </View>
              )}

              {/* 2. Mobile Number (Both Modes) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mobile Number</Text>
                <View
                  style={[
                    styles.inputContainer,
                    isLoading && styles.inputContainerDisabled,
                    activeErrorField === 'phone' && styles.inputErrorBorder,
                  ]}
                >
                  <View style={styles.countryCodeBadge}>
                    <Text style={styles.flagEmoji}>🇮🇳</Text>
                    <Text style={styles.countryCodeText}>{countryCode}</Text>
                    <View style={styles.codeDivider} />
                  </View>
                  <TextInput
                    ref={phoneInputRef}
                    style={[styles.textInput, isLoading && styles.inputDisabled]}
                    placeholder="98765 43210"
                    placeholderTextColor="#94A3B8"
                    value={phoneNumber}
                    editable={!isLoading}
                    onChangeText={(t) => {
                      setPhoneNumber(t.replace(/\D/g, '').slice(0, 10));
                      if (activeErrorField === 'phone') setActiveErrorField(null);
                      if (authErrorMessage) setAuthErrorMessage(null);
                    }}
                    keyboardType="phone-pad"
                    maxLength={10}
                    returnKeyType="next"
                    onSubmitEditing={() => pinInputRef.current?.focus()}
                  />
                  {digitsOnly.length === 10 && (
                    <Icon name="check-circle" size={17} color="#10B981" style={{ marginRight: 6 }} />
                  )}
                </View>
                {activeErrorField === 'phone' && !!fieldErrorMessages.phone && (
                  <Text style={styles.fieldErrorText}>{fieldErrorMessages.phone}</Text>
                )}
              </View>

              {/* 3. Security PIN Field */}
              <View style={styles.inputGroup}>
                <View style={styles.labelWithHint}>
                  <Text style={styles.inputLabel}>
                    {authMode === 'register' ? 'Create 4-Digit PIN' : 'Security PIN'}
                  </Text>
                  <Text style={styles.pinHint}>4 digits</Text>
                </View>
                <View
                  style={[
                    styles.inputContainer,
                    isLoading && styles.inputContainerDisabled,
                    activeErrorField === 'pin' && styles.inputErrorBorder,
                  ]}
                >
                  <Icon name="lock" size={18} color="#059669" style={styles.fieldIcon} />
                  <TextInput
                    ref={pinInputRef}
                    style={[styles.textInput, styles.pinInput, isLoading && styles.inputDisabled]}
                    placeholder="••••"
                    placeholderTextColor="#CBD5E1"
                    value={pin.slice(0, 4)}
                    editable={!isLoading}
                    onChangeText={(t) => {
                      const sanitized = t.replace(/\D/g, '').slice(0, 4);
                      setPin(sanitized);
                      if (activeErrorField === 'pin') setActiveErrorField(null);
                      if (authErrorMessage) setAuthErrorMessage(null);
                    }}
                    keyboardType="number-pad"
                    secureTextEntry={!showPin}
                    maxLength={4}
                    returnKeyType={authMode === 'register' ? 'next' : 'done'}
                    onSubmitEditing={() => {
                      if (authMode === 'register') {
                        confirmPinInputRef.current?.focus();
                      } else {
                        handlePhonePinAuth();
                      }
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPin(!showPin)}
                    disabled={isLoading}
                    style={styles.eyeIconBtn}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Icon name={showPin ? 'eye' : 'eye-off'} size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>
                {activeErrorField === 'pin' && !!fieldErrorMessages.pin && (
                  <Text style={styles.fieldErrorText}>{fieldErrorMessages.pin}</Text>
                )}
              </View>

              {/* 4. Confirm PIN (Register Mode Only) */}
              {authMode === 'register' && (
                <View style={styles.inputGroup}>
                  <View style={styles.labelWithHint}>
                    <Text style={styles.inputLabel}>Confirm Security PIN</Text>
                    {confirmPin.length === 4 && (
                      <Text
                        style={[
                          styles.matchBadge,
                          pin === confirmPin ? styles.matchSuccess : styles.matchError,
                        ]}
                      >
                        {pin === confirmPin ? '✓ Matched' : '✕ No match'}
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.inputContainer,
                      isLoading && styles.inputContainerDisabled,
                      activeErrorField === 'confirmPin' && styles.inputErrorBorder,
                      confirmPin.length === 4 && pin === confirmPin && styles.inputSuccessBorder,
                    ]}
                  >
                    <Icon name="shield" size={18} color="#059669" style={styles.fieldIcon} />
                    <TextInput
                      ref={confirmPinInputRef}
                      style={[styles.textInput, styles.pinInput, isLoading && styles.inputDisabled]}
                      placeholder="••••"
                      placeholderTextColor="#CBD5E1"
                      value={confirmPin.slice(0, 4)}
                      editable={!isLoading}
                      onChangeText={(t) => {
                        const sanitized = t.replace(/\D/g, '').slice(0, 4);
                        setConfirmPin(sanitized);
                        if (activeErrorField === 'confirmPin') setActiveErrorField(null);
                        if (authErrorMessage) setAuthErrorMessage(null);
                      }}
                      keyboardType="number-pad"
                      secureTextEntry={!showConfirmPin}
                      maxLength={4}
                      returnKeyType="done"
                      onSubmitEditing={handlePhonePinAuth}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPin(!showConfirmPin)}
                      disabled={isLoading}
                      style={styles.eyeIconBtn}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Icon name={showConfirmPin ? 'eye' : 'eye-off'} size={18} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                  {activeErrorField === 'confirmPin' && !!fieldErrorMessages.confirmPin && (
                    <Text style={styles.fieldErrorText}>{fieldErrorMessages.confirmPin}</Text>
                  )}
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                onPress={handlePhonePinAuth}
                disabled={isLoading}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {isLoading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                      <Text style={styles.submitText}>
                        {authMode === 'signin' ? 'Signing In...' : 'Creating Account...'}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.submitText}>
                        {authMode === 'signin' ? 'Sign In & Access' : 'Create Account'}
                      </Text>
                      <Icon name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Switch Mode Prompt */}
              <TouchableOpacity
                onPress={() => handleTabChange(authMode === 'signin' ? 'register' : 'signin')}
                disabled={isLoading}
                style={[styles.switchModeRow, isLoading && { opacity: 0.5 }]}
                activeOpacity={0.7}
              >
                <Text style={styles.switchModeText}>
                  {authMode === 'signin' ? "Don't have an account? " : 'Already registered? '}
                  <Text style={styles.switchModeHighlight}>
                    {authMode === 'signin' ? 'Create New PIN' : 'Sign In with PIN'}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Guest Exploration Option */}
          <View style={styles.guestSection}>
            <View style={styles.orDividerRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.orLine} />
            </View>
            <TouchableOpacity
              onPress={handleContinueAsGuest}
              disabled={isLoading}
              style={[styles.guestButton, isLoading && { opacity: 0.5 }]}
              activeOpacity={0.8}
            >
              <Icon name="compass" size={16} color="#059669" style={{ marginRight: 8 }} />
              <Text style={styles.guestButtonText}>Explore as Guest</Text>
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
    backgroundColor: '#F8FAF9',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    flexGrow: 1,
  },
  headerImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  headerLeafImage: {
    width: 140,
    height: 105,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.2,
    borderColor: '#FECACA',
    borderRadius: BorderRadius.lg,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#991B1B',
    lineHeight: 18,
  },
  errorBannerAction: {
    marginTop: 6,
  },
  errorBannerActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  appName: {
    ...Typography.heading1,
    fontSize: 28,
    fontWeight: '800',
    color: '#064E3B',
    letterSpacing: -0.5,
  },
  appTagline: {
    ...Typography.body,
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.md,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: BorderRadius.xl,
    padding: 4,
    marginBottom: 18,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
  },
  segmentTabActive: {
    backgroundColor: '#FFFFFF',
    ...Shadow.sm,
  },
  tabDisabled: {
    opacity: 0.5,
  },
  segmentText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#065F46',
  },
  cardHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  formFields: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  labelWithHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  pinHint: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  matchBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  matchSuccess: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
  },
  matchError: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 12,
    height: 50,
  },
  inputContainerDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.65,
  },
  inputErrorBorder: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF5F5',
  },
  inputSuccessBorder: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  fieldErrorText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 4,
    marginLeft: 4,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
  },
  inputDisabled: {
    color: '#94A3B8',
  },
  pinInput: {
    letterSpacing: 4,
    fontSize: 18,
    fontWeight: '800',
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    gap: 4,
  },
  flagEmoji: {
    fontSize: 15,
  },
  countryCodeText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  codeDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#CBD5E1',
    marginLeft: 6,
  },
  eyeIconBtn: {
    padding: 6,
  },
  submitButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginTop: 8,
    ...Shadow.md,
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    paddingHorizontal: 20,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  switchModeRow: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchModeText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  switchModeHighlight: {
    color: '#059669',
    fontWeight: '700',
  },
  guestSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 14,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  orText: {
    marginHorizontal: 10,
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#A7F3D0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.xl,
    width: '100%',
    ...Shadow.sm,
  },
  guestButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#065F46',
  },

});

export default LoginScreen;
