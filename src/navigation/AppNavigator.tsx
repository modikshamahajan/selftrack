import CreateEditHabitScreen from '../screens/CreateEditHabitScreen';
import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather as Icon } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Shadow } from '../theme/spacing';

import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import AIChatScreen from '../screens/AIChatScreen';
import JournalScreen from '../screens/JournalScreen';
import HabitTrackerScreen from '../screens/HabitTrackerScreen';
import HealthTrackingScreen from '../screens/HealthTrackingScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import SocialFeedScreen from '../screens/SocialFeedScreen';
import RewardsScreen from '../screens/RewardsScreen';
import NotificationScreen from '../screens/NotificationScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SecurityScreen from '../screens/SecurityScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AdminLoginScreen from '../screens/AdminLoginScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import FocusTimerScreen from '../screens/FocusTimerScreen';
import MenstrualCycleScreen from '../screens/MenstrualCycleScreen';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  MainTabs: undefined;
  AIChat: undefined;
  HabitTracker: undefined;
  FocusTimer: undefined;
  Analytics: undefined;
  CreateEditHabit: undefined | { habit?: any };
  Rewards: undefined;
  Notifications: undefined;
  Security: undefined;
  Settings: undefined;
  AdminLogin: undefined;
  AdminDashboard: undefined;
  MenstrualCycle: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  Habits: undefined;
  Journal: undefined;
  Health: undefined;
  Social: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();

interface TabIconProps {
  name: React.ComponentProps<typeof Icon>['name'];
  focused: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ name, focused }) => (
  <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
    <Icon
      name={name}
      size={focused ? 20 : 19}
      color={focused ? Colors.primary : '#94A3B8'}
    />
  </View>
);

const BottomTabs: React.FC = () => {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const bottomInset = insets.bottom > 0 ? insets.bottom : 0;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: [
          styles.tabBar,
          {
            height: isWeb ? 62 : 60 + bottomInset,
            paddingBottom: isWeb ? 8 : bottomInset > 0 ? bottomInset + 2 : 8,
          }
        ],
      }}>
      <Tab.Screen name="Home" component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} /> }} />
      <Tab.Screen name="Habits" component={HabitTrackerScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="check-circle" focused={focused} /> }} />
      <Tab.Screen name="Journal" component={JournalScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="book-open" focused={focused} /> }} />
      <Tab.Screen name="Health" component={HealthTrackingScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="heart" focused={focused} /> }} />
      <Tab.Screen name="Social" component={SocialFeedScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="users" focused={focused} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} /> }} />
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: Colors.background },
      // Cross-platform animation: fade on web, slide on native
      cardStyleInterpolator: Platform.OS === 'web'
        ? CardStyleInterpolators.forFadeFromCenter
        : CardStyleInterpolators.forHorizontalIOS,
      // Disable gesture on web
      gestureEnabled: Platform.OS !== 'web',
    }}>
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="MainTabs" component={BottomTabs} />
    <Stack.Screen name="AIChat" component={AIChatScreen} />
    <Stack.Screen name="HabitTracker" component={HabitTrackerScreen} />
    <Stack.Screen name="FocusTimer" component={FocusTimerScreen} />
    <Stack.Screen name="Analytics" component={AnalyticsScreen} />
    <Stack.Screen name="CreateEditHabit" component={CreateEditHabitScreen} />
    <Stack.Screen name="Rewards" component={RewardsScreen} />
    <Stack.Screen name="Notifications" component={NotificationScreen} />
    <Stack.Screen name="Security" component={SecurityScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
    <Stack.Screen name="MenstrualCycle" component={MenstrualCycleScreen} />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 6,
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: -0.2,
  },
  tabIconWrap: {
    width: 44,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  tabIconWrapActive: {
    backgroundColor: Colors.primarySoft,
  },
});

export default AppNavigator;
