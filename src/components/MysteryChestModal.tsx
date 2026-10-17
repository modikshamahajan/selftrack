import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather as Icon } from '@expo/vector-icons';
import { playCelebrationSound } from '../utils/celebrationSound';

const { width } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  reward: {
    xp: number;
    shieldAdded: boolean;
    message: string;
  } | null;
}

export const MysteryChestModal: React.FC<Props> = ({ visible, onClose, reward }) => {
  const scaleAnim = useRef(new Animated.Value(0.4)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && reward) {
      playCelebrationSound().catch(() => {});

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(bounceAnim, {
              toValue: -12,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(bounceAnim, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.4);
      bounceAnim.setValue(0);
      rotateAnim.setValue(0);
    }
  }, [visible, reward]);

  if (!visible || !reward) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['#FFFDF0', '#FFFBEA', '#FFF9E6']}
            style={styles.cardGradient}
          >
            {/* Close Cross */}
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="x" size={18} color="#92400E" />
            </TouchableOpacity>

            {/* Glowing Chest */}
            <Animated.View
              style={[
                styles.chestContainer,
                { transform: [{ translateY: bounceAnim }] },
              ]}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706', '#B45309']}
                style={styles.chestGlowCircle}
              >
                <Text style={styles.chestEmoji}>🎁</Text>
              </LinearGradient>
            </Animated.View>

            <Text style={styles.badgeLabel}>✨ DAILY QUEST REWARD ✨</Text>
            <Text style={styles.title}>Mystery Chest Claimed!</Text>
            <Text style={styles.subtitle}>
              You crushed all 3 daily quests today! Here are your earned bonus rewards:
            </Text>

            {/* Rewards Breakdown Cards */}
            <View style={styles.rewardsRow}>
              {/* XP Reward Card */}
              <View style={styles.rewardCard}>
                <LinearGradient
                  colors={['#EEF2FF', '#E0E7FF']}
                  style={styles.rewardCardInner}
                >
                  <Text style={styles.rewardEmoji}>⭐</Text>
                  <Text style={styles.rewardValue}>+{reward.xp} XP</Text>
                  <Text style={styles.rewardDesc}>Bonus XP</Text>
                </LinearGradient>
              </View>

              {/* Streak Shield Card */}
              <View style={styles.rewardCard}>
                <LinearGradient
                  colors={reward.shieldAdded ? ['#ECFDF5', '#D1FAE5'] : ['#F3F4F6', '#E5E7EB']}
                  style={styles.rewardCardInner}
                >
                  <Text style={styles.rewardEmoji}>{reward.shieldAdded ? '🛡️' : '🔥'}</Text>
                  <Text style={[styles.rewardValue, { color: reward.shieldAdded ? '#059669' : '#6B7280' }]}>
                    {reward.shieldAdded ? '+1 Shield' : 'Streak Safe'}
                  </Text>
                  <Text style={styles.rewardDesc}>
                    {reward.shieldAdded ? 'Freeze Protection' : 'Streak On Track'}
                  </Text>
                </LinearGradient>
              </View>
            </View>

            {reward.shieldAdded && (
              <View style={styles.shieldNotice}>
                <Icon name="shield" size={14} color="#059669" style={{ marginRight: 6 }} />
                <Text style={styles.shieldNoticeText}>
                  Your streak is now protected from breaking if you miss tomorrow!
                </Text>
              </View>
            )}

            {/* Claim button */}
            <TouchableOpacity activeOpacity={0.85} onPress={onClose} style={styles.claimBtn}>
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.claimBtnGradient}
              >
                <Text style={styles.claimBtnText}>Awesome! Claim Rewards</Text>
                <Icon name="arrow-right" size={16} color="#FFF" style={{ marginLeft: 6 }} />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: Math.min(width - 36, 360),
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  cardGradient: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chestContainer: {
    marginBottom: 14,
    marginTop: 4,
  },
  chestGlowCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D97706',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  chestEmoji: {
    fontSize: 42,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#78350F',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  rewardsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 14,
  },
  rewardCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  rewardCardInner: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  rewardEmoji: {
    fontSize: 26,
    marginBottom: 4,
  },
  rewardValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4338CA',
    marginBottom: 2,
  },
  rewardDesc: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  shieldNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  shieldNoticeText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
  },
  claimBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
  },
  claimBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  claimBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});
