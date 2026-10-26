import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Feather as Icon } from '@expo/vector-icons';
import { playCelebrationSound } from '../utils/celebrationSound';

interface WelcomeBonusAlertProps {
  visible: boolean;
  xpAmount?: number;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

// 6 cracker burst particles radiating outwards
const CRACKERS = [
  { emoji: '💥', x: -65, y: -45, rot: '-15deg' },
  { emoji: '🎉', x: 65, y: -45, rot: '18deg' },
  { emoji: '✨', x: -75, y: 35, rot: '-20deg' },
  { emoji: '🧨', x: 75, y: 35, rot: '22deg' },
  { emoji: '⭐', x: 0, y: -65, rot: '0deg' },
  { emoji: '🎊', x: 0, y: 70, rot: '10deg' },
];

export const WelcomeBonusAlert: React.FC<WelcomeBonusAlertProps> = ({
  visible,
  xpAmount = 100,
  onClose,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const burstAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Play celebratory sound & haptics safely
      playCelebrationSound().catch(() => {});

      // Reset values
      scaleAnim.setValue(0.85);
      burstAnim.setValue(0);

      // Spring open card & burst crackers
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.spring(burstAnim, {
          toValue: 1,
          friction: 5,
          tension: 70,
          delay: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Gentle continuous glow bounce for the center badge
      const bounceLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1.08,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      bounceLoop.start();

      return () => {
        bounceLoop.stop();
      };
    }
  }, [visible]);

  const handleClose = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}

    Animated.spring(scaleAnim, {
      toValue: 0.85,
      friction: 7,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        {/* Animated Pop-Up Card */}
        <Animated.View
          style={[
            styles.cardContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Animated Cracker Burst Particles Around Card */}
          {CRACKERS.map((c, i) => {
            const particleTranslateX = burstAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, c.x],
            });
            const particleTranslateY = burstAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, c.y],
            });
            const particleScale = burstAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 1.25, 1],
            });
            const particleRotate = burstAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', c.rot],
            });

            return (
              <Animated.View
                key={i}
                pointerEvents="none"
                style={[
                  styles.crackerParticle,
                  {
                    transform: [
                      { translateX: particleTranslateX },
                      { translateY: particleTranslateY },
                      { scale: particleScale },
                      { rotate: particleRotate },
                    ],
                  },
                ]}
              >
                <Text style={styles.crackerEmoji}>{c.emoji}</Text>
              </Animated.View>
            );
          })}

          {/* Scalloped Coupon Side Notches */}
          <View style={[styles.couponNotch, styles.notchLeft]} />
          <View style={[styles.couponNotch, styles.notchRight]} />

          {/* Close Button ('✕') */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Icon name="x" size={16} color="#94A3B8" />
          </TouchableOpacity>

          {/* Top Cashback Ribbon Header */}
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ribbonBadge}
          >
            <Text style={styles.ribbonText}>💥 WELCOME CASHBACK 💥</Text>
          </LinearGradient>

          {/* Center Coupon Burst Graphic */}
          <Animated.View
            style={[
              styles.centerBurstCircle,
              { transform: [{ scale: bounceAnim }] },
            ]}
          >
            <LinearGradient
              colors={['#FEF3C7', '#FDE68A']}
              style={styles.burstGradient}
            >
              <Text style={{ fontSize: 32 }}>🎁</Text>
            </LinearGradient>
          </Animated.View>

          {/* Highlighted 100 XP */}
          <View style={styles.rewardSection}>
            <Text style={styles.xpNumber}>+{xpAmount} XP</Text>
            <View style={styles.bonusTag}>
              <Text style={styles.bonusTagText}>⭐ BONUS CREDITED</Text>
            </View>
          </View>

          {/* Coupon Dashed Divider */}
          <View style={styles.dashedDividerContainer}>
            <View style={styles.dashedLine} />
          </View>

          {/* Minimum Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.bonusTitle}>Welcome Gift Unlocked! 🎉</Text>
            <Text style={styles.bonusSubtitle}>
              100 XP added to your Level 1 balance
            </Text>
          </View>

          {/* Claim Button */}
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.88}
            onPress={handleClose}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionGradient}
            >
              <Text style={styles.actionText}>Awesome! 🚀</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardContainer: {
    width: Math.min(width * 0.85, 320),
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 18,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FDE68A',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  ribbonBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  ribbonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  centerBurstCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#FCD34D',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  burstGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardSection: {
    alignItems: 'center',
    marginBottom: 10,
  },
  xpNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: -0.5,
  },
  bonusTag: {
    marginTop: 2,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  bonusTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.6,
  },
  dashedDividerContainer: {
    width: '100%',
    paddingVertical: 8,
    alignItems: 'center',
  },
  dashedLine: {
    width: '92%',
    borderBottomWidth: 1.5,
    borderBottomColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  couponNotch: {
    position: 'absolute',
    top: 172,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    zIndex: 5,
  },
  notchLeft: {
    left: -12,
  },
  notchRight: {
    right: -12,
  },
  detailsSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  bonusTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  bonusSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
  },
  actionButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  actionGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  crackerParticle: {
    position: 'absolute',
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crackerEmoji: {
    fontSize: 24,
  },
});

export default WelcomeBonusAlert;
