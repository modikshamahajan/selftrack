import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Dimensions,
    Image,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
    Ionicons,
    MaterialCommunityIcons,
    FontAwesome5,
    Feather,
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert } from 'react-native';
import { useHabitStore } from '../store/useHabitStore';

const HEADER_LEAF = require('../../assets/Images/headerleaf.png');

const QUICK_TEMPLATES = [
  { name: 'Drink 2L Water', icon: 'droplet', color: '#2DCBC4', category: 'Health', streak: 21 },
  { name: 'Morning Meditation', icon: 'smile', color: '#9B6BFF', category: 'Mind', streak: 14 },
  { name: 'Read 20 Mins', icon: 'book-open', color: '#4C8DFF', category: 'Productivity', streak: 30 },
  { name: 'Daily Workout', icon: 'activity', color: '#FF4FA3', category: 'Health', streak: 21 },
  { name: 'Sleep 8 Hours', icon: 'moon', color: '#31C764', category: 'Lifestyle', streak: 7 },
  { name: 'Limit Screen Time', icon: 'zap', color: '#FF8A3D', category: 'Mind', streak: 14 },
];

const categories = [
    {
        label: 'Health',
        icon: <FontAwesome5 name="heartbeat" size={18} color="#31C764" />,
    },
    {
        label: 'Mind',
        icon: <MaterialCommunityIcons name="brain" size={18} color="#8B5CF6" />,
    },
    {
        label: 'Productivity',
        icon: <Feather name="briefcase" size={18} color="#3B82F6" />,
    },
    {
        label: 'Lifestyle',
        icon: <MaterialCommunityIcons name="trophy-outline" size={18} color="#F59E0B" />,
    },
];

const icons = [
  'droplet',
  'activity',
  'coffee',
  'book-open',
  'moon',
  'sun',
  'music',
  'target',
  'heart',
  'star',
  'smile',
  'zap',
  'edit-3',
  'headphones',
  'camera',
];

const colors = [
    '#31C764',
    '#4C8DFF',
    '#9B6BFF',
    '#FF4FA3',
    '#FF8A3D',
    '#2DCBC4',
];

const streakTargets = [3, 7, 14, 21, 30, 60, 90];

const CreateEditHabitScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const existingHabit = route.params?.habit;

    const [title, setTitle] = useState(existingHabit?.name ?? '');
    const [streak, setStreak] = useState(existingHabit?.streakTarget ?? 7);
    const [category, setCategory] = useState(existingHabit?.category ?? 'Health');
    const [icon, setIcon] = useState(existingHabit?.icon ?? 'droplet');
    const [color, setColor] = useState(existingHabit?.color ?? colors[0]);

    // Notification Frequency & Reminders State
    const [reminderEnabled, setReminderEnabled] = useState(existingHabit?.reminder_enabled ?? true);
    const [reminderFreq, setReminderFreq] = useState<'daily' | 'interval' | 'weekly' | 'smart'>(
        existingHabit?.reminder_frequency ?? 'daily'
    );
    const [reminderTime, setReminderTime] = useState(existingHabit?.reminder_time ?? '08:30 AM');
    const [reminderIntervalHours, setReminderIntervalHours] = useState(
        existingHabit?.reminder_interval_hours ?? 3
    );
    const [reminderIntervalUnit, setReminderIntervalUnit] = useState<'hours' | 'minutes'>(
        existingHabit?.reminder_interval_unit ?? 'hours'
    );
    const [reminderIntervalValue, setReminderIntervalValue] = useState<number>(
        existingHabit?.reminder_interval_value ?? (existingHabit?.reminder_interval_hours ?? 3)
    );
    const [selectedWeeklyDays, setSelectedWeeklyDays] = useState<string[]>(
        existingHabit?.reminder_weekly_days && existingHabit.reminder_weekly_days.length > 0
            ? existingHabit.reminder_weekly_days
            : ['Mon', 'Wed', 'Fri']
    );
    const [routineType, setRoutineType] = useState<'morning' | 'evening' | 'none'>(
        existingHabit?.routine_type ?? 'none'
    );

    const isDoneDisabled = !title.trim();

    const onSave = route.params?.onSave;

    const handleCancel = () => {
      navigation.goBack();
    };
    const handleDone = async () => {
        if (!title.trim()) {
            return Alert.alert('Habit name required', 'Please enter a habit title before saving.');
        }

        const calculatedIntervalHours = reminderIntervalUnit === 'hours'
            ? reminderIntervalValue
            : Math.max(1, Math.round(reminderIntervalValue / 60));

        const habitPayload = {
            id: existingHabit?.id ?? Date.now().toString(),
            name: title.trim(),
            icon,
            color,
            category,
            streak: existingHabit?.streak ?? 0,
            streakTarget: streak,
            completed: existingHabit?.completed ?? false,
            progress: existingHabit?.progress ?? 0,
            completedDays: existingHabit?.completedDays ?? {},
            reminder_enabled: reminderEnabled,
            reminder_frequency: reminderFreq,
            reminder_time: reminderTime,
            reminder_interval_hours: calculatedIntervalHours,
            reminder_interval_unit: reminderIntervalUnit,
            reminder_interval_value: reminderIntervalValue,
            reminder_weekly_days: selectedWeeklyDays,
            routine_type: routineType,
        };

        try {
            if (existingHabit?.id) {
              await useHabitStore.getState().updateHabit(existingHabit.id, {
                name: title.trim(),
                icon,
                color,
                category,
                streak_target: streak,
                reminder_enabled: reminderEnabled,
                reminder_frequency: reminderFreq,
                reminder_time: reminderTime,
                reminder_interval_hours: calculatedIntervalHours,
                reminder_interval_unit: reminderIntervalUnit,
                reminder_interval_value: reminderIntervalValue,
                reminder_weekly_days: selectedWeeklyDays,
                routine_type: routineType,
              });
            } else {
              await useHabitStore.getState().addHabit({
                name: title.trim(),
                icon,
                color,
                category,
                streak_target: streak,
                reminder_enabled: reminderEnabled,
                reminder_frequency: reminderFreq,
                reminder_time: reminderTime,
                reminder_interval_hours: calculatedIntervalHours,
                reminder_interval_unit: reminderIntervalUnit,
                reminder_interval_value: reminderIntervalValue,
                reminder_weekly_days: selectedWeeklyDays,
                routine_type: routineType,
              });
            }

            if (typeof onSave === 'function') {
              onSave(habitPayload);
            }
            navigation.goBack();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.detail || err.message || 'Failed to save habit');
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F7FAF8' }} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor="#F7FAF8" />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.container}
            >
                {/* TOP HEADER */}
                <View style={styles.topRow}>
                    <TouchableOpacity style={styles.roundButton} onPress={handleCancel}>
                        <Ionicons name="arrow-back" size={24} color="#0F172A" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.roundButton} onPress={handleCancel}>
                        <Ionicons name="close" size={24} color="#0F172A" />
                    </TouchableOpacity>
                </View>
                <Image source={HEADER_LEAF} style={styles.leafImage} />

                {/* TITLE */}
                <Text style={styles.heading}>
                    {existingHabit ? 'Edit Habit' : 'Create New Habit'}
                </Text>

                <Text style={styles.subHeading}>
                    {existingHabit ? 'Update your habit details' : 'Build a new habit, shape a better you'}
                </Text>

                {/* LIVE INTERACTIVE PREVIEW CARD */}
                <View style={styles.previewContainer}>
                    <LinearGradient
                        colors={[color, color + 'CC', color + '99']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.previewCard}
                    >
                        <View style={styles.previewTopRow}>
                            <View style={styles.previewBadge}>
                                <Text style={styles.previewBadgeText}>LIVE PREVIEW</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                <View style={styles.previewTargetBadge}>
                                    <Text style={styles.previewTargetText}>🎯 {streak} Days Goal</Text>
                                </View>
                                {reminderEnabled && (
                                    <View style={[styles.previewTargetBadge, { backgroundColor: 'rgba(255, 255, 255, 0.35)' }]}>
                                        <Text style={styles.previewTargetText}>
                                            🔔 {reminderFreq === 'smart' ? 'AI' : reminderFreq === 'interval' ? `${reminderIntervalValue}${reminderIntervalUnit === 'hours' ? 'h' : 'm'}` : reminderFreq === 'weekly' ? `${selectedWeeklyDays.length}d/wk` : reminderTime.split(' ')[0]}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.previewMainRow}>
                            <View style={styles.previewIconCircle}>
                                <Feather name={icon as any} size={24} color={color} />
                            </View>
                            <View style={styles.previewTextWrapper}>
                                <Text style={styles.previewHabitName} numberOfLines={1}>
                                    {title.trim() ? title : 'Your Habit Name'}
                                </Text>
                                <Text style={styles.previewCategoryText}>
                                    {category} • +{streak * 10} XP • {reminderEnabled ? (reminderFreq === 'smart' ? 'Adaptive Nudge' : reminderFreq === 'interval' ? `Every ${reminderIntervalHours}h` : `Daily ${reminderTime}`) : 'No Alerts'}
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* QUICK 1-TAP TEMPLATES (FOR NEW HABITS) */}
                {!existingHabit && (
                    <View style={styles.templatesSection}>
                        <View style={styles.templatesHeaderRow}>
                            <Feather name="zap" size={14} color="#059669" />
                            <Text style={styles.templatesHeaderTitle}>Quick 1-Tap Ideas</Text>
                        </View>
                        <View style={styles.templatesGrid}>
                            {QUICK_TEMPLATES.map((tpl) => {
                                const isSelected = title === tpl.name;
                                return (
                                    <TouchableOpacity
                                        key={tpl.name}
                                        activeOpacity={0.75}
                                        style={[
                                            styles.templateGridCard,
                                            isSelected && styles.templateGridCardActive,
                                        ]}
                                        onPress={() => {
                                            setTitle(tpl.name);
                                            setIcon(tpl.icon);
                                            setColor(tpl.color);
                                            setCategory(tpl.category);
                                            setStreak(tpl.streak);
                                        }}
                                    >
                                        <View style={[styles.templateIconCircle, { backgroundColor: tpl.color + '20' }]}>
                                            <Feather name={tpl.icon as any} size={15} color={tpl.color} />
                                        </View>
                                        <View style={styles.templateCardTextWrapper}>
                                            <Text style={[styles.templateCardTitle, isSelected && styles.templateCardTitleActive]} numberOfLines={1}>
                                                {tpl.name}
                                            </Text>
                                            <Text style={styles.templateCardMeta}>
                                                {tpl.category} • {tpl.streak}d
                                            </Text>
                                        </View>
                                        {isSelected && (
                                            <Feather name="check-circle" size={14} color="#059669" style={{ marginLeft: 4 }} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* MAIN CARD */}
                <View style={styles.card}>
                    {/* Habit Title */}
                    <View style={styles.section}>
                        <View style={styles.labelRow}>
                            <View style={styles.smallIconWrapper}>
                                <Feather name="edit-3" size={16} color="#31C764" />
                            </View>

                            <Text style={styles.label}>Habit Title</Text>
                        </View>

                        <View style={styles.inputWrapper}>
                            <TextInput
                                placeholder="e.g. Drink Water"
                                placeholderTextColor="#A0A6B1"
                                style={styles.input}
                                value={title}
                                onChangeText={setTitle}
                            />

                            <Text style={styles.counter}>{title.length}/40</Text>
                        </View>
                    </View>

                    {/* Streak */}
                    <View style={styles.section}>
                        <View style={styles.labelRow}>
                            <View style={styles.smallIconWrapper}>
                                <Ionicons name="flame-outline" size={16} color="#31C764" />
                            </View>

                            <Text style={styles.label}>Streak Target</Text>
                        </View>

                        <View style={styles.streakContainer}>
                            {streakTargets.map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    activeOpacity={0.8}
                                    style={[
                                        styles.streakBtn,
                                        streak === item && styles.activeStreakBtn,
                                    ]}
                                    onPress={() => setStreak(item)}
                                >
                                    <Text
                                        style={[
                                            styles.streakText,
                                            streak === item && styles.activeStreakText,
                                        ]}
                                    >
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.bottomStreakRow}>
                            <Text style={styles.streakInfo}>
                                Keep going! Build a strong streak.
                            </Text>

                            <View style={styles.consistencyBadge}>
                                <Text style={styles.consistencyText}>
                                    🔥 Build consistency
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Category */}
                    <View style={styles.section}>
                        <View style={styles.labelRow}>
                            <View style={styles.smallIconWrapper}>
                                <Ionicons name="grid-outline" size={16} color="#31C764" />
                            </View>

                            <Text style={styles.label}>Category</Text>
                        </View>

                        <View style={styles.categoryRow}>
                            {categories.map((cat) => {
                                const selected = category === cat.label;

                                return (
                                    <TouchableOpacity
                                        key={cat.label}
                                        activeOpacity={0.8}
                                        style={[
                                            styles.categoryBtn,
                                            selected && styles.activeCategoryBtn,
                                        ]}
                                        onPress={() => setCategory(cat.label)}
                                    >
                                        {cat.icon}

                                        <Text
                                            style={[
                                                styles.categoryText,
                                                selected && styles.activeCategoryText,
                                            ]}
                                        >
                                            {cat.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* ICONS */}
                    <View style={styles.section}>
                        <View style={styles.labelRow}>
                            <View style={styles.smallIconWrapper}>
                                <Ionicons name="happy-outline" size={16} color="#31C764" />
                            </View>

                            <Text style={styles.label}>Choose an Icon</Text>
                        </View>

                        <View style={styles.iconContainer}>
                            {icons.map((item) => {
                                const selected = icon === item;

                                return (
                                    <TouchableOpacity
                                        key={item}
                                        activeOpacity={0.8}
                                        style={[
                                            styles.iconCircle,
                                            selected && {
                                                backgroundColor: color,
                                                borderColor: color,
                                            },
                                        ]}
                                        onPress={() => setIcon(item)}
                                    >
                                        <Feather
                                            name={item as any}
                                            size={24}
                                            color={selected ? '#fff' : '#0F172A'}
                                        />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* COLORS */}
                    <View style={styles.section}>
                        <View style={styles.labelRow}>
                            <View style={styles.smallIconWrapper}>
                                <Ionicons name="color-palette-outline" size={16} color="#31C764" />
                            </View>

                            <Text style={styles.label}>Choose a Color</Text>
                        </View>

                        <View style={styles.colorRow}>
                            {colors.map((clr) => {
                                const selected = color === clr;
                                return (
                                    <TouchableOpacity
                                        key={clr}
                                        activeOpacity={0.8}
                                        style={[
                                            styles.colorOuter,
                                            selected && { borderColor: clr },
                                        ]}
                                        onPress={() => setColor(clr)}
                                    >
                                        <View
                                            style={[
                                                styles.colorInner,
                                                {
                                                    backgroundColor: clr,
                                                },
                                            ]}
                                        />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* NOTIFICATION FREQUENCY & SCHEDULE SECTION */}
                    <View style={[styles.section, { marginBottom: 10 }]}>
                        <View style={styles.labelRow}>
                            <View style={[styles.smallIconWrapper, { backgroundColor: '#EEF2FF' }]}>
                                <Ionicons name="notifications-outline" size={16} color="#6366F1" />
                            </View>
                            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={styles.label}>Reminder Schedule</Text>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    style={[styles.reminderToggleBtn, reminderEnabled && styles.reminderToggleBtnActive]}
                                    onPress={() => setReminderEnabled(!reminderEnabled)}
                                >
                                    <Text style={[styles.reminderToggleText, reminderEnabled && styles.reminderToggleTextActive]}>
                                        {reminderEnabled ? 'ON' : 'OFF'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {reminderEnabled && (
                            <View style={styles.reminderSettingsBox}>
                                <Text style={styles.reminderSectionSubtitle}>Choose Frequency</Text>
                                <View style={styles.freqPillRow}>
                                    {[
                                        { id: 'daily', label: 'Daily', icon: 'calendar' },
                                        { id: 'interval', label: 'Every X Hrs', icon: 'clock' },
                                        { id: 'weekly', label: 'Weekly', icon: 'repeat' },
                                        { id: 'smart', label: 'AI Smart', icon: 'zap' },
                                    ].map((f) => {
                                        const isSelected = reminderFreq === f.id;
                                        return (
                                            <TouchableOpacity
                                                key={f.id}
                                                activeOpacity={0.8}
                                                style={[styles.freqPill, isSelected && styles.freqPillActive]}
                                                onPress={() => setReminderFreq(f.id as any)}
                                            >
                                                <Feather
                                                    name={f.icon as any}
                                                    size={12}
                                                    color={isSelected ? '#FFF' : '#64748B'}
                                                    style={{ marginRight: 4 }}
                                                />
                                                <Text style={[styles.freqPillText, isSelected && styles.freqPillTextActive]}>
                                                    {f.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                {/* Conditional Frequency Controls */}
                                {reminderFreq === 'daily' && (
                                    <View style={styles.freqDetailCard}>
                                        <Text style={styles.freqDetailLabel}>Daily Alert Time</Text>
                                        <View style={styles.timePickerRow}>
                                            {['07:00 AM', '08:30 AM', '12:30 PM', '06:00 PM', '09:00 PM'].map((t) => (
                                                <TouchableOpacity
                                                    key={t}
                                                    style={[styles.timeChip, reminderTime === t && styles.timeChipActive]}
                                                    onPress={() => setReminderTime(t)}
                                                    activeOpacity={0.75}
                                                >
                                                    <Text style={[styles.timeChipText, reminderTime === t && styles.timeChipTextActive]}>
                                                        {t}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {reminderFreq === 'interval' && (
                                    <View style={styles.freqDetailCard}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <Text style={styles.freqDetailLabel}>Interval Window (Between 9 AM - 9 PM)</Text>
                                            <View style={{ flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 8, padding: 2 }}>
                                                <TouchableOpacity
                                                    style={[styles.unitToggleBtn, reminderIntervalUnit === 'hours' && styles.unitToggleBtnActive]}
                                                    onPress={() => {
                                                        setReminderIntervalUnit('hours');
                                                        setReminderIntervalValue(3);
                                                    }}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={[styles.unitToggleText, reminderIntervalUnit === 'hours' && styles.unitToggleTextActive]}>Hours</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.unitToggleBtn, reminderIntervalUnit === 'minutes' && styles.unitToggleBtnActive]}
                                                    onPress={() => {
                                                        setReminderIntervalUnit('minutes');
                                                        setReminderIntervalValue(30);
                                                    }}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={[styles.unitToggleText, reminderIntervalUnit === 'minutes' && styles.unitToggleTextActive]}>Minutes</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <View style={styles.timePickerRow}>
                                            {(reminderIntervalUnit === 'hours' ? [1, 2, 3, 4, 6] : [15, 30, 45, 60, 90]).map((val) => (
                                                <TouchableOpacity
                                                    key={val}
                                                    style={[styles.timeChip, reminderIntervalValue === val && styles.timeChipActive]}
                                                    onPress={() => setReminderIntervalValue(val)}
                                                    activeOpacity={0.75}
                                                >
                                                    <Text style={[styles.timeChipText, reminderIntervalValue === val && styles.timeChipTextActive]}>
                                                        Every {val} {reminderIntervalUnit === 'hours' ? (val === 1 ? 'hr' : 'hrs') : 'min'}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>

                                        {/* Custom interval numeric input */}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingHorizontal: 4 }}>
                                            <Text style={{ fontSize: 13, color: '#64748B', marginRight: 8, fontWeight: '500' }}>Custom value:</Text>
                                            <TextInput
                                                style={{
                                                    backgroundColor: '#FFF',
                                                    borderWidth: 1,
                                                    borderColor: '#CBD5E1',
                                                    borderRadius: 8,
                                                    paddingHorizontal: 10,
                                                    paddingVertical: 4,
                                                    fontSize: 13,
                                                    width: 65,
                                                    textAlign: 'center',
                                                    color: '#1E293B',
                                                    fontWeight: '700'
                                                }}
                                                keyboardType="numeric"
                                                value={String(reminderIntervalValue)}
                                                onChangeText={(txt) => {
                                                    const clean = txt.replace(/[^0-9]/g, '');
                                                    const parsed = parseInt(clean, 10);
                                                    if (!isNaN(parsed) && parsed > 0) {
                                                        setReminderIntervalValue(parsed);
                                                    } else if (clean === '') {
                                                        setReminderIntervalValue(1);
                                                    }
                                                }}
                                            />
                                            <Text style={{ fontSize: 13, color: '#334155', marginLeft: 8, fontWeight: '600' }}>
                                                {reminderIntervalUnit}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {reminderFreq === 'weekly' && (
                                    <View style={styles.freqDetailCard}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <Text style={styles.freqDetailLabel}>Target Routine Days</Text>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    if (selectedWeeklyDays.length === 7) {
                                                        setSelectedWeeklyDays(['Mon', 'Wed', 'Fri']);
                                                    } else {
                                                        setSelectedWeeklyDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
                                                    }
                                                }}
                                            >
                                                <Text style={{ fontSize: 12, color: '#4F46E5', fontWeight: '700' }}>
                                                    {selectedWeeklyDays.length === 7 ? 'Select Few' : 'Select All'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.timePickerRow}>
                                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                                                const isSelected = selectedWeeklyDays.includes(day);
                                                return (
                                                    <TouchableOpacity
                                                        key={day}
                                                        style={[styles.timeChip, isSelected && styles.timeChipActive]}
                                                        activeOpacity={0.7}
                                                        onPress={() => {
                                                            if (isSelected) {
                                                                if (selectedWeeklyDays.length > 1) {
                                                                    setSelectedWeeklyDays(selectedWeeklyDays.filter((d) => d !== day));
                                                                }
                                                            } else {
                                                                setSelectedWeeklyDays([...selectedWeeklyDays, day]);
                                                            }
                                                        }}
                                                    >
                                                        <Text style={[styles.timeChipText, isSelected && styles.timeChipTextActive]}>{day}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                        <Text style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>
                                            Active on: <Text style={{ fontWeight: '700', color: '#059669' }}>{selectedWeeklyDays.join(', ')}</Text>
                                        </Text>
                                    </View>
                                )}

                                {reminderFreq === 'smart' && (
                                    <View style={[styles.freqDetailCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                            <Feather name="zap" size={14} color="#16A34A" style={{ marginRight: 6 }} />
                                            <Text style={[styles.freqDetailLabel, { color: '#16A34A', marginBottom: 0 }]}>
                                                AI Smart Adaptive Timing
                                            </Text>
                                        </View>
                                        <Text style={styles.smartExplainerText}>
                                            SelfTrack AI learns when you naturally complete this habit and sends an optimal nudge right before your peak window without interrupting your flow.
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </View>

                {/* BUTTONS */}
                <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleDone}
                        disabled={!title.trim()}
                        style={[
                            styles.doneBtn,
                            {
                                backgroundColor: title.trim() ? color : '#CBD5E1',
                                opacity: title.trim() ? 1 : 0.7,
                            },
                        ]}
                    >
                        <Text style={styles.doneText}>{existingHabit ? 'Save' : 'Done'}</Text>

                        <Ionicons
                            name={existingHabit ? "save-outline" : "checkmark-circle"}
                            size={22}
                            color="#fff"
                            style={{ marginLeft: 8 }}
                        />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const { width } = Dimensions.get('window');

const ICON_SIZE = width / 8.8;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 30,
    backgroundColor: '#F7FAF8',
    flexGrow: 1,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  roundButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 6,

    elevation: 2,
  },

  leafImage: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginTop: 6,
  },

  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#07132B',
    textAlign: 'center',
    marginTop: 4,
  },

  subHeading: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 6,
    marginBottom: 14,
    fontWeight: '500',
    paddingHorizontal: 20,
  },

  /* ---------- LIVE PREVIEW CARD ---------- */
  previewContainer: {
    marginBottom: 16,
  },
  previewCard: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  previewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  previewBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  previewTargetBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  previewTargetText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  previewMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  previewTextWrapper: {
    flex: 1,
  },
  previewHabitName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  previewCategoryText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },

  /* ---------- QUICK TEMPLATES (RESPONSIVE GRID) ---------- */
  templatesSection: {
    marginBottom: 16,
  },
  templatesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  templatesHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  templateGridCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E9EDF3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  templateGridCardActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  templateIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  templateCardTextWrapper: {
    flex: 1,
  },
  templateCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  templateCardTitleActive: {
    color: '#059669',
  },
  templateCardMeta: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.03,
    shadowRadius: 10,

    elevation: 2,
  },

  section: {
    marginBottom: 22,
  },

  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  smallIconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ECFDF3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#07132B',
  },

  inputWrapper: {
    borderWidth: 1,
    borderColor: '#E9EDF3',
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 62,
    justifyContent: 'center',
  },

  input: {
    fontSize: 16,
    color: '#07132B',
    fontWeight: '500',
    paddingRight: 50,
  },

  counter: {
    position: 'absolute',
    right: 16,
    color: '#A0A6B1',
    fontSize: 12,
    bottom: 12,
  },

  /* ---------- STREAK ---------- */

  streakContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },

  streakBtn: {
    width: 42,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F5F7FB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeStreakBtn: {
    backgroundColor: '#31C764',
  },

  streakText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#07132B',
  },

  activeStreakText: {
    color: '#fff',
  },

  bottomStreakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  streakInfo: {
    color: '#6B7280',
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },

  consistencyBadge: {
    backgroundColor: '#ECFDF3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 8,
  },

  consistencyText: {
    color: '#31C764',
    fontWeight: '700',
    fontSize: 11,
  },

  /* ---------- CATEGORY ---------- */

  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },

  categoryBtn: {
    width: '48%',
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F5F7FB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  activeCategoryBtn: {
    borderWidth: 1.2,
    borderColor: '#31C764',
    backgroundColor: '#F3FFF7',
  },

  categoryText: {
    marginLeft: 6,
    color: '#667085',
    fontWeight: '600',
    fontSize: 13,
  },

  activeCategoryText: {
    color: '#31C764',
  },

  /* ---------- ICONS ---------- */

  iconContainer: {
    borderWidth: 1,
    borderColor: '#EEF2F6',
    borderRadius: 22,
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  iconCircle: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: '#F5F7FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  /* ---------- COLORS ---------- */

  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    flexWrap: 'wrap',
  },

  colorOuter: {
    width: 42,
    height: 42,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },

  colorInner: {
    width: 32,
    height: 32,
    borderRadius: 18,
  },

  /* ---------- BUTTONS ---------- */

  buttonRow: {
    flexDirection: 'row',
    marginTop: 22,
    marginBottom: 20,
  },

  cancelBtn: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.03,
    shadowRadius: 6,

    elevation: 2,
  },

  cancelText: {
    color: '#07132B',
    fontSize: 16,
    fontWeight: '700',
  },

  doneBtn: {
    flex: 2,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  doneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  /* ---------- REMINDER FREQUENCY & NOTIFICATIONS ---------- */
  reminderToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  reminderToggleBtnActive: {
    backgroundColor: '#059669',
  },
  reminderToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  reminderToggleTextActive: {
    color: '#FFFFFF',
  },
  reminderSettingsBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  reminderSectionSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  freqPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  freqPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  freqPillActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  freqPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  freqPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  freqDetailCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  freqDetailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  timePickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  timeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  timeChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  timeChipTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  smartExplainerText: {
    fontSize: 12,
    color: '#15803D',
    lineHeight: 17,
  },
  unitToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  unitToggleBtnActive: {
    backgroundColor: '#059669',
  },
  unitToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  unitToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default CreateEditHabitScreen;