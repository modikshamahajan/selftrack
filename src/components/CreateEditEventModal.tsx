import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Shadow } from '../theme/spacing';
import {
  SpecialEvent,
  SpecialEventType,
  EventRecurrence,
  EventReminderAdvance,
  EVENT_TYPE_METAS,
  ADVANCE_NOTICE_LABELS,
  RECURRENCE_LABELS,
} from '../types/specialEvents';
import Toggle from './Toggle';

interface CreateEditEventModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (eventData: Omit<SpecialEvent, 'id' | 'createdAt'>) => void;
  initialEvent?: SpecialEvent | null;
  initialEventType?: SpecialEventType;
}

const QUICK_TIMES = ['09:00 AM', '12:00 PM', '02:30 PM', '06:00 PM', '08:00 PM'];

const CreateEditEventModal: React.FC<CreateEditEventModalProps> = ({
  visible,
  onClose,
  onSave,
  initialEvent,
  initialEventType,
}) => {
  const insets = useSafeAreaInsets();
  const [eventType, setEventType] = useState<SpecialEventType>(initialEventType || 'birthday');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [timeDisplay, setTimeDisplay] = useState('09:00 AM');
  const [repeat, setRepeat] = useState<EventRecurrence>('yearly');
  const [reminderAdvance, setReminderAdvance] = useState<EventReminderAdvance>('1_day_before');
  const [notes, setNotes] = useState('');
  const [locationOrLink, setLocationOrLink] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Automatic 2x Phone Alert State (Identical to Health Reminders)
  const [autoPhoneAlerts, setAutoPhoneAlerts] = useState(true);

  // Date selection state
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  useEffect(() => {
    if (initialEvent) {
      setEventType(initialEvent.type);
      setTitle(initialEvent.title);
      setDate(initialEvent.date);
      setRepeat(initialEvent.repeat);
      setReminderAdvance(initialEvent.reminderAdvance);
      setNotes(initialEvent.notes || '');
      setLocationOrLink(initialEvent.locationOrLink || '');
      setAutoPhoneAlerts(initialEvent.autoPhoneAlerts ?? initialEvent.sendSms ?? true);

      // Parse date
      if (initialEvent.date) {
        const parts = initialEvent.date.split('-');
        if (parts.length === 3) {
          setSelectedYear(parseInt(parts[0], 10));
          setSelectedMonth(parseInt(parts[1], 10));
          setSelectedDay(parseInt(parts[2], 10));
        }
      }

      // Parse time
      if (initialEvent.time) {
        const [hStr, mStr] = initialEvent.time.split(':');
        let h = parseInt(hStr, 10);
        const m = parseInt(mStr, 10) || 0;
        const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
        if (h > 12) h -= 12;
        if (h === 0) h = 12;
        const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
        setTime(initialEvent.time);
        setTimeDisplay(formatted);
      }
    } else {
      // Defaults for new event
      const d = new Date();
      d.setDate(d.getDate() + 1); // default tomorrow
      setSelectedYear(d.getFullYear());
      setSelectedMonth(d.getMonth() + 1);
      setSelectedDay(d.getDate());
      setTitle('');
      setNotes('');
      setLocationOrLink('');
      setEventType(initialEventType || 'birthday');
      setRepeat('yearly');
      setReminderAdvance('1_day_before');
      setTime('09:00');
      setTimeDisplay('09:00 AM');
      setAutoPhoneAlerts(true);
    }
    setErrorMsg('');
  }, [visible, initialEvent, initialEventType]);

  // Sync formatted date string
  useEffect(() => {
    const y = String(selectedYear);
    const m = String(selectedMonth).padStart(2, '0');
    const d = String(selectedDay).padStart(2, '0');
    setDate(`${y}-${m}-${d}`);
  }, [selectedYear, selectedMonth, selectedDay]);

  const currentMeta = EVENT_TYPE_METAS[eventType];

  const handleSelectType = (type: SpecialEventType) => {
    setEventType(type);
    const meta = EVENT_TYPE_METAS[type];
    if (!initialEvent) {
      setRepeat(meta.defaultRepeat);
      setReminderAdvance(meta.defaultAdvance);
    }
  };

  const handleQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setSelectedYear(d.getFullYear());
    setSelectedMonth(d.getMonth() + 1);
    setSelectedDay(d.getDate());
  };

  const handleSelectQuickTime = (qt: string) => {
    setTimeDisplay(qt);
    const [t, p] = qt.split(' ');
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr;
    if (p === 'PM' && h < 12) h += 12;
    if (p === 'AM' && h === 12) h = 0;
    const military = `${String(h).padStart(2, '0')}:${m}`;
    setTime(military);
  };

  const handleAdjustDate = (unit: 'year' | 'month' | 'day', amount: number) => {
    if (unit === 'year') {
      setSelectedYear((prev) => Math.max(2024, prev + amount));
    } else if (unit === 'month') {
      setSelectedMonth((prev) => {
        let next = prev + amount;
        if (next > 12) next = 1;
        if (next < 1) next = 12;
        return next;
      });
    } else if (unit === 'day') {
      const maxDays = new Date(selectedYear, selectedMonth, 0).getDate();
      setSelectedDay((prev) => {
        let next = prev + amount;
        if (next > maxDays) next = 1;
        if (next < 1) next = maxDays;
        return next;
      });
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      setErrorMsg('Please enter an event title');
      return;
    }

    onSave({
      title: title.trim(),
      type: eventType,
      date,
      time,
      repeat,
      reminderAdvance,
      notes: notes.trim() || undefined,
      locationOrLink: locationOrLink.trim() || undefined,
      enabled: true,
      autoPhoneAlerts,
      alertTimesCount: 2,
      sendSms: autoPhoneAlerts,
      smsFrequencyCount: 2,
      color: currentMeta.color,
      icon: currentMeta.icon,
    });
    onClose();
  };

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContainer, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                {initialEvent ? 'Edit Special Event' : 'Add Special Event'}
              </Text>
              <Text style={styles.subtitle}>
                Custom notifications for birthdays, anniversaries & meetings
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="x" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Event Type Grid */}
            <Text style={styles.sectionLabel}>Event Category</Text>
            <View style={styles.typeGrid}>
              {(Object.keys(EVENT_TYPE_METAS) as SpecialEventType[]).map((type) => {
                const meta = EVENT_TYPE_METAS[type];
                const isSelected = eventType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    activeOpacity={0.8}
                    style={[
                      styles.typeCard,
                      isSelected && {
                        borderColor: meta.color,
                        backgroundColor: meta.bgLight,
                      },
                    ]}
                    onPress={() => handleSelectType(type)}
                  >
                    <Text style={styles.typeEmoji}>{meta.emoji}</Text>
                    <Text
                      style={[
                        styles.typeText,
                        isSelected && { color: meta.color, fontWeight: '700' },
                      ]}
                    >
                      {meta.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Title Input */}
            <Text style={styles.sectionLabel}>Event Title *</Text>
            <View style={[styles.inputBox, errorMsg ? styles.inputBoxError : null]}>
              <Icon
                name={(currentMeta.icon as any) || 'calendar'}
                size={18}
                color={currentMeta.color}
                style={{ marginRight: 10 }}
              />
              <TextInput
                style={styles.textInput}
                placeholder={currentMeta.placeholder}
                placeholderTextColor={Colors.textTertiary}
                value={title}
                onChangeText={(t) => {
                  setTitle(t);
                  if (errorMsg) setErrorMsg('');
                }}
              />
            </View>
            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            {/* Date Selection */}
            <Text style={styles.sectionLabel}>Date</Text>
            {/* Quick chips */}
            <View style={styles.chipRow}>
              {[
                { label: 'Today', days: 0 },
                { label: 'Tomorrow', days: 1 },
                { label: 'In 3 Days', days: 3 },
                { label: 'In 1 Week', days: 7 },
              ].map((chip) => (
                <TouchableOpacity
                  key={chip.label}
                  activeOpacity={0.75}
                  style={styles.quickChip}
                  onPress={() => handleQuickDate(chip.days)}
                >
                  <Text style={styles.quickChipText}>{chip.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Interactive Day/Month/Year adjustment */}
            <View style={styles.dateSelectorCard}>
              <View style={styles.dateSelectorCol}>
                <Text style={styles.datePickerSub}>MONTH</Text>
                <View style={styles.pickerStepper}>
                  <TouchableOpacity onPress={() => handleAdjustDate('month', -1)} style={styles.stepperBtn}>
                    <Icon name="chevron-down" size={16} color={Colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.stepperVal}>{monthNames[selectedMonth - 1]}</Text>
                  <TouchableOpacity onPress={() => handleAdjustDate('month', 1)} style={styles.stepperBtn}>
                    <Icon name="chevron-up" size={16} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.dateSelectorDivider} />

              <View style={styles.dateSelectorCol}>
                <Text style={styles.datePickerSub}>DAY</Text>
                <View style={styles.pickerStepper}>
                  <TouchableOpacity onPress={() => handleAdjustDate('day', -1)} style={styles.stepperBtn}>
                    <Icon name="chevron-down" size={16} color={Colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.stepperVal}>{selectedDay}</Text>
                  <TouchableOpacity onPress={() => handleAdjustDate('day', 1)} style={styles.stepperBtn}>
                    <Icon name="chevron-up" size={16} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.dateSelectorDivider} />

              <View style={styles.dateSelectorCol}>
                <Text style={styles.datePickerSub}>YEAR</Text>
                <View style={styles.pickerStepper}>
                  <TouchableOpacity onPress={() => handleAdjustDate('year', -1)} style={styles.stepperBtn}>
                    <Icon name="chevron-down" size={16} color={Colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.stepperVal}>{selectedYear}</Text>
                  <TouchableOpacity onPress={() => handleAdjustDate('year', 1)} style={styles.stepperBtn}>
                    <Icon name="chevron-up" size={16} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Time Selection */}
            <Text style={styles.sectionLabel}>Time of Event</Text>
            <View style={styles.chipRow}>
              {QUICK_TIMES.map((qt) => {
                const isSelected = timeDisplay === qt;
                return (
                  <TouchableOpacity
                    key={qt}
                    activeOpacity={0.75}
                    style={[
                      styles.quickChip,
                      isSelected && { backgroundColor: currentMeta.color, borderColor: currentMeta.color },
                    ]}
                    onPress={() => handleSelectQuickTime(qt)}
                  >
                    <Text
                      style={[
                        styles.quickChipText,
                        isSelected && { color: '#FFFFFF', fontWeight: '700' },
                      ]}
                    >
                      {qt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Reminder Advance Notice */}
            <Text style={styles.sectionLabel}>Notify Me In Advance</Text>
            <View style={styles.optionsList}>
              {(Object.keys(ADVANCE_NOTICE_LABELS) as EventReminderAdvance[]).map((adv) => {
                const isSelected = reminderAdvance === adv;
                return (
                  <TouchableOpacity
                    key={adv}
                    activeOpacity={0.7}
                    style={[
                      styles.optionRow,
                      isSelected && { backgroundColor: currentMeta.bgLight, borderColor: currentMeta.color },
                    ]}
                    onPress={() => setReminderAdvance(adv)}
                  >
                    <View style={styles.optionLeft}>
                      <Icon
                        name={adv === 'at_time' ? 'clock' : 'bell'}
                        size={16}
                        color={isSelected ? currentMeta.color : Colors.textSecondary}
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={[
                          styles.optionText,
                          isSelected && { color: currentMeta.color, fontWeight: '700' },
                        ]}
                      >
                        {ADVANCE_NOTICE_LABELS[adv]}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioOuter,
                        isSelected && { borderColor: currentMeta.color },
                      ]}
                    >
                      {isSelected ? (
                        <View style={[styles.radioInner, { backgroundColor: currentMeta.color }]} />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Recurrence Selection */}
            <Text style={styles.sectionLabel}>Repeat Frequency</Text>
            <View style={styles.repeatRow}>
              {(Object.keys(RECURRENCE_LABELS) as EventRecurrence[]).map((rec) => {
                const isSelected = repeat === rec;
                return (
                  <TouchableOpacity
                    key={rec}
                    activeOpacity={0.75}
                    style={[
                      styles.repeatChip,
                      isSelected && {
                        backgroundColor: currentMeta.color,
                        borderColor: currentMeta.color,
                      },
                    ]}
                    onPress={() => setRepeat(rec)}
                  >
                    <Text
                      style={[
                        styles.repeatChipText,
                        isSelected && { color: '#FFFFFF', fontWeight: '700' },
                      ]}
                    >
                      {RECURRENCE_LABELS[rec]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Meeting link / location if meeting */}
            {eventType === 'meeting' ? (
              <>
                <Text style={styles.sectionLabel}>Meeting Link or Location (Optional)</Text>
                <View style={styles.inputBox}>
                  <Icon name="link" size={16} color={currentMeta.color} style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. https://meet.google.com/xyz or Room 402"
                    placeholderTextColor={Colors.textTertiary}
                    value={locationOrLink}
                    onChangeText={setLocationOrLink}
                  />
                </View>
              </>
            ) : null}

            {/* Notes */}
            <Text style={styles.sectionLabel}>Notes / Checklist (Optional)</Text>
            <View style={[styles.inputBox, { height: 75, alignItems: 'flex-start', paddingVertical: 10 }]}>
              <Icon name="file-text" size={16} color={Colors.textTertiary} style={{ marginRight: 10, marginTop: 2 }} />
              <TextInput
                style={[styles.textInput, { height: '100%' }]}
                placeholder="Gift ideas, surprise plans, or discussion items..."
                placeholderTextColor={Colors.textTertiary}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>

            {/* Automatic 2x Phone Alerts (Identical to Health Reminders) */}
            <View style={styles.autoAlertCard}>
              <View style={styles.autoAlertHeader}>
                <View style={styles.autoAlertIconBox}>
                  <Icon name="bell" size={16} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.autoAlertTitle}>Automatic 2x Phone Alerts</Text>
                  <Text style={styles.autoAlertSub}>
                    Delivered automatically to your phone just like daily health & habit notifications
                  </Text>
                </View>
                <Toggle
                  value={autoPhoneAlerts}
                  onValueChange={setAutoPhoneAlerts}
                  size="sm"
                />
              </View>

              {autoPhoneAlerts && (
                <View style={styles.autoTimelineBox}>
                  <View style={styles.autoTimelineItem}>
                    <View style={[styles.timelineDot, { backgroundColor: '#3B82F6' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timelineItemTitle}>Alert 1: Advance Heads-up</Text>
                      <Text style={styles.timelineItemSub}>
                        {ADVANCE_NOTICE_LABELS[reminderAdvance]} before the event
                      </Text>
                    </View>
                    <View style={styles.activeTag}>
                      <Text style={styles.activeTagText}>Auto 1/2</Text>
                    </View>
                  </View>

                  <View style={styles.timelineDivider} />

                  <View style={styles.autoTimelineItem}>
                    <View style={[styles.timelineDot, { backgroundColor: '#10B981' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timelineItemTitle}>Alert 2: Day-of Celebration</Text>
                      <Text style={styles.timelineItemSub}>
                        On event date at {timeDisplay} with wishes & celebration modal
                      </Text>
                    </View>
                    <View style={[styles.activeTag, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[styles.activeTagText, { color: '#166534' }]}>Auto 2/2</Text>
                    </View>
                  </View>

                  <View style={styles.autoNoticeBanner}>
                    <Icon name="check-circle" size={13} color="#047857" style={{ marginRight: 6 }} />
                    <Text style={styles.autoNoticeBannerText}>
                      No mobile number required. Scheduled seamlessly on your device.
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Notification Preview Card */}
            <Text style={styles.sectionLabel}>Alert Preview</Text>
            <View style={[styles.previewCard, { borderColor: currentMeta.color + '40' }]}>
              <View style={[styles.previewIconBox, { backgroundColor: currentMeta.bgLight }]}>
                <Text style={{ fontSize: 20 }}>{currentMeta.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewTitle}>
                  {currentMeta.label} Alert: {title.trim() || currentMeta.placeholder}
                </Text>
                <Text style={styles.previewDesc} numberOfLines={2}>
                  {reminderAdvance !== 'at_time'
                    ? `Reminder (${ADVANCE_NOTICE_LABELS[reminderAdvance]}): Occurs on ${monthNames[selectedMonth - 1]} ${selectedDay} at ${timeDisplay}. ${notes ? `(${notes})` : ''}`
                    : `Happening today at ${timeDisplay}! ${notes ? `Note: ${notes}` : ''}`}
                </Text>
                <View style={styles.previewBadgeRow}>
                  <Text style={[styles.previewBadge, { color: currentMeta.color }]}>
                    🔔 {ADVANCE_NOTICE_LABELS[reminderAdvance]}
                  </Text>
                  <Text style={[styles.previewBadge, { color: Colors.textTertiary }]}>
                    🔄 {RECURRENCE_LABELS[repeat]}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveBtn, { backgroundColor: currentMeta.color }]}
            >
              <Icon name="check" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.saveBtnText}>
                {initialEvent ? 'Save Changes' : 'Schedule Event'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    ...Shadow.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: {
    ...Typography.subtitle,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: Colors.backgroundGray,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sectionLabel: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  typeCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  typeEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  typeText: {
    ...Typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    height: 48,
  },
  inputBoxError: {
    borderColor: Colors.error,
  },
  textInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.textPrimary,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  quickChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickChipText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dateSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.xl,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  dateSelectorCol: {
    flex: 1,
    alignItems: 'center',
  },
  datePickerSub: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  pickerStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepperVal: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 42,
    textAlign: 'center',
  },
  dateSelectorDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E2E8F0',
  },
  optionsList: {
    gap: 8,
    marginBottom: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  repeatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  repeatChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  repeatChipText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: BorderRadius.xl,
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
    marginTop: 4,
  },
  previewIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  previewTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  previewDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  previewBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  previewBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.xl,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  saveBtnText: {
    ...Typography.body,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  autoAlertCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16,
    marginBottom: 8,
  },
  autoAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  autoAlertIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  autoAlertTitle: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  autoAlertSub: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  autoTimelineBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  autoTimelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  timelineItemTitle: {
    ...Typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  timelineItemSub: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  timelineDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#CBD5E1',
    marginLeft: 4.5,
    marginVertical: 4,
  },
  activeTag: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.full,
  },
  activeTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
  },
  autoNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 12,
  },
  autoNoticeBannerText: {
    ...Typography.caption,
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
  },
});

export default CreateEditEventModal;

