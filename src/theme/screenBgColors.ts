/**
 * Screen Background Colors Utility
 * Uses the 4 onboarding colors in a cycling pattern for visual consistency
 */

import { Colors } from './colors';

export const ONBOARDING_BG_COLORS = [
  '#EBF8F0', // Green (Slide 1)
  '#FDF4EE', // Peach (Slide 2)
  '#F4F2FF', // Purple (Slide 3)
  '#FFFFFF', // White (Slide 4)
];

// Map screens to their background color index
const screenColorMap: { [key: string]: number } = {
  // Auth flows
  Splash: 0,
  Onboarding: 0,
  Login: 1,

  // Tab screens (cycle through colors)
  Home: 0,
  Journal: 1,
  Health: 2,
  Social: 3,
  Profile: 0,

  // Modal/Detail screens
  AIChat: 1,
  HabitTracker: 2,
  Analytics: 3,
  Rewards: 0,
  Notifications: 1,
  Security: 2,
  Settings: 3,
  MenstrualCycle: 1,
};

/**
 * Get the background color for a screen
 * @param screenName - Name of the screen
 * @returns Background color hex code
 */
export const getScreenBgColor = (screenName: string): string => {
  const colorIndex = screenColorMap[screenName] ?? 3;
  return ONBOARDING_BG_COLORS[colorIndex];
};

/**
 * Get all onboarding colors
 */
export const getOnboardingColors = (): string[] => {
  return ONBOARDING_BG_COLORS;
};

export default getScreenBgColor;
