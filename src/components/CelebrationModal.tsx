import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Dimensions,
  Animated,
  Easing,
  Share,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Shadow } from '../theme/spacing';
import {
  SpecialEvent,
  EVENT_TYPE_METAS,
} from '../types/specialEvents';
import { playCelebrationSound, stopCelebrationSound } from '../utils/celebrationSound';

interface CelebrationModalProps {
  visible: boolean;
  event: SpecialEvent | null;
  onClose: () => void;
  onViewEvent?: (event: SpecialEvent) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 28 dynamic falling confetti particles
const NUM_CONFETTI = 28;
const CONFETTI_DATA = Array.from({ length: NUM_CONFETTI }).map((_, i) => ({
  id: i,
  startX: Math.random() * (SCREEN_WIDTH - 24),
  size: 7 + Math.random() * 9,
  color: [
    '#FF6B6B',
    '#4ECDC4',
    '#FFE66D',
    '#FF8ED4',
    '#845EC2',
    '#FF9671',
    '#00D2FC',
    '#F9F871',
    '#10B981',
    '#F59E0B',
  ][i % 10],
  shape: i % 4 === 0 ? 'circle' : i % 4 === 1 ? 'square' : i % 4 === 2 ? 'bar' : 'emoji',
  emoji: ['✨', '🎉', '⭐', '🎈', '💖', '🎊', '🎀', '🥳'][i % 8],
  duration: 2200 + (i % 7) * 350,
  delay: (i * 90) % 800,
}));

const CelebrationModal: React.FC<CelebrationModalProps> = ({
  visible,
  event,
  onClose,
  onViewEvent,
}) => {
  const [copiedToast, setCopiedToast] = useState(false);

  // Card entrance animations
  const scaleAnim = useRef(new Animated.Value(0.65)).current;
  const slideAnim = useRef(new Animated.Value(45)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Continuous celebratory hero aura animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAuraAnim = useRef(new Animated.Value(0)).current;
  const waveScaleAnim = useRef(new Animated.Value(1)).current;
  const waveOpacityAnim = useRef(new Animated.Value(0.7)).current;

  // Animated falling confetti particles
  const confettiFallAnims = useRef(
    CONFETTI_DATA.map(() => new Animated.Value(0))
  ).current;

  const triggerConfettiRain = () => {
    // Reset all confetti
    confettiFallAnims.forEach((anim) => anim.setValue(0));

    // Staggered falling animations
    const animations = CONFETTI_DATA.map((p, idx) =>
      Animated.sequence([
        Animated.delay(p.delay),
        Animated.timing(confettiFallAnims[idx], {
          toValue: 1,
          duration: p.duration,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
      ])
    );
    Animated.stagger(50, animations).start();
  };

  useEffect(() => {
    if (visible) {
      // 1. Play joyful celebration fanfare sound & haptics
      playCelebrationSound();

      // 2. Card entrance spring animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 42,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 6,
          tension: 45,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start();

      // 3. Continuous gentle pulse for hero badge
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 850,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 850,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // 4. Continuous spinning sunburst aura rays
      Animated.loop(
        Animated.timing(rotateAuraAnim, {
          toValue: 1,
          duration: 9000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // 5. Expanding ripple shockwave ring
      Animated.loop(
        Animated.parallel([
          Animated.timing(waveScaleAnim, {
            toValue: 1.6,
            duration: 1600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(waveOpacityAnim, {
              toValue: 0.6,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(waveOpacityAnim, {
              toValue: 0,
              duration: 1300,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();

      // 6. Start dynamic confetti rain
      triggerConfettiRain();
    } else {
      scaleAnim.setValue(0.65);
      slideAnim.setValue(45);
      fadeAnim.setValue(0);
      rotateAuraAnim.setValue(0);
      waveScaleAnim.setValue(1);
      waveOpacityAnim.setValue(0.7);
      setCopiedToast(false);
      stopCelebrationSound();
    }
  }, [visible]);

  if (!event) return null;

  const meta = EVENT_TYPE_METAS[event.type] || EVENT_TYPE_METAS.occasion;

  const getGreetingHeader = () => {
    switch (event.type) {
      case 'birthday':
        return "🎉 IT'S CELEBRATION TIME! 🎉";
      case 'anniversary':
        return '✨ HAPPY ANNIVERSARY! ✨';
      case 'meeting':
        return '💼 IMPORTANT MEETING TODAY! 💼';
      case 'occasion':
      default:
        return '⭐ SPECIAL OCCASION TODAY! ⭐';
    }
  };

  const getWishMessage = () => {
    if (event.notes) return event.notes;
    switch (event.type) {
      case 'birthday':
        return `Wishing ${event.title} an extraordinary birthday filled with immense happiness, laughter, health, and memorable celebrations! Don't forget to send them your warmest wishes today. 🎂🎈`;
      case 'anniversary':
        return `Celebrating a meaningful milestone: ${event.title}! Here's to love, dedication, shared memories, and many more joyful years ahead. 💍🥂`;
      case 'meeting':
        return `Your meeting "${event.title}" is scheduled today at ${event.time}. Be prepared, review your agenda, and have an inspiring session! 🚀`;
      case 'occasion':
      default:
        return `Today is ${event.title}! Take a moment to celebrate, enjoy the highlights, and create unforgettable memories. 🎊⭐`;
    }
  };

  const handleShareWishes = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    const shareText = `🎉 ${event.title}!\n\n${getWishMessage()}\n\n— Celebrated via SelfTrack 🌟`;
    try {
      await Share.share({
        message: shareText,
        title: event.title,
      });
    } catch {}

    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 3000);
  };

  const handleReplayFanfare = () => {
    playCelebrationSound();
    triggerConfettiRain();
  };

  const auraSpinInterpolate = rotateAuraAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Dynamic Falling Confetti Particles */}
        {CONFETTI_DATA.map((p, idx) => {
          const fallY = confettiFallAnims[idx].interpolate({
            inputRange: [0, 1],
            outputRange: [-60, SCREEN_HEIGHT + 60],
          });
          const spin = confettiFallAnims[idx].interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', `${(idx % 2 === 0 ? 1 : -1) * 720}deg`],
          });
          const swayX = confettiFallAnims[idx].interpolate({
            inputRange: [0, 0.25, 0.5, 0.75, 1],
            outputRange: [0, (idx % 2 === 0 ? 1 : -1) * 22, 0, (idx % 2 === 0 ? -1 : 1) * 22, 0],
          });

          return (
            <Animated.View
              key={p.id}
              pointerEvents="none"
              style={[
                styles.confetti,
                {
                  left: p.startX,
                  width: p.size,
                  height: p.shape === 'bar' ? p.size * 2.2 : p.size,
                  borderRadius: p.shape === 'circle' ? p.size / 2 : 2,
                  backgroundColor: p.shape === 'emoji' ? 'transparent' : p.color,
                  transform: [{ translateY: fallY }, { translateX: swayX }, { rotate: spin }],
                },
              ]}
            >
              {p.shape === 'emoji' ? (
                <Text style={{ fontSize: 14 }}>{p.emoji}</Text>
              ) : null}
            </Animated.View>
          );
        })}

        {/* Modal Card Container */}
        <Animated.View
          style={[
            styles.cardContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
              borderColor: meta.color + '50',
            },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Icon name="x" size={18} color="#64748B" />
          </TouchableOpacity>

          {/* Celebrative Hero Badge with Rotating Sunburst Aura */}
          <View style={styles.heroWrapper}>
            {/* Pulsing shockwave ring */}
            <Animated.View
              style={[
                styles.shockwaveRing,
                {
                  borderColor: meta.color,
                  transform: [{ scale: waveScaleAnim }],
                  opacity: waveOpacityAnim,
                },
              ]}
            />

            {/* Rotating Sunburst Halo */}
            <Animated.View
              style={[
                styles.rotatingAura,
                {
                  borderColor: meta.color + '40',
                  transform: [{ rotate: auraSpinInterpolate }],
                },
              ]}
            >
              <Text style={styles.auraStar}>✨</Text>
              <Text style={[styles.auraStar, styles.auraStarRight]}>⭐</Text>
              <Text style={[styles.auraStar, styles.auraStarBottom]}>✨</Text>
              <Text style={[styles.auraStar, styles.auraStarLeft]}>⭐</Text>
            </Animated.View>

            {/* Central Pulsing Emoji Badge */}
            <Animated.View
              style={[
                styles.heroIconBox,
                {
                  backgroundColor: meta.bgLight,
                  borderColor: meta.color,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <Text style={styles.heroEmoji}>{meta.emoji}</Text>
            </Animated.View>
          </View>

          {/* Banner Tag */}
          <Text style={[styles.headerBannerTag, { color: meta.color }]}>
            {getGreetingHeader()}
          </Text>

          {/* Title */}
          <Text style={styles.eventTitle}>{event.title}</Text>

          {/* Event Date & Time Pill */}
          <View style={styles.eventInfoRow}>
            <View style={styles.infoPill}>
              <Icon name="calendar" size={12} color={Colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.infoPillText}>{event.date}</Text>
            </View>
            <View style={styles.infoPill}>
              <Icon name="clock" size={12} color={Colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.infoPillText}>{event.time}</Text>
            </View>
            <View style={[styles.infoPill, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#B45309' }}>TODAY! 🥳</Text>
            </View>
          </View>

          {/* Wish Message Card */}
          <View style={[styles.messageCard, { borderColor: meta.color + '30', backgroundColor: meta.bgLight }]}>
            <Text style={styles.messageText}>{getWishMessage()}</Text>
          </View>

          {/* Automatic 2x Phone Alerts Info Banner (Zero manual action needed) */}
          <View style={styles.autoAlertsNoticeCard}>
            <View style={styles.autoAlertsIconWrap}>
              <Icon name="bell" size={16} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.autoAlertsNoticeTitle}>
                ✅ 2x Phone Alerts Scheduled Automatically
              </Text>
              <Text style={styles.autoAlertsNoticeSub}>
                Advance reminder & celebration alert scheduled directly on your phone — identical to daily health reminders.
              </Text>
            </View>
          </View>

          {/* Meeting link if any */}
          {event.locationOrLink ? (
            <View style={styles.linkCard}>
              <Icon name="link" size={14} color={Colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.linkText} numberOfLines={1}>
                {event.locationOrLink}
              </Text>
            </View>
          ) : null}

          {/* Toast feedback */}
          {copiedToast ? (
            <View style={styles.toastBox}>
              <Icon name="check" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.toastText}>Wishes ready to share! 💌</Text>
            </View>
          ) : null}

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: meta.color }]}
              onPress={handleShareWishes}
              activeOpacity={0.8}
            >
              <Icon name="share-2" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryActionText}>Share Warm Wishes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.replaySoundBtn}
              onPress={handleReplayFanfare}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 14, marginRight: 6 }}>🎊</Text>
              <Text style={styles.replaySoundBtnText}>Replay Fanfare & Confetti</Text>
            </TouchableOpacity>
          </View>

          {onViewEvent && (
            <TouchableOpacity
              onPress={() => onViewEvent(event)}
              style={styles.viewEventsLink}
              hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}
            >
              <Text style={styles.viewEventsText}>Open All Scheduled Special Events →</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  confetti: {
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
    borderWidth: 2,
    ...Shadow.lg,
    zIndex: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  heroWrapper: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  shockwaveRing: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2,
  },
  rotatingAura: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraStar: {
    position: 'absolute',
    top: -8,
    fontSize: 13,
  },
  auraStarRight: {
    top: undefined,
    right: -8,
  },
  auraStarBottom: {
    top: undefined,
    bottom: -8,
  },
  auraStarLeft: {
    top: undefined,
    left: -8,
  },
  heroIconBox: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  heroEmoji: {
    fontSize: 36,
  },
  headerBannerTag: {
    ...Typography.caption,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 6,
  },
  eventTitle: {
    ...Typography.heading2,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: BorderRadius.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  infoPillText: {
    ...Typography.caption,
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  messageCard: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  messageText: {
    ...Typography.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  autoAlertsNoticeCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: BorderRadius.lg,
    padding: 10,
    marginBottom: 12,
  },
  autoAlertsIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  autoAlertsNoticeTitle: {
    ...Typography.caption,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#166534',
  },
  autoAlertsNoticeSub: {
    ...Typography.caption,
    fontSize: 10.5,
    color: '#15803D',
    marginTop: 2,
    lineHeight: 14,
  },
  linkCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  linkText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
    flex: 1,
  },
  toastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    marginBottom: 10,
  },
  toastText: {
    ...Typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 11.5,
  },
  actionsRow: {
    width: '100%',
    gap: 8,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.xl,
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...Shadow.sm,
  },
  primaryActionText: {
    ...Typography.body,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  replaySoundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: BorderRadius.xl,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  replaySoundBtnText: {
    ...Typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  viewEventsLink: {
    marginTop: 10,
    paddingVertical: 4,
  },
  viewEventsText: {
    ...Typography.caption,
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.primary,
  },
});

export default CelebrationModal;
