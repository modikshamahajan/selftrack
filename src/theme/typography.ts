import { Platform, TextStyle } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
});

export interface TypographyType {
  fontFamily: {
    regular: string | undefined;
    medium: string | undefined;
    bold: string | undefined;
    light: string | undefined;
  };
  fontSize: Record<string, number>;
  fontWeight: Record<string, TextStyle['fontWeight']>;
  lineHeight: Record<string, number>;
  letterSpacing: Record<string, number>;
  heading1: TextStyle;
  heading2: TextStyle;
  heading3: TextStyle;
  subtitle: TextStyle;
  body: TextStyle;
  bodyLarge: TextStyle;
  caption: TextStyle;
  overline: TextStyle;
  button: TextStyle;
}

export const Typography: TypographyType = {
  fontFamily: {
    regular: fontFamily,
    medium: fontFamily,
    bold: fontFamily,
    light: fontFamily,
  },
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 40,
    display: 48,
  },
  fontWeight: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },
  heading1: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  heading2: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  heading3: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.15,
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.25,
    lineHeight: 22,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0.15,
    lineHeight: 24,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.4,
    lineHeight: 18,
  },
  overline: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    lineHeight: 24,
  },
};

export default Typography;
