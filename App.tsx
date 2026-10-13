import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { triggerDailyReminderCheck } from './src/services/notifications';

LogBox.ignoreLogs([
  'Warning:',
  'Expo Go no longer supports remote push notifications',
  'Android Push Notifications',
  '[expo-notifications]',
  'cannot find native module ExpoSpeechRecognition',
]);

const linking: any = {
  prefixes: ['selftrack://'],
  config: {
    screens: {
      Splash: 'splash',
      Onboarding: 'onboarding',
      Login: 'login',
      Signup: 'signup',
      MainTabs: {
        screens: {
          Home: 'home',
          Habits: 'habits',
          Journal: 'journal',
          Health: 'health',
          Social: 'social',
          Profile: 'profile',
        },
      },
      AIChat: 'ai-chat',
      HabitTracker: 'habits',
      CreateEditHabit: 'create-habit',
      Analytics: 'analytics',
      Rewards: 'rewards',
      Notifications: 'notifications',
      Security: 'security',
      Settings: 'settings',
    },
  },
};

const App: React.FC = () => {
  useEffect(() => {
    triggerDailyReminderCheck().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer linking={linking}>
        <StatusBar style="dark" />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
