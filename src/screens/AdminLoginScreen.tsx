import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Feather as Icon } from '@expo/vector-icons';
import api from '../services/api';
import { Colors } from '../theme/colors';
import { safeGoBack } from '../utils/navigation';

type Nav = StackNavigationProp<RootStackParamList, 'AdminLogin'>;
interface Props { navigation: Nav; }

const AdminLoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('admin@selftrack.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@admin_token').then((tok) => {
      if (tok) {
        navigation.replace('AdminDashboard');
      }
    }).catch(() => {});
  }, [navigation]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/admin/login', { 
        email: email.trim(), 
        password: password.trim() 
      });
      await AsyncStorage.setItem('@admin_token', data.access_token);
      navigation.replace('AdminDashboard');
    } catch (err: any) {
      console.log('Admin login error:', err);
      if (err.response) {
        setError(err.response.data?.detail || 'Invalid admin credentials');
      } else {
        setError(err.message || 'Network Error - Cannot reach server');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => safeGoBack(navigation, 'MainTabs', { screen: 'Profile' })}
      >
        <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.formContainer}>
        <View style={styles.header}>
          <Icon name="shield" size={48} color={Colors.primary} />
          <Text style={styles.title}>Admin Portal</Text>
          <Text style={styles.subtitle}>Secure Access Only</Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Admin Email</Text>
          <TextInput
            style={styles.input}
            placeholder="admin@selftrack.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity 
              style={styles.eyeIcon} 
              onPress={() => setShowPassword(!showPassword)}
            >
              <Icon name={showPassword ? "eye" : "eye-off"} size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.loginText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textTertiary,
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F7F9',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  eyeIcon: {
    padding: 16,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  loginText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
});

export default AdminLoginScreen;
