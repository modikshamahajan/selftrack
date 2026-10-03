import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Spacing, Shadow } from '../theme/spacing';

interface AIAssistantWidgetProps {
  message?: string;
  onPress?: () => void;
  onDismiss?: () => void;
  showAvatar?: boolean;
  compact?: boolean;
}

const AIAssistantWidget: React.FC<AIAssistantWidgetProps> = ({
  message = "Hey! How are you feeling today?",
  onPress,
  onDismiss,
  showAvatar = true,
  compact = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, compact && styles.compact]}
      onPress={onPress}
      activeOpacity={0.85}>
      {showAvatar ? (
        <View style={styles.avatar}>
          <View style={styles.avatarInner}>
            <Icon name="cpu" size={20} color={Colors.primary} />
          </View>
        </View>
      ) : null}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>AI Companion</Text>
          <View style={styles.onlineDot} />
        </View>
        <Text style={styles.message} numberOfLines={2}>{message}</Text>
      </View>
      {onDismiss ? (
        <TouchableOpacity style={styles.dismiss} onPress={onDismiss}>
          <Icon name="x" size={16} color={Colors.textTertiary} />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primarySoft,
    borderRadius: BorderRadius.xl, padding: Spacing.base, borderWidth: 1, borderColor: Colors.primaryLight + '50',
  },
  compact: { padding: Spacing.md },
  avatar: { marginRight: Spacing.md },
  avatarInner: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', ...Shadow.sm },
  content: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  name: { ...Typography.caption, fontWeight: '700', color: Colors.primaryDark },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.neonGreen, marginLeft: 6 },
  message: { ...Typography.body, color: Colors.textSecondary },
  dismiss: { padding: Spacing.xs },
});

export default AIAssistantWidget;
