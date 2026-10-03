import { ViewStyle } from 'react-native';

export const Spacing: Record<string, number> = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

export const BorderRadius: Record<string, number> = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

export interface ShadowStyle {
  boxShadow?: string;
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export const Shadow: Record<string, ShadowStyle> = {
  sm: {
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  xl: {
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  glass: {
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
};

export const Layout = {
  screenPadding: 20,
  cardPadding: 16,
  sectionSpacing: 24,
  bottomNavHeight: 64,
  headerHeight: 56,
  statusBarHeight: 44,
  tabBarHeight: 48,
  inputHeight: 52,
  buttonHeight: 52,
  iconSize: {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  },
} as const;
