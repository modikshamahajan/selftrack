import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather as Icon } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { Alert } from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Spacing } from '../theme/spacing';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../store/useAuthStore';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Signup'>;

const INTERESTS = [
  { id: 'health', label: 'Health', icon: 'heart' },
  { id: 'fitness', label: 'Fitness', icon: 'activity' },
  { id: 'mindfulness', label: 'Mindfulness', icon: 'sun' },
  { id: 'nutrition', label: 'Nutrition', icon: 'coffee' },
  { id: 'sleep', label: 'Sleep', icon: 'moon' },
  { id: 'productivity', label: 'Productivity', icon: 'zap' },
  { id: 'social', label: 'Social', icon: 'users' },
  { id: 'journaling', label: 'Journaling', icon: 'book' },
];

const GOALS = ['Build healthy habits', 'Track my moods', 'Improve fitness', 'Better sleep', 'Reduce stress', 'Stay motivated'];

const SignupScreen: React.FC<{ navigation: NavigationProp }> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleInterest = (id: string) => setSelectedInterests((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  const toggleGoal = (goal: string) => setSelectedGoals((prev) => prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      return Alert.alert('Validation Error', 'Please fill in all fields.');
    }

    setIsLoading(true);
    try {
      await useAuthStore.getState().register(
        name.trim(),
        email.trim(),
        password,
        selectedInterests,
        selectedGoals
      );
      navigation.replace('MainTabs');
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.detail || error.response?.data?.message || 'Failed to sign up. Please try again.';
      Alert.alert('Registration Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
              {/* <View style={styles.breadcrumbBadge}>
                <Text style={styles.breadcrumbText}>Step 1 of 3</Text>
              </View> */}
            </View>
            <Text style={styles.title}>Create Your Account</Text>
            <Text style={styles.subtitle}>Let's personalize your experience.</Text>
          </View>

          <View style={styles.form}>
            <InputField label="Full Name" placeholder="Enter your name" value={name} onChangeText={setName} icon="user" />
            <InputField label="Email" placeholder="Enter your email" value={email} onChangeText={setEmail} icon="mail" keyboardType="email-address" />
            <InputField label="Password" placeholder="Create a password" value={password} onChangeText={setPassword} icon="lock" secureTextEntry helperText="Min 8 characters with one number" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Your Interests</Text>
            <View style={styles.chipsContainer}>
              {INTERESTS.map((interest) => {
                const isSelected = selectedInterests.includes(interest.id);
                return (
                  <TouchableOpacity key={interest.id} style={[styles.chip, isSelected && styles.chipSelected]} onPress={() => toggleInterest(interest.id)}>
                    <Icon name={interest.icon as any} size={16} color={isSelected ? Colors.textWhite : Colors.textSecondary} />
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{interest.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What are your goals?</Text>
            <View style={styles.goalsContainer}>
              {GOALS.map((goal) => {
                const isSelected = selectedGoals.includes(goal);
                return (
                  <TouchableOpacity key={goal} style={[styles.goalItem, isSelected && styles.goalItemSelected]} onPress={() => toggleGoal(goal)}>
                    <Icon name={isSelected ? 'check-circle' : 'circle'} size={20} color={isSelected ? Colors.primary : Colors.textTertiary} />
                    <Text style={[styles.goalText, isSelected && styles.goalTextSelected]}>{goal}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Button title="Continue" onPress={handleSignup} loading={isLoading} variant="gradient" style={{ marginTop: 8, marginBottom: 16 }}
            icon={<Icon name="arrow-right" size={20} color={Colors.textWhite} />} iconPosition="right" />

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  header: { marginBottom: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  backButton: { marginBottom: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.backgroundGray, justifyContent: 'center', alignItems: 'center' },
  breadcrumbBadge: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: BorderRadius.full, backgroundColor: Colors.backgroundGray },
  breadcrumbText: { ...Typography.caption, color: Colors.textSecondary },
  title: { ...Typography.heading2, color: Colors.textPrimary, marginBottom: 8 },
  subtitle: { ...Typography.body, color: Colors.textSecondary },
  form: { marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { ...Typography.subtitle, color: Colors.textPrimary, marginBottom: 12, fontWeight: '600' },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: BorderRadius.full, backgroundColor: Colors.backgroundGray, gap: 6 },
  chipSelected: { backgroundColor: Colors.primary },
  chipText: { ...Typography.caption, fontWeight: '500', color: Colors.textSecondary },
  chipTextSelected: { color: Colors.textWhite },
  goalsContainer: { gap: 8 },
  goalItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: BorderRadius.lg, backgroundColor: Colors.backgroundGray, gap: 12 },
  goalItemSelected: { backgroundColor: Colors.primarySoft, borderWidth: 1, borderColor: Colors.primaryLight },
  goalText: { ...Typography.body, color: Colors.textSecondary },
  goalTextSelected: { color: Colors.primaryDark, fontWeight: '500' },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { ...Typography.body, color: Colors.textSecondary },
  loginLink: { ...Typography.body, color: Colors.primary, fontWeight: '700' },
});

export default SignupScreen;
