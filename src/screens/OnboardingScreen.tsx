import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

// ─── Responsive helpers ───────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get('window');
const IS_TABLET = Math.min(SW, SH) >= 600;
const sc  = (n: number) => (SW / 390) * n;
const fc  = (n: number) => n * Math.min(SW / 390, IS_TABLET ? 1.38 : 1.10);

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE IMPORTS (from assets/Images folder)
// ─────────────────────────────────────────────────────────────────────────────

const FirstScreenImage = require('../../assets/Images/firstscreen.png');
const SecondScreenImage = require('../../assets/Images/secondscreen.png');
const ThirdScreenImage = require('../../assets/Images/thirdscreen.png');
const FourthScreenImage = require('../../assets/Images/fourthscreen.png');

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE DATA
// ─────────────────────────────────────────────────────────────────────────────
interface SlideData {
  id: string;
  bg: string;
  title: string;
  subtitle: string;
  image: any;
}

const SLIDES: SlideData[] = [
  {
    id: '1',
    bg: '#EBF8F0',
    title: 'Your AI Companion for\na Better You',
    subtitle: 'Meet Nova, your AI companion who understands you and helps you grow every day.',
    image: FirstScreenImage,
  },
  {
    id: '2',
    bg: '#FDF4EE',
    title: 'Build Better\nHabits',
    subtitle: 'Small daily actions create big changes over time.',
    image: SecondScreenImage,
  },
  {
    id: '3',
    bg: '#F4F2FF',
    title: 'Understand\nYour Health',
    subtitle: 'Track your physical and mental well-being in one place.',
    image: ThirdScreenImage,
  },
  {
    id: '4',
    bg: '#e8e6e6ff',
    title: 'Achieve More\nTogether',
    subtitle: 'Join a community that motivates and celebrates your progress.',
    image: FourthScreenImage,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
type Nav = StackNavigationProp<RootStackParamList, 'Onboarding'>;
interface Props { navigation: Nav; }

const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<SlideData>>(null);
  const scrollX     = useRef(new Animated.Value(0)).current;

  const bottomBarHeight = BOTTOM_BAR_H + Math.max(insets.bottom - (Platform.OS === 'ios' ? sc(16) : 0), 0);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    } else {
      navigation.replace('Login');
    }
  };

  const handleSkip = () => navigation.replace('Login');

  // ── Dots ──────────────────────────────────────────────────────────────────
  const renderDots = () => (
    <View style={styles.dotsRow}>
      {SLIDES.map((_, i) => {
        const inputRange = [(i - 1) * SW, i * SW, (i + 1) * SW];
        const dotW = scrollX.interpolate({ inputRange, outputRange: [8, 22, 8], extrapolate: 'clamp' });
        const op   = scrollX.interpolate({ inputRange, outputRange: [0.35, 1, 0.35], extrapolate: 'clamp' });
        return (
          <Animated.View key={i} style={[styles.dot, { width: dotW, opacity: op }]} />
        );
      })}
    </View>
  );

  // ── Slide renderer ────────────────────────────────────────────────────────
  const renderSlide = ({ item }: { item: SlideData }) => (
    <View style={[styles.slide, { width: SW, backgroundColor: item.bg, paddingTop: insets.top + sc(12), paddingBottom: bottomBarHeight + sc(12) }]}>
      {/* Text block — top, center-aligned */}
      <View style={styles.textBlock}>
        <Text style={[styles.title, { fontSize: fc(24) }]}>{item.title}</Text>
        <Text style={[styles.subtitle, { fontSize: fc(14) }]}>{item.subtitle}</Text>
      </View>

      {/* Illustration — center */}
      <View style={styles.illustrationWrap}>
        <Image 
          source={item.image} 
          style={styles.illustrationImage}
          resizeMode="contain"
        />
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / SW));
        }}
      />

      {/* Bottom bar — always white background, sits above slides */}
      <View style={[styles.bottomBar, { height: bottomBarHeight, paddingBottom: Math.max(insets.bottom, sc(16)) }]}>
        {renderDots()}

        <View style={styles.bottomActions}>
          {/* Skip */}
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
            <Text style={[styles.skipText, { fontSize: fc(15) }]}>Skip</Text>
          </TouchableOpacity>

          {/* Next / Get Started */}
          <TouchableOpacity onPress={handleNext} style={styles.nextBtn} activeOpacity={0.85}>
            <Text style={[styles.nextText, { fontSize: fc(15) }]}>
              {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const BOTTOM_BAR_H = sc(IS_TABLET ? 110 : 100);
const TOP_PAD      = Platform.OS === 'ios' ? sc(54) : sc(40);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // ── Slide ──
  slide: {
    flex: 1,
    paddingTop: TOP_PAD,
    paddingBottom: BOTTOM_BAR_H + sc(12),
  },

  // Title + subtitle — center-aligned, top
  textBlock: {
    paddingHorizontal: sc(28),
    marginBottom: sc(0),
    marginTop: sc(70),
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    color: '#1A2E22',
    lineHeight: sc(32),
    marginBottom: sc(10),
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitle: {
    color: '#6B7B72',
    lineHeight: sc(22),
    fontWeight: '400',
    textAlign: 'center',
  },

  // Illustration — centered in remaining space
  illustrationWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: sc(8),
  },

  illustrationImage: {
    width: sc(IS_TABLET ? 300 : 260),
    height: sc(IS_TABLET ? 300 : 260),
  },

  // ── Bottom bar ──
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BOTTOM_BAR_H,
    // backgroundColor: '#FFFFFF',
    paddingHorizontal: sc(28),
    paddingBottom: Platform.OS === 'ios' ? sc(28) : sc(16),
    paddingTop: sc(12),
    borderTopWidth: 0,
    // subtle shadow so bar lifts above slide
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: -3 },
    // shadowOpacity: 0.04,
    // shadowRadius: 6,
    // elevation: 6,
  },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sc(14),
  },
  dot: {
    height: sc(8),
    borderRadius: sc(4),
    backgroundColor: '#2BB840',
    marginHorizontal: sc(4),
  },

  // Skip + Next row
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipBtn: {
    paddingVertical: sc(12),
    paddingHorizontal: sc(8),
  },
  skipText: {
    color: '#9BADA2',
    fontWeight: '500',
  },
  nextBtn: {
    backgroundColor: '#2BB840',
    paddingVertical: sc(13),
    paddingHorizontal: sc(44),
    borderRadius: sc(28),
    shadowColor: '#2BB840',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 8,
    elevation: 5,
  },
  nextText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default OnboardingScreen;
