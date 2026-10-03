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
import SignupScreen from '../screens/SignupScreen';
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

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Signup: undefined;
  MainTabs: undefined;
  AIChat: undefined;
  HabitTracker: undefined;
  Analytics: undefined;
  CreateEditHabit: undefined | { habit?: any };
  Rewards: undefined;
  Notifications: undefined;
  Security: undefined;
  Settings: undefined;
  AdminLogin: undefined;
  AdminDashboard: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
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
  <View style={styles.tabIcon}>
    <Icon name={name} size={22} color={focused ? Colors.primary : Colors.textTertiary} />
    {focused ? <View style={styles.activeDot} /> : null}
  </View>
);

const BottomTabs: React.FC = () => {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: [
          styles.tabBar,
          {
            height: Platform.OS === 'web' ? 60 : 64 + insets.bottom,
            paddingBottom: Platform.OS === 'web' ? 8 : 8 + insets.bottom,
          }
        ],
      }}>
      <Tab.Screen name="Home" component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} /> }} />
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
    <Stack.Screen name="Signup" component={SignupScreen} />
    <Stack.Screen name="MainTabs" component={BottomTabs} />
    <Stack.Screen name="AIChat" component={AIChatScreen} />
    <Stack.Screen name="HabitTracker" component={HabitTrackerScreen} />
    <Stack.Screen name="Analytics" component={AnalyticsScreen} />
    <Stack.Screen name="CreateEditHabit" component={CreateEditHabitScreen} />
    <Stack.Screen name="Rewards" component={RewardsScreen} />
    <Stack.Screen name="Notifications" component={NotificationScreen} />
    <Stack.Screen name="Security" component={SecurityScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'web' ? 60 : 64,
    backgroundColor: Colors.background,
    borderTopWidth: 0,
    paddingBottom: Platform.OS === 'web' ? 8 : 8,
    paddingTop: 8,
    ...Shadow.md,
  },
  tabLabel: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  tabIcon: { alignItems: 'center', justifyContent: 'center' },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primary, marginTop: 4 },
});

export default AppNavigator;
