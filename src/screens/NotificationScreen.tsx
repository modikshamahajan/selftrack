import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather as Icon } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Spacing, Shadow } from '../theme/spacing';
import { getScreenBgColor } from '../theme/screenBgColors';
import Header from '../components/Header';
import Toggle from '../components/Toggle';
import { useNotificationStore, AppNotification } from '../store/useNotificationStore';
import { useSettingsStore } from '../store/useSettingsStore';

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: '1',
    icon: 'bell',
    color: Colors.primary,
    title: 'Habit Reminder',
    message: 'Time for your evening meditation! Keep your streak alive 🔥',
    category: 'habit',
    time: '5 min ago',
    read: false,
  },
  {
    id: '2',
    icon: 'cpu',
    color: '#6C5CE7',
    title: 'AI Motivation',
    message: "You're on fire! 3 more habits to complete today. You got this! 💪",
    category: 'ai',
    time: '1h ago',
    read: false,
  },
  {
    id: '3',
    icon: 'award',
    color: Colors.xpGold,
    title: 'Achievement Unlocked',
    message: 'You earned the "7 Day Streak" badge! +100 XP',
    category: 'achievement',
    time: '2h ago',
    read: true,
  },
  {
    id: '4',
    icon: 'heart',
    color: '#E74C3C',
    title: 'Health Alert',
    message: "You haven't logged your water intake today. Stay hydrated!",
    category: 'health',
    time: '3h ago',
    read: true,
  },
  {
    id: '5',
    icon: 'users',
    color: '#00B4D8',
    title: 'Social Update',
    message: 'Sarah completed a 30-day challenge! Send her kudos 🎉',
    category: 'social',
    time: '5h ago',
    read: true,
  },
];

const NotificationScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const bgColor = getScreenBgColor('Notifications');
  const { notifications, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const { settings, updateSetting } = useSettingsStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const displayList = notifications.length > 0 ? notifications : DEFAULT_NOTIFICATIONS;

  return (
    <SafeAreaView edges={['bottom']} style={[styles.container, { backgroundColor: bgColor }]}>
      <Header
        title="Notifications"
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={() => markAllAsRead()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="check-circle" size={20} color={Colors.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {/* Smart Reminders Toggle */}
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Smart Reminders</Text>
            <Text style={styles.settingDesc}>AI-powered reminders based on your patterns</Text>
          </View>
          <Toggle
            value={settings.ai_suggestions}
            onValueChange={(v) => updateSetting('ai_suggestions', v)}
          />
        </View>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Push Notifications</Text>
            <Text style={styles.settingDesc}>Get critical reminders and streak alerts</Text>
          </View>
          <Toggle
            value={settings.push_notifications}
            onValueChange={(v) => updateSetting('push_notifications', v)}
          />
        </View>

        {/* Notifications List */}
        <Text style={styles.sectionTitle}>Recent</Text>
        {displayList.map((notif) => (
          <TouchableOpacity
            key={notif.id}
            activeOpacity={0.7}
            onPress={() => markAsRead(notif.id)}
            style={[styles.notifCard, !notif.read && styles.notifUnread]}
          >
            <View style={[styles.notifIcon, { backgroundColor: (notif.color || Colors.primary) + '15' }]}>
              <Icon name={(notif.icon as any) || 'bell'} size={18} color={notif.color || Colors.primary} />
            </View>
            <View style={styles.notifContent}>
              <View style={styles.notifHeader}>
                <Text style={styles.notifTitle}>{notif.title}</Text>
                <Text style={styles.notifTime}>{notif.time}</Text>
              </View>
              <Text style={styles.notifMessage} numberOfLines={2}>
                {notif.message}
              </Text>
            </View>
            {!notif.read ? <View style={styles.unreadDot} /> : null}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingInfo: { flex: 1, marginRight: 16 },
  settingTitle: { ...Typography.body, fontWeight: '600', color: Colors.textPrimary },
  settingDesc: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  sectionTitle: {
    ...Typography.subtitle,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 24,
    marginBottom: 12,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.card,
    marginBottom: 10,
    ...Shadow.sm,
  },
  notifUnread: {
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primaryLight + '50',
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notifContent: { flex: 1 },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: { ...Typography.body, fontWeight: '600', color: Colors.textPrimary },
  notifTime: { ...Typography.caption, color: Colors.textTertiary },
  notifMessage: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 8,
  },
});

export default NotificationScreen;
