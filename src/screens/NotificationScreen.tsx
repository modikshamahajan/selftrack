import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather as Icon } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Spacing, Shadow } from '../theme/spacing';
import { getScreenBgColor } from '../theme/screenBgColors';
import Header from '../components/Header';
import Toggle from '../components/Toggle';
import CreateEditEventModal from '../components/CreateEditEventModal';
import CelebrationModal from '../components/CelebrationModal';
import { useNotificationStore, AppNotification } from '../store/useNotificationStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useSpecialEventStore } from '../store/useSpecialEventStore';
import {
  SpecialEvent,
  SpecialEventType,
  EVENT_TYPE_METAS,
  ADVANCE_NOTICE_LABELS,
  RECURRENCE_LABELS,
} from '../types/specialEvents';
import {
  getEventCountdownLabel,
  getNextOccurrenceDate,
} from '../services/specialEvents';

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: '1',
    icon: 'gift',
    color: '#EC4899',
    title: 'Birthday Reminder',
    message: "Mom's Birthday is coming up in 3 days! Plan gifts & warm wishes 🎂",
    category: 'birthday',
    time: '10 min ago',
    read: false,
  },
  {
    id: '2',
    icon: 'briefcase',
    color: '#2563EB',
    title: 'Strategy Meeting',
    message: 'Product Strategy & Roadmap Sync starts tomorrow at 02:30 PM 💼',
    category: 'meeting',
    time: '1h ago',
    read: false,
  },
  {
    id: '3',
    icon: 'bell',
    color: Colors.primary,
    title: 'Habit Reminder',
    message: 'Time for your evening meditation! Keep your streak alive 🔥',
    category: 'habit',
    time: '2h ago',
    read: false,
  },
  {
    id: '4',
    icon: 'heart',
    color: '#E11D48',
    title: 'Anniversary Milestone',
    message: 'Happy 3rd Work Anniversary! Cheers to growth and resilience 💍✨',
    category: 'anniversary',
    time: '4h ago',
    read: true,
  },
  {
    id: '5',
    icon: 'star',
    color: '#8B5CF6',
    title: 'Special Occasion',
    message: 'Annual Tech & Wellness Gala invitation is confirmed for next week 🎉',
    category: 'occasion',
    time: 'Yesterday',
    read: true,
  },
];

type MainTab = 'inbox' | 'events';

