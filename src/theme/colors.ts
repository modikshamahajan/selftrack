export interface GradientColors {
  primary: [string, string, ...string[]];
  splash: [string, string, ...string[]];
  wave: [string, string, ...string[]];
  purple: [string, string, ...string[]];
  sunset: [string, string, ...string[]];
  card: [string, string, ...string[]];
  dark: [string, string, ...string[]];
  success: [string, string, ...string[]];
  blue: [string, string, ...string[]];
}

export interface ColorsType {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primarySoft: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  accent: string;
  accentLight: string;
  accentCyan: string;
  neonGreen: string;
  neonBlue: string;
  background: string;
  backgroundSecondary: string;
  backgroundGray: string;
  surface: string;
  card: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textWhite: string;
  textDark: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  border: string;
  borderLight: string;
  divider: string;
  overlay: string;
  shadowColor: string;
  glassBg: string;
  glassLight: string;
  chartGreen: string;
  chartBlue: string;
  chartPurple: string;
  chartOrange: string;
  chartRed: string;
  chartCyan: string;
  gradients: GradientColors;
  xpGold: string;
  xpSilver: string;
  xpBronze: string;
  streak: string;
  badge: string;
  // Onboarding screen colors for app-wide use
  onboardingColors: string[];
}

export const Colors: ColorsType = {
  primary: '#2ECC71',
  primaryDark: '#27AE60',
  primaryLight: '#A8E6CF',
  primarySoft: '#E8F8F0',
  secondary: '#6C5CE7',
  secondaryLight: '#A29BFE',
  secondaryDark: '#5A4BD1',
  accent: '#00B4D8',
  accentLight: '#90E0EF',
  accentCyan: '#48CAE4',
  neonGreen: '#00E676',
  neonBlue: '#2979FF',
  background: '#FFFFFF',
  backgroundSecondary: '#F8FAF9',
  backgroundGray: '#F5F7FA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textWhite: '#FFFFFF',
  textDark: '#2D3436',
  success: '#2ECC71',
  warning: '#F39C12',
  error: '#E74C3C',
  info: '#3498DB',
  border: '#E8ECF0',
  borderLight: '#F0F4F8',
  divider: '#EAECEF',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadowColor: '#000000',
  glassBg: 'rgba(255, 255, 255, 0.85)',
  glassLight: 'rgba(255, 255, 255, 0.95)',
  chartGreen: '#2ECC71',
  chartBlue: '#3498DB',
  chartPurple: '#6C5CE7',
  chartOrange: '#F39C12',
  chartRed: '#E74C3C',
  chartCyan: '#00B4D8',
  gradients: {
    primary: ['#2ECC71', '#27AE60'],
    splash: ['#E8F8F0', '#FFFFFF', '#E8F8F0'],
    wave: ['#2ECC71', '#48CAE4'],
    purple: ['#6C5CE7', '#A29BFE'],
    sunset: ['#F39C12', '#E74C3C'],
    card: ['#FFFFFF', '#F8FAF9'],
    dark: ['#1A1A2E', '#2D3436'],
    success: ['#2ECC71', '#00E676'],
    blue: ['#3498DB', '#2979FF'],
  },
  xpGold: '#FFD700',
  xpSilver: '#C0C0C0',
  xpBronze: '#CD7F32',
  streak: '#FF6B35',
  badge: '#6C5CE7',
  // Onboarding screen colors for app-wide use (cycling pattern)
  onboardingColors: ['#EBF8F0', '#FDF4EE', '#F4F2FF', '#FFFFFF'],
};

export default Colors;
