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
import { Alert } from 'react-native';
import { useHabitStore } from '../store/useHabitStore';

const HEADER_LEAF = require('../../assets/Images/headerleaf.png');

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

    const isDoneDisabled = !title.trim();

    const onSave = route.params?.onSave;

    const handleCancel = () => {
      navigation.goBack();
    };
    const handleDone = async () => {
        if (!title.trim()) {
            return Alert.alert('Habit name required', 'Please enter a habit title before saving.');
        }

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
        };

        try {
            if (existingHabit?.id) {
              await useHabitStore.getState().updateHabit(existingHabit.id, {
                name: title.trim(),
                icon,
                color,
                category,
                streak_target: streak,
              });
            } else {
              await useHabitStore.getState().addHabit({
                name: title.trim(),
                icon,
                color,
                category,
                streak_target: streak,
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
    marginBottom: 18,
    fontWeight: '500',
    paddingHorizontal: 20,
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
});

export default CreateEditHabitScreen;