const NotificationScreen: React.FC<{ navigation: any; route?: any }> = ({
  navigation,
  route,
}) => {
  const bgColor = getScreenBgColor('Notifications');
  const [activeTab, setActiveTab] = useState<MainTab>(
    route?.params?.initialTab === 'events' ? 'events' : 'inbox'
  );

  // Notifications State
  const { notifications, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const { settings, updateSetting } = useSettingsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [inboxFilter, setInboxFilter] = useState<'all' | 'events' | 'habits' | 'system'>('all');

  // Special Events State
  const {
    events,
    loadEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    toggleEvent,
    triggerTestNotification,
    triggerTestSms,
    selectedFilter,
    setSelectedFilter,
    getFilteredEvents,
    getStats,
  } = useSpecialEventStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SpecialEvent | null>(null);
  const [selectedCelebrationEvent, setSelectedCelebrationEvent] = useState<SpecialEvent | null>(null);
  const [optionsEvent, setOptionsEvent] = useState<SpecialEvent | null>(null);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
    loadEvents();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchNotifications(), loadEvents()]);
    setRefreshing(false);
  };

  const displayNotifications = notifications.length > 0 ? notifications : DEFAULT_NOTIFICATIONS;

  // Filtered Notifications for Inbox
  const filteredNotifications = useMemo(() => {
    if (inboxFilter === 'all') return displayNotifications;
    if (inboxFilter === 'events') {
      return displayNotifications.filter((n) =>
        ['birthday', 'anniversary', 'meeting', 'occasion', 'special_event'].includes(n.category)
      );
    }
    if (inboxFilter === 'habits') {
      return displayNotifications.filter((n) => n.category === 'habit');
    }
    return displayNotifications.filter((n) =>
      !['birthday', 'anniversary', 'meeting', 'occasion', 'special_event', 'habit'].includes(n.category)
    );
  }, [displayNotifications, inboxFilter]);

  const stats = getStats();
  const filteredEventsList = getFilteredEvents();

  // Highlighted event (today or upcoming in next 3 days)
  const spotlightEvent = useMemo(() => {
    const sorted = [...events].filter((e) => e.enabled).sort((a, b) => {
      return getNextOccurrenceDate(a).getTime() - getNextOccurrenceDate(b).getTime();
    });
    if (sorted.length === 0) return null;
    const first = sorted[0];
    const countdown = getEventCountdownLabel(first);
    if (countdown.isToday || countdown.label.includes('Tomorrow') || countdown.label.includes('In 2 days') || countdown.label.includes('In 3 days')) {
      return { event: first, countdown };
    }
    return null;
  }, [events]);

  const handleOpenAddModal = (presetType?: SpecialEventType) => {
    setEditingEvent(null);
    setModalVisible(true);
  };

  const handleOpenEditModal = (event: SpecialEvent) => {
    setEditingEvent(event);
    setModalVisible(true);
  };

  const handleDeleteEvent = (event: SpecialEvent) => {
    if (Platform.OS === 'web' && typeof (globalThis as any).confirm === 'function') {
      if ((globalThis as any).confirm(`Delete "${event.title}" reminder?`)) {
        deleteEvent(event.id);
      }
      return;
    }

    Alert.alert(
      'Delete Special Event',
      `Are you sure you want to delete "${event.title}"? Scheduled notifications will also be cancelled.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteEvent(event.id) },
      ]
    );
  };

  const handleTestAlert = async (event: SpecialEvent) => {
    await triggerTestNotification(event);
    setTestSuccessMessage(`Notification alert sent for "${event.title}"!`);
    setTimeout(() => {
      setTestSuccessMessage(null);
    }, 3500);
  };

  const handleTestSms = async (event: SpecialEvent) => {
    await triggerTestSms(event);
    setTestSuccessMessage(`Automated 2x phone alerts simulated for "${event.title}"! 🔔🎉`);
    setTimeout(() => {
      setTestSuccessMessage(null);
    }, 3500);
  };

  const handleSaveModal = async (eventData: Omit<SpecialEvent, 'id' | 'createdAt'>) => {
    if (editingEvent) {
      await updateEvent(editingEvent.id, eventData);
    } else {
      await addEvent(eventData);
    }
  };

  // Helper for notification category icon
  const getNotificationIconDetails = (cat: string, defaultIcon: string, defaultColor: string) => {
    if (cat === 'birthday') return { icon: 'gift', color: '#EC4899', emoji: '🎂' };
    if (cat === 'anniversary') return { icon: 'heart', color: '#E11D48', emoji: '💍' };
    if (cat === 'meeting') return { icon: 'briefcase', color: '#2563EB', emoji: '💼' };
    if (cat === 'occasion') return { icon: 'star', color: '#8B5CF6', emoji: '🎉' };
    return { icon: defaultIcon || 'bell', color: defaultColor || Colors.primary, emoji: '🔔' };
  };

  return (
    <SafeAreaView edges={['bottom']} style={[styles.container, { backgroundColor: bgColor }]}>
      <Header
        title="Notifications & Events"
        onBack={() => navigation.goBack()}
        rightAction={
          activeTab === 'inbox' ? (
            <TouchableOpacity
              onPress={() => markAllAsRead()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.headerActionBtn}
            >
              <Icon name="check-circle" size={18} color={Colors.primary} />
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Main Tab Segmented Controller */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'inbox' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('inbox')}
          activeOpacity={0.8}
        >
          <Icon
            name="bell"
            size={16}
            color={activeTab === 'inbox' ? Colors.primary : Colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.segmentText, activeTab === 'inbox' && styles.segmentTextActive]}>
            Activity Inbox
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'events' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('events')}
          activeOpacity={0.8}
        >
          <Icon
            name="calendar"
            size={16}
            color={activeTab === 'events' ? Colors.primary : Colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.segmentText, activeTab === 'events' && styles.segmentTextActive]}>
            Special Events
          </Text>
          {stats.upcomingNext7Days > 0 ? (
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{stats.upcomingNext7Days}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Feedback Toast Banner */}
      {testSuccessMessage ? (
        <View style={styles.toastBanner}>
          <Icon name="check" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.toastBannerText}>{testSuccessMessage}</Text>
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {/* ===================== TAB 1: INBOX ===================== */}
        {activeTab === 'inbox' && (
          <View>
            {/* Notification Delivery Settings */}
            <View style={styles.settingsCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Push Notifications</Text>
                  <Text style={styles.settingDesc}>Get critical reminders and event notifications</Text>
                </View>
                <Toggle
                  value={settings.push_notifications}
                  onValueChange={(v) => updateSetting('push_notifications', v)}
                />
              </View>

              <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Smart Event Reminders</Text>
                  <Text style={styles.settingDesc}>Alerts for birthdays, anniversaries & meetings</Text>
                </View>
                <Toggle
                  value={settings.ai_suggestions}
                  onValueChange={(v) => updateSetting('ai_suggestions', v)}
                />
              </View>
            </View>

            {/* Quick jump banner to Special Events */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.eventsShortcutBanner}
              onPress={() => setActiveTab('events')}
            >
              <View style={styles.eventsShortcutLeft}>
                <Text style={{ fontSize: 24, marginRight: 10 }}>🎂</Text>
                <View>
                  <Text style={styles.eventsShortcutTitle}>Special Events Calendar</Text>
                  <Text style={styles.eventsShortcutSubtitle}>
                    {stats.total} scheduled • {stats.birthdays} birthdays, {stats.anniversaries} anniversaries, {stats.meetings} meetings
                  </Text>
                </View>
              </View>
              <Icon name="chevron-right" size={18} color={Colors.primary} />
            </TouchableOpacity>

            {/* Inbox Filter Chips */}
            <View style={styles.filterChipScroll}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'events', label: '🎉 Events & Occasions' },
                  { id: 'habits', label: '⚡ Habits' },
                  { id: 'system', label: '🔔 System & Streaks' },
                ].map((chip) => {
                  const isSelected = inboxFilter === chip.id;
                  return (
                    <TouchableOpacity
                      key={chip.id}
                      activeOpacity={0.75}
                      style={[styles.filterChip, isSelected && styles.filterChipActive]}
                      onPress={() => setInboxFilter(chip.id as any)}
                    >
                      <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                        {chip.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Notifications List */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Notifications</Text>
              <Text style={styles.sectionCountText}>{filteredNotifications.length} items</Text>
            </View>

            {filteredNotifications.length === 0 ? (
              <View style={styles.emptyInbox}>
                <Icon name="bell-off" size={36} color={Colors.textTertiary} />
                <Text style={styles.emptyTitle}>No Notifications</Text>
                <Text style={styles.emptySubtitle}>You're all caught up with your updates!</Text>
              </View>
            ) : (
              filteredNotifications.map((notif) => {
                const iconDetails = getNotificationIconDetails(notif.category, notif.icon, notif.color);
                return (
                  <TouchableOpacity
                    key={notif.id}
                    activeOpacity={0.7}
                    onPress={() => markAsRead(notif.id)}
                    style={[styles.notifCard, !notif.read && styles.notifUnread]}
                  >
                    <View style={[styles.notifIcon, { backgroundColor: iconDetails.color + '15' }]}>
                      {['birthday', 'anniversary', 'meeting', 'occasion'].includes(notif.category) ? (
                        <Text style={{ fontSize: 18 }}>{iconDetails.emoji}</Text>
                      ) : (
                        <Icon name={(iconDetails.icon as any) || 'bell'} size={18} color={iconDetails.color} />
                      )}
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
                );
              })
            )}
          </View>
        )}

        {/* ===================== TAB 2: SPECIAL EVENTS ===================== */}
        {activeTab === 'events' && (
          <View>
            {/* Spotlight Banner if upcoming event exists */}
            {spotlightEvent ? (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => setSelectedCelebrationEvent(spotlightEvent.event)}
                style={[styles.spotlightCard, { borderColor: spotlightEvent.event.color + '40' }]}
              >
                <View style={[styles.spotlightIcon, { backgroundColor: spotlightEvent.event.color + '20' }]}>
                  <Text style={{ fontSize: 26 }}>
                    {EVENT_TYPE_METAS[spotlightEvent.event.type]?.emoji || '🎉'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.spotlightTopRow}>
                    <Text style={styles.spotlightBadge}>
                      {spotlightEvent.countdown.isToday ? "🎉 TODAY'S SPECIAL EVENT" : 'UPCOMING EVENT'}
                    </Text>
                    <View style={[styles.countdownPill, spotlightEvent.countdown.isToday && styles.countdownPillToday]}>
                      <Text
                        style={[
                          styles.countdownPillText,
                          spotlightEvent.countdown.isToday && styles.countdownPillTextToday,
                        ]}
                      >
                        {spotlightEvent.countdown.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.spotlightTitle} numberOfLines={1}>
                    {spotlightEvent.event.title}
                  </Text>
                  <Text style={styles.spotlightDesc} numberOfLines={2}>
                    {spotlightEvent.event.notes || `Reminder set for ${spotlightEvent.event.time} (${ADVANCE_NOTICE_LABELS[spotlightEvent.event.reminderAdvance]})`}
                  </Text>
                  <View style={styles.spotlightActionRow}>
                    <View style={styles.celebratePillBtn}>
                      <Text style={styles.celebratePillBtnText}>🎉 Tap to Celebrate</Text>
                    </View>
                    {spotlightEvent.event.sendSms ? (
                      <View style={[styles.celebratePillBtn, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                        <Text style={[styles.celebratePillBtnText, { color: '#059669' }]}>
                          📱 {spotlightEvent.event.smsFrequencyCount || 1}x SMS
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            ) : null}

            {/* Quick Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>🎂</Text>
                <Text style={styles.statNumber}>{stats.birthdays}</Text>
                <Text style={styles.statLabel}>Birthdays</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>💍</Text>
                <Text style={styles.statNumber}>{stats.anniversaries}</Text>
                <Text style={styles.statLabel}>Anniversaries</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>💼</Text>
                <Text style={styles.statNumber}>{stats.meetings}</Text>
                <Text style={styles.statLabel}>Meetings</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>🎉</Text>
                <Text style={styles.statNumber}>{stats.occasions}</Text>
                <Text style={styles.statLabel}>Occasions</Text>
              </View>
            </View>

            {/* Filter Pills */}
            <View style={styles.filterChipScroll}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {[
                  { id: 'all', label: `All (${stats.total})` },
                  { id: 'birthday', label: `🎂 Birthdays (${stats.birthdays})` },
                  { id: 'anniversary', label: `💍 Anniversaries (${stats.anniversaries})` },
                  { id: 'meeting', label: `💼 Meetings (${stats.meetings})` },
                  { id: 'occasion', label: `🎉 Occasions (${stats.occasions})` },
                ].map((chip) => {
                  const isSelected = selectedFilter === chip.id;
                  return (
                    <TouchableOpacity
                      key={chip.id}
                      activeOpacity={0.75}
                      style={[styles.filterChip, isSelected && styles.filterChipActive]}
                      onPress={() => setSelectedFilter(chip.id as any)}
                    >
                      <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                        {chip.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Events List */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Scheduled Events</Text>
              <Text style={styles.sectionCountText}>{filteredEventsList.length} total</Text>
            </View>

            {filteredEventsList.length === 0 ? (
              <View style={styles.emptyEventsBox}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>🗓️</Text>
                <Text style={styles.emptyTitle}>No Events in this Category</Text>
                <Text style={styles.emptySubtitle}>
                  Add your upcoming birthdays, anniversaries, and meetings so you never miss a special moment!
                </Text>
                <View style={styles.quickPresetGrid}>
                  <TouchableOpacity
                    style={styles.presetChip}
                    onPress={() => handleOpenAddModal('birthday')}
                  >
                    <Text style={styles.presetChipText}>+ Add Birthday 🎂</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.presetChip}
                    onPress={() => handleOpenAddModal('anniversary')}
                  >
                    <Text style={styles.presetChipText}>+ Add Anniversary 💍</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.presetChip}
                    onPress={() => handleOpenAddModal('meeting')}
                  >
                    <Text style={styles.presetChipText}>+ Add Meeting 💼</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.presetChip}
                    onPress={() => handleOpenAddModal('occasion')}
                  >
                    <Text style={styles.presetChipText}>+ Add Occasion 🎉</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              filteredEventsList.map((evt) => {
                const meta = EVENT_TYPE_METAS[evt.type] || EVENT_TYPE_METAS.occasion;
                const countdown = getEventCountdownLabel(evt);

                return (
                  <View
                    key={evt.id}
                    style={[styles.eventCard, !evt.enabled && styles.eventCardDisabled]}
                  >
                    {/* Header Row: Category Badge + Countdown + Options Menu */}
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.categoryTag, { backgroundColor: meta.bgLight }]}>
                        <Text style={{ fontSize: 13, marginRight: 5 }}>{meta.emoji}</Text>
                        <Text style={[styles.categoryTagText, { color: meta.color }]}>
                          {meta.label}
                        </Text>
                      </View>

                      <View style={styles.cardHeaderRight}>
                        <View
                          style={[
                            styles.countdownPill,
                            countdown.isToday && styles.countdownPillToday,
                          ]}
                        >
                          <Text
                            style={[
                              styles.countdownPillText,
                              countdown.isToday && styles.countdownPillTextToday,
                            ]}
                          >
                            {countdown.label}
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => setOptionsEvent(evt)}
                          style={styles.moreOptionsBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Icon name="more-horizontal" size={18} color={Colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Card Body */}
                    <View style={styles.cardBody}>
                      <Text style={styles.eventTitle} numberOfLines={2}>
                        {evt.title}
                      </Text>

                      {/* Single Unified Meta Row */}
                      <View style={styles.unifiedMetaRow}>
                        <View style={styles.metaItem}>
                          <Icon name="calendar" size={12} color={Colors.textSecondary} style={{ marginRight: 4 }} />
                          <Text style={styles.metaItemText}>
                            📅 {evt.date} • {evt.time}
                          </Text>
                        </View>

                        <View style={styles.metaItem}>
                          <Icon name="repeat" size={12} color={Colors.textSecondary} style={{ marginRight: 4 }} />
                          <Text style={styles.metaItemText}>
                            {RECURRENCE_LABELS[evt.repeat]}
                          </Text>
                        </View>

                        {evt.autoPhoneAlerts ?? evt.sendSms ?? true ? (
                          <View style={[styles.metaItem, styles.metaItemSms]}>
                            <Icon name="bell" size={11} color="#059669" style={{ marginRight: 3 }} />
                            <Text style={styles.metaItemTextSms}>
                              🔔 2x Auto Alerts
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Notes snippet or link */}
                      {evt.notes ? (
                        <View style={styles.cardNotesBox}>
                          <Icon name="file-text" size={12} color={Colors.textTertiary} style={{ marginRight: 6, marginTop: 1 }} />
                          <Text style={styles.cardNotesText} numberOfLines={2}>
                            {evt.notes}
                          </Text>
                        </View>
                      ) : null}

                      {evt.locationOrLink ? (
                        <View style={styles.cardLinkBox}>
                          <Icon name="link" size={12} color={Colors.primary} style={{ marginRight: 6 }} />
                          <Text style={styles.cardLinkText} numberOfLines={1}>
                            {evt.locationOrLink}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Single Clean Primary Action Footer */}
                    <TouchableOpacity
                      style={styles.cardCelebratePillBtn}
                      onPress={() => setSelectedCelebrationEvent(evt)}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 15, marginRight: 6 }}>🎉</Text>
                      <Text style={styles.cardCelebratePillText}>Celebrate & View Wishes</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Event Modal */}
      <CreateEditEventModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveModal}
        initialEvent={editingEvent}
      />

      {/* Celebrative On-Screen Modal */}
      <CelebrationModal
        visible={Boolean(selectedCelebrationEvent)}
        event={selectedCelebrationEvent}
        onClose={() => setSelectedCelebrationEvent(null)}
        onViewEvent={() => {
          setSelectedCelebrationEvent(null);
        }}
      />

      {/* Options Menu Modal */}
      <Modal
        visible={!!optionsEvent}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsEvent(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setOptionsEvent(null)}
        >
          <View style={styles.optionsSheetContainer}>
            {optionsEvent && (
              <>
                <View style={styles.optionsSheetHeader}>
                  <View style={styles.optionsSheetHeaderLeft}>
                    <Text style={{ fontSize: 24, marginRight: 10 }}>
                      {EVENT_TYPE_METAS[optionsEvent.type]?.emoji || '🎉'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionsSheetTitle} numberOfLines={1}>
                        {optionsEvent.title}
                      </Text>
                      <Text style={styles.optionsSheetSubtitle}>
                        {optionsEvent.date} • {optionsEvent.time}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setOptionsEvent(null)}
                    style={styles.optionsCloseBtn}
                  >
                    <Icon name="x" size={18} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.optionsActionList}>
                  <TouchableOpacity
                    style={styles.optionsActionRow}
                    onPress={() => {
                      const evt = optionsEvent;
                      setOptionsEvent(null);
                      handleTestAlert(evt);
                    }}
                  >
                    <View style={[styles.optionsActionIcon, { backgroundColor: '#EFF6FF' }]}>
                      <Icon name="bell" size={16} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionsActionText}>Test Notification Alert</Text>
                      <Text style={styles.optionsActionSub}>Send instant in-app & device push</Text>
                    </View>
                    <Icon name="chevron-right" size={16} color={Colors.textTertiary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.optionsActionRow}
                    onPress={() => {
                      const evt = optionsEvent;
                      setOptionsEvent(null);
                      handleTestSms(evt);
                    }}
                  >
                    <View style={[styles.optionsActionIcon, { backgroundColor: '#ECFDF5' }]}>
                      <Icon name="bell" size={16} color="#059669" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionsActionText}>Test 2x Automated Phone Alerts</Text>
                      <Text style={styles.optionsActionSub}>
                        Preview Advance heads-up + Day-of Celebration phone alerts
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={16} color={Colors.textTertiary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.optionsActionRow}
                    onPress={() => {
                      const evt = optionsEvent;
                      setOptionsEvent(null);
                      handleOpenEditModal(evt);
                    }}
                  >
                    <View style={[styles.optionsActionIcon, { backgroundColor: '#F8FAFC' }]}>
                      <Icon name="edit-2" size={16} color={Colors.textPrimary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionsActionText}>Edit Event Details</Text>
                      <Text style={styles.optionsActionSub}>Update date, time, notes, repeat or SMS</Text>
                    </View>
                    <Icon name="chevron-right" size={16} color={Colors.textTertiary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.optionsActionRow}
                    onPress={() => {
                      toggleEvent(optionsEvent.id);
                      setOptionsEvent({ ...optionsEvent, enabled: !optionsEvent.enabled });
                    }}
                  >
                    <View
                      style={[
                        styles.optionsActionIcon,
                        { backgroundColor: optionsEvent.enabled ? '#FEF3C7' : '#E2E8F0' },
                      ]}
                    >
                      <Icon
                        name={optionsEvent.enabled ? 'pause' : 'play'}
                        size={16}
                        color={optionsEvent.enabled ? '#D97706' : '#64748B'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionsActionText}>
                        {optionsEvent.enabled ? 'Pause Reminder' : 'Resume Reminder'}
                      </Text>
                      <Text style={styles.optionsActionSub}>
                        {optionsEvent.enabled ? 'Temporarily mute notifications' : 'Reactivate scheduled alerts'}
                      </Text>
                    </View>
                    <Toggle
                      value={optionsEvent.enabled}
                      onValueChange={() => {
                        toggleEvent(optionsEvent.id);
                        setOptionsEvent({ ...optionsEvent, enabled: !optionsEvent.enabled });
                      }}
                      size="sm"
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.optionsActionRow, { borderBottomWidth: 0 }]}
                    onPress={() => {
                      const evt = optionsEvent;
                      setOptionsEvent(null);
                      handleDeleteEvent(evt);
                    }}
                  >
                    <View style={[styles.optionsActionIcon, { backgroundColor: '#FEE2E2' }]}>
                      <Icon name="trash-2" size={16} color={Colors.error} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionsActionText, { color: Colors.error }]}>
                        Delete Event
                      </Text>
                      <Text style={styles.optionsActionSub}>Permanently cancel this event</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Single Floating Action Button (FAB) for Scheduling New Events */}
      {activeTab === 'events' && (
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.fabBtn}
          onPress={() => handleOpenAddModal()}
        >
          <Icon name="plus" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.fabBtnText}>New Event</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerActionBtn: {
    padding: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: BorderRadius.xl,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    ...Shadow.sm,
  },
  segmentText: {
    ...Typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  badgeCount: {
    marginLeft: 6,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    marginHorizontal: 20,
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.lg,
    ...Shadow.sm,
  },
  toastBannerText: {
    ...Typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 16,
    marginBottom: 12,
    ...Shadow.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingInfo: { flex: 1, marginRight: 16 },
  settingTitle: { ...Typography.body, fontWeight: '600', color: Colors.textPrimary },
  settingDesc: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  eventsShortcutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: BorderRadius.xl,
    padding: 14,
    marginBottom: 16,
  },
  eventsShortcutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eventsShortcutTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: '#92400E',
  },
  eventsShortcutSubtitle: {
    ...Typography.caption,
    color: '#B45309',
    marginTop: 2,
  },
  filterChipScroll: {
    marginBottom: 12,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    ...Typography.subtitle,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionCountText: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  emptyInbox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
  },
  emptyTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 10,
  },
  emptySubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
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
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: Colors.primaryLight + '50',
  },
  notifIcon: {
    width: 42,
    height: 42,
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

  /* Special Events Tab Styles */
  spotlightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 14,
    ...Shadow.sm,
  },
  spotlightIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  spotlightTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  spotlightBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.6,
  },
  spotlightTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  spotlightDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  countdownPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: BorderRadius.full,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  countdownPillToday: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  countdownPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  countdownPillTextToday: {
    color: '#B45309',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    paddingVertical: 12,
    alignItems: 'center',
    ...Shadow.sm,
  },
  statEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  statNumber: {
    ...Typography.body,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  addEventPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: BorderRadius.xl,
    marginBottom: 14,
    ...Shadow.md,
  },
  addEventPrimaryBtnText: {
    ...Typography.body,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyEventsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: 24,
    ...Shadow.sm,
  },
  quickPresetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    justifyContent: 'center',
  },
  presetChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: BorderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  presetChipText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.sm,
    overflow: 'hidden',
  },
  eventCardDisabled: {
    opacity: 0.65,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.full,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moreOptionsBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  eventTitle: {
    ...Typography.body,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  unifiedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.full,
  },
  metaItemText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  metaItemSms: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  metaItemTextSms: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  cardNotesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: BorderRadius.md,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  cardNotesText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  cardLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  cardLinkText: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  cardCelebratePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF5FF',
    borderTopWidth: 1,
    borderTopColor: '#F3E8FF',
    paddingVertical: 11,
  },
  cardCelebratePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
  },
  spotlightActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  celebratePillBtn: {
    backgroundColor: '#FAF5FF',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  celebratePillBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
  },

  /* Floating Action Button (FAB) */
  fabBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: BorderRadius.full,
    ...Shadow.lg,
    elevation: 8,
    zIndex: 99,
  },
  fabBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* Options Modal / Action Sheet */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  optionsSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    ...Shadow.lg,
  },
  optionsSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  optionsSheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  optionsSheetTitle: {
    ...Typography.body,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  optionsSheetSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  optionsCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsActionList: {
    marginTop: 4,
  },
  optionsActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  optionsActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionsActionText: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  optionsActionSub: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 1,
  },
});

export default NotificationScreen;
