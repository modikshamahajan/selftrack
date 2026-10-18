
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {
  Path,
  G,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';

// ─── Responsive helpers ───────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get('window');
const IS_TABLET = Math.min(SW, SH) >= 600;
const BASE = 390;
const sc = (n: number) => (SW / BASE) * n;
const fc = (n: number) => n * Math.min(SW / BASE, IS_TABLET ? 1.4 : 1.12);

// ─────────────────────────────────────────────────────────────────────────────
// LEAVES
// ─────────────────────────────────────────────────────────────────────────────

const CenterLeaves: React.FC = () => {
  const sz = sc(IS_TABLET ? 128 : 106);
  return (
    <Svg width={sz} height={sz * 0.93} viewBox="0 0 110 102">
      <Defs>
        <SvgLinearGradient id="lb" x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0%" stopColor="#7EDF8E" />
          <Stop offset="100%" stopColor="#28AB3E" />
        </SvgLinearGradient>
        <SvgLinearGradient id="lf" x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0%" stopColor="#AEEFB4" />
          <Stop offset="100%" stopColor="#4EC85C" />
        </SvgLinearGradient>
        <SvgLinearGradient id="ls" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#FFE066" />
          <Stop offset="100%" stopColor="#F5A623" />
        </SvgLinearGradient>
      </Defs>
      {/* Back leaf */}
      <G transform="rotate(-20 54 56) translate(8 4)">
        <Path d="M46 82 C10 66, 8 18, 46 4 C84 18, 82 66, 46 82Z" fill="url(#lb)" />
        <Path d="M46 4 L46 82" stroke="#fff" strokeWidth={1.4} strokeLinecap="round" opacity={0.5} />
        <Path d="M46 20 Q33 32, 24 40" stroke="#fff" strokeWidth={0.9} strokeLinecap="round" opacity={0.38} />
        <Path d="M46 36 Q32 47, 22 55" stroke="#fff" strokeWidth={0.9} strokeLinecap="round" opacity={0.38} />
        <Path d="M46 20 Q59 32, 68 40" stroke="#fff" strokeWidth={0.9} strokeLinecap="round" opacity={0.38} />
        <Path d="M46 36 Q60 47, 70 55" stroke="#fff" strokeWidth={0.9} strokeLinecap="round" opacity={0.38} />
      </G>
      {/* Front leaf */}
      <G transform="rotate(12 54 56) translate(-4 6)">
        <Path d="M54 80 C20 64, 18 20, 54 6 C88 20, 86 64, 54 80Z" fill="url(#lf)" />
        <Path d="M54 6 L54 80" stroke="#fff" strokeWidth={1.4} strokeLinecap="round" opacity={0.5} />
        <Path d="M54 22 Q41 34, 32 42" stroke="#fff" strokeWidth={0.9} strokeLinecap="round" opacity={0.38} />
        <Path d="M54 38 Q40 49, 30 57" stroke="#fff" strokeWidth={0.9} strokeLinecap="round" opacity={0.38} />
        <Path d="M54 22 Q67 34, 76 42" stroke="#fff" strokeWidth={0.9} strokeLinecap="round" opacity={0.38} />
      </G>
      {/* Yellow sprout */}
      <G transform="rotate(28 22 84) translate(-6 8)">
        <Path d="M22 90 C10 80, 8 64, 22 58 C36 64, 34 80, 22 90Z" fill="url(#ls)" opacity={0.92} />
        <Path d="M22 58 L22 90" stroke="#fff" strokeWidth={0.9} strokeLinecap="round" opacity={0.4} />
      </G>
    </Svg>
  );
};

export const DecorLeaf: React.FC = () => {
  const sz = sc(IS_TABLET ? 108 : 86);
  return (
    <Svg width={sz} height={sz * 1.22} viewBox="0 0 88 107">
      <Defs>
        <SvgLinearGradient id="dm" x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0%" stopColor="#AAEBB2" />
          <Stop offset="100%" stopColor="#2BB840" />
        </SvgLinearGradient>
        <SvgLinearGradient id="ds" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#6FD97A" />
          <Stop offset="100%" stopColor="#22A034" />
        </SvgLinearGradient>
      </Defs>
      <Path d="M44 90 C12 72, 10 20, 44 4 C78 20, 76 72, 44 90Z" fill="url(#dm)" />
      <Path d="M44 4 L44 90" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" opacity={0.48} />
      <Path d="M44 22 Q30 36, 20 45" stroke="#fff" strokeWidth={1.1} strokeLinecap="round" opacity={0.38} />
      <Path d="M44 42 Q29 53, 18 62" stroke="#fff" strokeWidth={1.1} strokeLinecap="round" opacity={0.38} />
      <Path d="M44 22 Q58 36, 68 45" stroke="#fff" strokeWidth={1.1} strokeLinecap="round" opacity={0.38} />
      <Path d="M44 42 Q59 53, 70 62" stroke="#fff" strokeWidth={1.1} strokeLinecap="round" opacity={0.38} />
      {/* Stem */}
      <Path d="M44 90 Q40 98, 34 104" stroke="#2BB840" strokeWidth={1.8} strokeLinecap="round" fill="none" />
      {/* Small sprout */}
      <G transform="translate(16 88) rotate(-22)">
        <Path d="M9 24 C0 17, -1 6, 9 2 C19 6, 18 17, 9 24Z" fill="url(#ds)" />
        <Path d="M9 2 L9 24" stroke="#fff" strokeWidth={0.9} strokeLinecap="round" opacity={0.42} />
      </G>
    </Svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUND SHAPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * TOP BLOBS — three SEPARATE rounded shapes, matching the image exactly:
 *
 *  1. TopRightBlob  — large oval anchored to top-right corner.
 *                     Pale warm yellow #FAD96B, quite large (~55% screen width).
 *                     Sits mostly off-screen to the right/top, so only the
 *                     bottom-left quadrant is visible.
 *
 *  2. TopLeftBlob   — smaller oval anchored to top-left corner.
 *                     Same pale yellow. Smaller (~32% screen width).
 *                     Only bottom-right quadrant visible.
 *
 *  3. LeftMidBlob   — tiny standalone oval on the left edge at ~38% height.
 *                     Slightly more saturated yellow. Half-hidden behind left edge.
 *
 * None of these shapes connect to each other — there is clear white space
 * between top-left and top-right blobs (matches the image).
 */

/** Large oval — top-right corner */
const TopRightBlob: React.FC = () => {
  const bw = SW * (IS_TABLET ? 0.60 : 0.58);
  const bh = bw * 0.78;
  return (
    <View style={{
      position: 'absolute',
      top: -(bh * 0.42),   // push ~42% above screen top
      right: -(bw * 0.12),   // push ~12% off right edge
      width: bw,
      height: bh,
      backgroundColor: '#FAD96B',
      borderRadius: bw,   // full ellipse
      opacity: 0.60,
    }} />
  );
};

/** Smaller oval — top-left corner */
const TopLeftBlob: React.FC = () => {
  const bw = SW * (IS_TABLET ? 0.36 : 0.34);
  const bh = bw * 0.80;
  return (
    <View style={{
      position: 'absolute',
      top: -(bh * 0.50),    // half above screen
      left: -(bw * 0.18),    // slightly off left edge
      width: bw,
      height: bh,
      backgroundColor: '#FAD96B',
      borderRadius: bw,
      opacity: 0.55,
    }} />
  );
};

/** Tiny oval on left edge, mid-screen */
const LeftMidBlob: React.FC = () => {
  const bw = sc(IS_TABLET ? 72 : 58);
  const bh = bw * 0.82;
  return (
    <View style={{
      position: 'absolute',
      top: SH * 0.355,
      left: -(bw * 0.42),    // half-hidden behind left edge
      width: bw,
      height: bh,
      backgroundColor: '#F8C93E',
      borderRadius: bw,
      opacity: 0.50,
    }} />
  );
};

/**
 * Bottom green wave — sits flush at the very bottom of the screen.
 * It is purely decorative; the loading bar lives ABOVE it in white space.
 */
const BottomWave: React.FC = () => {
  const wH = SH * 0.17; // wave occupies bottom 17% of screen
  const d1 = [
    `M 0,${wH * 0.60}`,
    `C ${SW * 0.20},${wH * 0.10}, ${SW * 0.40},${wH * 0.75}, ${SW * 0.60},${wH * 0.40}`,
    `C ${SW * 0.78},${wH * 0.10}, ${SW * 0.90},${wH * 0.52}, ${SW},${wH * 0.35}`,
    `L ${SW},${wH} L 0,${wH} Z`,
  ].join(' ');
  const d2 = [
    `M 0,${wH * 0.76}`,
    `C ${SW * 0.22},${wH * 0.35}, ${SW * 0.44},${wH * 0.90}, ${SW * 0.63},${wH * 0.58}`,
    `C ${SW * 0.80},${wH * 0.30}, ${SW * 0.92},${wH * 0.65}, ${SW},${wH * 0.50}`,
    `L ${SW},${wH} L 0,${wH} Z`,
  ].join(' ');
  return (
    <Svg width={SW} height={wH} viewBox={`0 0 ${SW} ${wH}`}
      style={{ position: 'absolute', bottom: 0, left: 0 }}>
      <Path d={d1} fill="#8EE4A2" opacity={0.48} />
      <Path d={d2} fill="#4EC860" opacity={0.35} />
    </Svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
type Nav = StackNavigationProp<RootStackParamList, 'Splash'>;
interface Props { navigation: Nav; }

const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const tagAnim = useRef(new Animated.Value(0)).current;
  const barAnim = useRef(new Animated.Value(0)).current;

  // Dynamic progress value (1–100).  Replace this with your real loader logic.
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 38, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.timing(tagAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, 350);

    // Start auth check immediately upon mount in parallel with splash animation
    const authPromise = useAuthStore.getState().initializeAuth();

    // ── Simulated loading progress 1 → 100 ──────────────────────────────────
    let current = 0;
    const interval = setInterval(async () => {
      current += 3;
      const nextProgress = Math.min(current, 100);
      setProgress(nextProgress);
      Animated.timing(barAnim, {
        toValue: nextProgress / 100,
        duration: 18,
        useNativeDriver: false,
      }).start();

      if (current >= 100) {
        clearInterval(interval);
        // Auth check is already running/finished in parallel - navigate immediately with 0 delay!
        const isAuth = await authPromise;
        if (isAuth) {
          navigation.replace('MainTabs');
        } else {
          navigation.replace('Onboarding');
        }
      }
    }, 18);

    // Track app download once
    const trackDownload = async () => {
      try {
        const hasTracked = await AsyncStorage.getItem('@has_tracked_download');
        if (!hasTracked) {
          const deviceId = Math.random().toString(36).substring(2, 15);
          await api.post('/admin/track-download', {
            device_id: deviceId,
            platform: Platform.OS
          });
          await AsyncStorage.setItem('@has_tracked_download', 'true');
        }
      } catch (err) {
        console.log('Error tracking download', err);
      }
    };
    trackDownload();

    return () => clearInterval(interval);
  }, []);

  const barFillWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Decorative leaf: right-aligned, sitting just above the bottom wave
  const waveH = SH * 0.17;
  const leafBottom = waveH + sc(8);   // just above wave top
  const trackWidth = SW * (IS_TABLET ? 0.50 : 0.58);

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* ── Background blobs / waves ── */}
      <TopRightBlob />
      <TopLeftBlob />
      <LeftMidBlob />
      <BottomWave />

      {/* ── Logo + name, vertically centred ── */}
      <TouchableWithoutFeedback onLongPress={() => navigation.navigate('AdminDashboard')}>
        <Animated.View style={[styles.center, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <CenterLeaves />
          <Text style={[styles.appName, { fontSize: fc(34) }]}>SelfTrack</Text>
        </Animated.View>
      </TouchableWithoutFeedback>

      {/* ── Tagline ── */}
      <Animated.Text style={[styles.tagline, { opacity: tagAnim, fontSize: fc(14) }]}>
        Track  •  Improve  •  Thrive
      </Animated.Text>

      {/* ── Decorative leaf — bottom-right, above wave, no overlap with loading ── */}
      <View style={{ position: 'absolute', bottom: leafBottom, right: sc(16) }}>
        <DecorLeaf />
      </View>

      {/* ── Loading section ──────────────────────────────────────────────────
           • Sits in pure white space ABOVE the green wave
           • Centered horizontally
           • Dark text so it is readable against the white background
           • Very thin track (3 dp height)
      ─────────────────────────────────────────────────────────────────────── */}
      <View style={[styles.loadingSection, { bottom: waveH + sc(22) }]}>
        <Text style={[styles.loadingLabel, { fontSize: fc(12) }]}>
          Loading... {progress}%
        </Text>
        <View style={[styles.track, { width: trackWidth }]}>
          <Animated.View style={[styles.fill, { width: barFillWidth }]} />
        </View>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  center: {
    alignItems: 'center',
    marginBottom: sc(4),
    marginTop: -sc(18), // sit slightly above true vertical centre
  },
  appName: {
    fontWeight: '800',
    color: '#1B2D22',
    letterSpacing: -0.4,
    marginTop: sc(12),
  },

  tagline: {
    color: '#7A8A80',
    fontWeight: '500',
    letterSpacing: 0.9,
    marginTop: sc(5),
  },

  // ── Loading ──
  loadingSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',   // ← centered horizontally
    paddingHorizontal: sc(36),
  },
  loadingLabel: {
    color: '#333D38',        // dark grey — clearly visible on white
    fontWeight: '600',
    marginBottom: sc(6),
    alignSelf: 'flex-start', // label left-aligned within the centered block
  },
  track: {
    height: 3,               // very thin bar, matching the image
    backgroundColor: '#DFF0E2',
    borderRadius: 10,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  fill: {
    height: '100%',
    backgroundColor: '#2BB840',
    borderRadius: 10,
  },
});

export default SplashScreen;
