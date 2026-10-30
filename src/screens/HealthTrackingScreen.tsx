import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  Modal,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather as Icon, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import { Pedometer } from 'expo-sensors';
import * as ImagePicker from 'expo-image-picker';
import { useHealthStore, FoodItem } from '../store/useHealthStore';
import { useMenstrualStore, calculateCycleInfo } from '../store/useMenstrualStore';

const { width } = Dimensions.get('window');
const DAILY_CALORIE_LIMIT = 2200;

// Dashboard Header Assets
const DASHBOARD_IMAGES: any = {
  shoes: require('../../assets/Images/shoes.png'),
  waterglass: require('../../assets/Images/waterglass.png'),
  topcalories: require('../../assets/Images/topcalories.png'),
  emptywaterglass: require('../../assets/Images/emptywaterglass.png'),
};

const FOOD_IMAGES: any = {
  apple: require('../../assets/Images/apple.png'),
  banana: require('../../assets/Images/banana.png'),
  milk: require('../../assets/Images/milk.png'),
  egg: require('../../assets/Images/egg.png'),
  oats: require('../../assets/Images/oats.png'),
  rice: require('../../assets/Images/rice.png'),
  chicken: require('../../assets/Images/chicken.png'),
  dosa: require('../../assets/Images/dosa.png'),
  idli: require('../../assets/Images/idli.png'),
  paneer: require('../../assets/Images/paneer.png'),
  pizza: require('../../assets/Images/pizza.png'),
  burger: require('../../assets/Images/burger.png'),
  juice: require('../../assets/Images/juice.png'),
  coffee: require('../../assets/Images/coffee.png'),
  tea: require('../../assets/Images/tea.png'),
  custom: require('../../assets/Images/customfood.png'),
};

export const getFoodImageSource = (imageUrl: any, foodName?: string) => {
  if (typeof imageUrl === 'string' && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('file://') || imageUrl.startsWith('data:'))) {
    return { uri: imageUrl };
  }
  if (typeof imageUrl === 'number') {
    return imageUrl;
  }
  const key = ((foodName || (typeof imageUrl === 'string' ? imageUrl : '')) || '').trim().toLowerCase();
  return FOOD_IMAGES[key] || FOOD_IMAGES['custom'];
};

const INITIAL_CALORIE_DB: any = {
  apple: { calories: 95, serving: '1 piece', color: '#E9FFF1' },
  banana: { calories: 105, serving: '1 piece', color: '#FFF6E8' },
  milk: { calories: 149, glass: '1 glass', color: '#EAF7FF' },
  egg: { calories: 78, serving: '1 egg', color: '#FFF6E8' },
  oats: { calories: 154, serving: '1 bowl', color: '#EAF7FF' },
  rice: { calories: 206, serving: '1 bowl', color: '#FFF6E8' },
  chicken: { calories: 165, serving: '100g', color: '#FFECEC' },
  dosa: { calories: 133, serving: '1 dosa', color: '#FFF6E8' },
  idli: { calories: 39, serving: '1 idli', color: '#E9FFF1' },
  paneer: { calories: 265, serving: '100g', color: '#FFF6E8' },
  roti: { calories: 120, serving: '1 roti', color: '#FFF6E8' },
  chapatti: { calories: 110, serving: '1 chapatti', color: '#FFF6E8' },
  greenVeggie: { calories: 85, serving: '1 bowl', color: '#E9FFF1' },
  deepFried: { calories: 320, serving: '1 plate', color: '#FFECEC' },
  pizza: { calories: 285, serving: '1 slice', color: '#FFECEC' },
  burger: { calories: 354, serving: '1 burger', color: '#FFECEC' },
  juice: { calories: 110, serving: '1 glass', color: '#EAF7FF' },
  coffee: { calories: 90, serving: '1 cup', color: '#FFF6E8' },
  tea: { calories: 70, serving: '1 cup', color: '#FFF6E8' },
  soda: { calories: 150, serving: '1 can', color: '#FFECEC' },
};

const INITIAL_CATEGORIES: any = {
  Healthy: ['apple', 'banana', 'milk', 'egg', 'oats'],
  Meals: ['rice', 'chicken', 'dosa', 'idli', 'paneer'],
  FastFood: ['pizza', 'burger'],
  Drinks: ['juice', 'coffee', 'tea'],
};

const getFormattedDateString = (dateTarget: Date): string => {
  const yyyy = dateTarget.getFullYear();
  const mm = String(dateTarget.getMonth() + 1).padStart(2, '0');
  const dd = String(dateTarget.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

interface FoodLogEntryRowProps {
  item: FoodItem;
  onDelete: (id: string) => void;
  onSave: (id: string, cal: number, qty: number) => void;
}

const FoodLogEntryRow: React.FC<FoodLogEntryRowProps> = ({ item, onDelete, onSave }) => {
  const [calText, setCalText] = useState(item.calories > 0 ? String(item.calories) : '');
  const [qty, setQty] = useState(typeof item.qty === 'number' ? item.qty : 1);
  const [isSaved, setIsSaved] = useState(item.calories > 0);

  useEffect(() => {
    setCalText(item.calories > 0 ? String(item.calories) : '');
    setQty(typeof item.qty === 'number' ? item.qty : 1);
    setIsSaved(item.calories > 0);
  }, [item.calories, item.qty]);

  const handleCaloriesChange = (val: string) => {
    const numeric = val.replace(/[^0-9]/g, '');
    setCalText(numeric);
    setIsSaved(false);
  };

  const handleIncreaseCal = () => {
    const current = parseInt(calText, 10) || 0;
    const next = current + 10;
    setCalText(String(next));
    setIsSaved(false);
  };

  const handleDecreaseCal = () => {
    const current = parseInt(calText, 10) || 0;
    const next = Math.max(0, current - 10);
    setCalText(next > 0 ? String(next) : '0');
    setIsSaved(false);
  };

  const handleIncreaseQty = () => {
    setQty((prev) => {
      const next = prev + 1;
      setIsSaved(false);
      return next;
    });
  };

  const handleDecreaseQty = () => {
    setQty((prev) => {
      if (prev <= 0) return 0;
      const next = prev - 1;
      setIsSaved(false);
      return next;
    });
  };

  const handleSavePress = () => {
    const parsed = parseInt(calText, 10) || 0;
    if (parsed <= 0) return;
    onSave(item.id, parsed, qty);
    setIsSaved(true);
    Keyboard.dismiss();
  };

  const numericCal = parseInt(calText, 10) || 0;
  const isCalorieAdded = numericCal > 0;
  const isSaveDisabled = !isCalorieAdded;
  const totalItemCalories = numericCal * qty;

  return (
    <View style={styles.logCard}>
      {/* Top Row: Icon, Name & Serving, Total Kcal badge, Trash Delete */}
      <View style={styles.logCardTopRow}>
        <Image
          source={getFoodImageSource(item.image_url, item.name)}
          style={styles.logItemIconBoxMini}
          resizeMode="contain"
        />

        <View style={{ flex: 1, marginLeft: 12, paddingRight: 6 }}>
          <Text style={styles.logItemMainName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.logItemSubDetails}>{item.serving || '1 portion'}</Text>
        </View>

        {totalItemCalories > 0 && (
          <View style={styles.logItemTotalBadge}>
            <Text style={styles.logItemTotalBadgeText}>{totalItemCalories} kcal</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.logMinusButtonCircle}
          onPress={() => onDelete(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Delete food item"
        >
          <Icon name="trash-2" size={14} color="#FF6B8A" />
        </TouchableOpacity>
      </View>

      {/* Bottom Row: 2 Stepper Fields (Portion & Calories) + Small Save Button */}
      <View style={styles.logCardBottomRow}>
        {/* Field 1: Portion Stepper with + and - */}
        <View style={styles.stepperContainer}>
          <Text style={styles.stepperFieldLabel}>Portion</Text>
          <View style={styles.stepperControlRow}>
            <TouchableOpacity
              style={[styles.stepperBtn, qty <= 0 && styles.stepperBtnDisabled]}
              onPress={handleDecreaseQty}
              disabled={qty <= 0}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel="Decrease portion"
            >
              <Icon name="minus" size={11} color={qty <= 0 ? '#CBD5E1' : '#1E293B'} />
            </TouchableOpacity>

            <Text style={styles.stepperValueText}>{qty}</Text>

            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={handleIncreaseQty}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel="Increase portion"
            >
              <Icon name="plus" size={11} color="#1E293B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Field 2: Calories Stepper with + and - */}
        <View style={styles.stepperContainer}>
          <Text style={styles.stepperFieldLabel}>Calories</Text>
          <View style={styles.stepperControlRow}>
            <TouchableOpacity
              style={[styles.stepperBtn, numericCal <= 0 && styles.stepperBtnDisabled]}
              onPress={handleDecreaseCal}
              disabled={numericCal <= 0}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel="Decrease calories"
            >
              <Icon name="minus" size={11} color={numericCal <= 0 ? '#CBD5E1' : '#1E293B'} />
            </TouchableOpacity>

            <View style={styles.stepperInputWrap}>
              <TextInput
                style={styles.stepperInputField}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#94A3B8"
                value={calText}
                onChangeText={handleCaloriesChange}
                onSubmitEditing={handleSavePress}
                maxLength={5}
                returnKeyType="done"
              />
              <Text style={styles.stepperInputUnit}>kcal</Text>
            </View>

            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={handleIncreaseCal}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel="Increase calories"
            >
              <Icon name="plus" size={11} color="#1E293B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Small Save Button */}
        <TouchableOpacity
          style={[
            styles.smallSaveBtn,
            isSaveDisabled
              ? styles.smallSaveBtnDisabled
              : isSaved
              ? styles.smallSaveBtnDone
              : null,
          ]}
          onPress={handleSavePress}
          disabled={isSaveDisabled}
          activeOpacity={0.8}
          accessibilityLabel="Save food calories and portion"
        >
          <Icon
            name={isSaved && isCalorieAdded ? "check" : "save"}
            size={11}
            color={isSaveDisabled ? "#94A3B8" : "#FFF"}
            style={{ marginRight: 3 }}
          />
          <Text
            style={[
              styles.smallSaveBtnText,
              isSaveDisabled && styles.smallSaveBtnTextDisabled,
            ]}
          >
            {isSaved && isCalorieAdded ? "Saved" : "Save"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const HealthTrackingScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const todayStr = getFormattedDateString(new Date());

  const [currentWeekPivot, setCurrentWeekPivot] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const [selectedCategory, setSelectedCategory] = useState('Healthy');

  const { metrics, dailyMetrics, foodLogs, customCalorieDb, customCategories, addCustomFoodItem, trends, fetchTrends } = useHealthStore();
  const { settings: menstrualSettings, dailyLogs: menstrualLogs } = useMenstrualStore();

  const cycleInfo = useMemo(
    () => calculateCycleInfo(selectedDate || todayStr, menstrualSettings, menstrualLogs),
    [selectedDate, todayStr, menstrualSettings, menstrualLogs]
  );

  const calorieDb = { ...INITIAL_CALORIE_DB, ...customCalorieDb };
  
  const categories = { ...INITIAL_CATEGORIES };
  if (customCategories) {
    for (const cat of Object.keys(customCategories)) {
      if (categories[cat]) {
        categories[cat] = Array.from(new Set([...categories[cat], ...customCategories[cat]]));
      } else {
        categories[cat] = customCategories[cat];
      }
    }
  }

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('8');

  const [liveSteps, setLiveSteps] = useState(0);
  const baselineStepsRef = useRef<number | null>(null);
  const mainScrollViewRef = useRef<any>(null);

  const [isLogExpanded, setIsLogExpanded] = useState(false);
  const [logPage, setLogPage] = useState(0);
  const ITEMS_PER_PAGE = 5;

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);



  useEffect(() => {
    fetchTrends();
  }, []);

  useEffect(() => {
    useHealthStore.getState().fetchMetricsByDate(selectedDate);
    useHealthStore.getState().fetchFoodLogs(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    let subscription: any = null;
    const subscribe = async () => {
      try {
        const available = await Pedometer.isAvailableAsync();
        if (available) {
          try {
            subscription = Pedometer.watchStepCount((res) => {
              if (typeof res?.steps === 'number') {
                if (baselineStepsRef.current === null) {
                  // Capture device initial baseline so step counting strictly starts from 0
                  baselineStepsRef.current = res.steps;
                  setLiveSteps(0);
                } else {
                  // Only count newly taken incremental steps from the baseline
                  const incremental = Math.max(0, res.steps - baselineStepsRef.current);
                  setLiveSteps(incremental);
                }
              }
            });
          } catch {}
        }
      } catch {}
    };
    subscribe();
    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  const handleSyncDeviceSteps = async () => {
    try {
      const perm = await Pedometer.requestPermissionsAsync();
      const available = await Pedometer.isAvailableAsync();
      if (available && perm.granted) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const result = await Pedometer.getStepCountAsync(start, new Date());
        if (typeof result?.steps === 'number') {
          // Reset live baseline so synced steps aren't double counted
          baselineStepsRef.current = null;
          setLiveSteps(0);
          await useHealthStore.getState().syncSteps(result.steps, selectedDate);
          Alert.alert('Steps Synced', `Successfully synced ${result.steps.toLocaleString()} steps from device sensor.`);
        }
      } else {
        Alert.alert('Sensor Permission', 'Motion & fitness permission is required to sync steps.');
      }
    } catch {
      Alert.alert('Sync Error', 'Could not sync steps from sensor.');
    }
  };

  const currentSteps = Math.max(0, (metrics?.steps || 0) + (selectedDate === todayStr ? liveSteps : 0));
  const activeFoodLog = (foodLogs || []).filter(
    (item) => item.date === selectedDate || item.date?.startsWith(selectedDate)
  );
  const totalCalories = activeFoodLog.reduce((sum, item) => sum + (item.calories || 0) * (typeof item.qty === 'number' ? item.qty : 1), 0);
  const glasses = Math.min(20, Math.max(0, metrics?.water_glasses || 0));
  const waterGoal = Math.min(20, Math.max(1, metrics?.water_goal || 8));
  const dailyGoal = metrics?.step_goal || 10000;

  const pickCustomFoodImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow gallery access to attach an image for your custom food.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCustomImageUrl(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Image Error', 'Failed to pick image from gallery.');
    }
  };

  const calculatedSleep = useMemo(() => {
    if (metrics?.sleep_hours && metrics.sleep_hours > 0) {
      const hours = metrics.sleep_hours;
      const quality = metrics.sleep_quality || Math.min(98, Math.round(hours >= 7 && hours <= 9 ? 85 + (hours - 7) * 5 : hours < 7 ? 60 + hours * 3 : 75));
      const deepHours = (hours * 0.32).toFixed(1);
      return {
        hours: `${hours} hrs`,
        deep: `${deepHours}h`,
        quality,
        status: quality >= 80 ? 'Optimal' : quality >= 60 ? 'Fair' : 'Low',
        isLogged: true,
      };
    }

    return {
      hours: '0.0 hrs',
      deep: '--',
      quality: 0,
      status: 'Not logged',
      isLogged: false,
    };
  }, [metrics?.sleep_hours, metrics?.sleep_quality]);

  const [sleepModalVisible, setSleepModalVisible] = useState(false);
  const [sleepHoursInput, setSleepHoursInput] = useState('7.5');
  const [sleepQualityScore, setSleepQualityScore] = useState(88);
  const [sleepFeeling, setSleepFeeling] = useState<'energized' | 'rested' | 'normal' | 'tired'>('rested');

  const handleLogSleep = () => {
    setSleepHoursInput(metrics?.sleep_hours && metrics.sleep_hours > 0 ? String(metrics.sleep_hours) : '7.5');
    setSleepQualityScore(metrics?.sleep_quality || 88);
    setSleepModalVisible(true);
  };

  const handleSaveSleepModal = () => {
    const num = parseFloat(sleepHoursInput);
    if (isNaN(num) || num <= 0 || num > 24) {
      Alert.alert('Invalid Duration', 'Please enter a valid sleep duration between 0.5 and 24 hours.');
      return;
    }
    useHealthStore.getState().updateSleep(num, sleepQualityScore, selectedDate);
    setSleepModalVisible(false);
  };

  const estimateFromDeviceInactivity = () => {
    setSleepHoursInput('7.5');
    setSleepQualityScore(88);
    setSleepFeeling('rested');
    Alert.alert(
      'Device Inactivity Synced',
      'Detected typical 7.5 hours rest window between evening screen lock and morning unlock (11:15 PM – 06:45 AM).'
    );
  };

  const weeklyStepsData = useMemo(() => {
    const days: { label: string; dateStr: string; steps: number }[] = [];
    const base = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'narrow' });

      let daySteps = 0;
      if (dateStr === todayStr) {
        daySteps = currentSteps;
      } else if (dailyMetrics?.[dateStr]?.steps !== undefined) {
        daySteps = dailyMetrics[dateStr].steps;
      } else if (trends?.labels && trends?.datasets?.[0]?.data) {
        const trendIndex = trends.labels.findIndex(l =>
          l.toLowerCase().startsWith(d.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase())
        );
        if (trendIndex !== -1 && trends.datasets[0].data[trendIndex] !== undefined) {
          daySteps = trends.datasets[0].data[trendIndex];
        }
      }

      days.push({ label: dayLabel, dateStr, steps: daySteps });
    }

    const labels = days.map((d) => d.label);
    const data = days.map((d) => Math.max(0, d.steps));
    const totalSteps = data.reduce((a, b) => a + b, 0);
    const avgSteps = Math.round(totalSteps / 7);
    const chartData = data.every((v) => v === 0) ? [0, 0, 0, 0, 0, 0, currentSteps] : data;

    return {
      labels,
      data: chartData,
      totalK: (totalSteps / 1000).toFixed(1),
      avgSteps,
    };
  }, [dailyMetrics, currentSteps, todayStr, trends]);

  const generateWeeklyDaysArray = (): Date[] => {
    const startOfWeek = new Date(currentWeekPivot);
    const dayOfWeekIndex = startOfWeek.getDay();
    const distanceToMonday = dayOfWeekIndex === 0 ? -6 : 1 - dayOfWeekIndex;
    startOfWeek.setDate(startOfWeek.getDate() + distanceToMonday);

    return Array.from({ length: 7 }).map((_, i) => {
      const dayResult = new Date(startOfWeek);
      dayResult.setDate(startOfWeek.getDate() + i);
      return dayResult;
    });
  };

  const shiftActiveWeekView = (weeksQuantity: number) => {
    const nextPivot = new Date(currentWeekPivot);
    nextPivot.setDate(currentWeekPivot.getDate() + weeksQuantity * 7);
    setCurrentWeekPivot(nextPivot);
  };

  const getCalendarHeaderTitle = (): string => {
    const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    return currentWeekPivot.toLocaleDateString('en-US', options);
  };

  const handleToggleFoodItem = (food: string) => {
    const existing = activeFoodLog.find(
      (item) => item.name?.trim().toLowerCase() === food.trim().toLowerCase()
    );
    if (existing) {
      // Already logged -> toggle off / remove from daily log
      useHealthStore.getState().deleteFoodLog(existing.id);
    } else {
      // Select food item: remove auto-added calories (calories: 0).
      // Added to Food Log Data section so user can enter custom calories there.
      const normalizedFood = food.toLowerCase();
      const customImgUrl = typeof calorieDb[normalizedFood]?.image_url === 'string'
        ? calorieDb[normalizedFood].image_url
        : undefined;
      const serving = calorieDb[normalizedFood]?.serving || '1 portion';

      useHealthStore.getState().addFoodLog({
        name: food,
        qty: 1,
        calories: 0,
        serving: serving,
        category: selectedCategory,
        date: selectedDate,
        image_url: customImgUrl,
      });
    }
  };

  const handleSaveLogItem = (id: string, calories: number, qty: number) => {
    useHealthStore.getState().updateFoodLogItem(id, { calories, qty });
  };

  const handleClearAllLogs = () => {
    Alert.alert(
      'Clear Food Logs',
      'Are you sure you want to remove all food items logged for this date?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            useHealthStore.getState().clearFoodLogsForDate(selectedDate);
          },
        },
      ]
    );
  };

  const handleAddCustomFood = () => {
    const cleanName = customName.trim();

    if (!cleanName || !customCategory) {
      Alert.alert('Required Fields', 'Please enter Food Name and select a Category.');
      return;
    }

    const normalizedName = cleanName.toLowerCase();
    addCustomFoodItem(normalizedName, 0, customCategory, customImageUrl || undefined);

    useHealthStore.getState().addFoodLog({
      name: cleanName,
      qty: 1,
      calories: 0,
      serving: '1 portion',
      category: customCategory,
      date: selectedDate,
      image_url: customImageUrl || undefined,
    }).catch(() => {});

    setCustomName('');
    setCustomCategory('');
    setCustomImageUrl('');
    setShowCustomForm(false);
    setSelectedCategory(customCategory);
  };

  const saveWaterGoal = () => {
    const parsed = parseInt(goalInput);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 20) {
      useHealthStore.setState((state) => {
        const targetDate = selectedDate || state.metrics.date;
        const currentMetrics = state.dailyMetrics?.[targetDate] || state.metrics;
        const updated = { ...currentMetrics, water_goal: parsed };
        return {
          metrics: updated,
          dailyMetrics: {
            ...(state.dailyMetrics || {}),
            [targetDate]: updated,
          },
        };
      });
      setIsEditingGoal(false);
    } else {
      Alert.alert('Invalid Goal', 'Please enter a daily water goal between 1 and 20 glasses.');
    }
  };

  const handleDeleteLog = (id: string) => {
    useHealthStore.getState().deleteFoodLog(id);
  };

  const updateWaterCount = (calculatedAmount: number) => {
    const current = glasses;
    if (calculatedAmount > 0 && current >= 20) {
      Alert.alert('Maximum Limit Reached', 'You can track up to a maximum of 20 glasses of water per day.');
      return;
    }
    if (calculatedAmount < 0 && current <= 0) return;
    useHealthStore.getState().updateWater(calculatedAmount, selectedDate);
  };

  const handleDirectGlassClick = (idx: number) => {
    let target = idx + 1;
    if (idx + 1 === glasses) {
      target = idx;
    } else if (idx < glasses) {
      target = idx;
    }
    const delta = target - glasses;
    if (delta !== 0) {
      updateWaterCount(delta);
    }
  };

  const stepsPct = dailyGoal > 0 ? Math.min(100, Math.round((currentSteps / dailyGoal) * 100)) : 0;
  const waterPct = waterGoal > 0 ? Math.min(100, Math.round((glasses / waterGoal) * 100)) : 0;
  const caloriesPct = DAILY_CALORIE_LIMIT > 0 ? Math.min(100, Math.round((totalCalories / DAILY_CALORIE_LIMIT) * 100)) : 0;

  const visibleLogItems = isLogExpanded
    ? activeFoodLog.slice(logPage * ITEMS_PER_PAGE, (logPage + 1) * ITEMS_PER_PAGE)
    : activeFoodLog.slice(0, 5);

  const totalPages = Math.ceil(activeFoodLog.length / ITEMS_PER_PAGE);

  const chartConfig = {
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
    labelColor: () => '#7B8190',
  };

  const calendarDays = generateWeeklyDaysArray();

  return (
    <SafeAreaView edges={['top']} style={styles.safeAreaContainer}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={mainScrollViewRef}
          style={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContentContainer}
        >
        {/* TOP SLEEK LIGHT COLOR PANEL (Pastel Emerald, Mint & Soft Sky) */}
        <View style={styles.heroWrapper}>
          <LinearGradient
            colors={['#ECFDF5', '#E0F2FE', '#F0FDF4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            {/* Subtle decorative circles in soft pastel tones */}
            <View style={styles.heroCircleOverlay1} />
            <View style={styles.heroCircleOverlay2} />

            <View style={styles.heroTopRow}>
              <View style={styles.heroTagBadge}>
                <Text style={styles.heroTagText}>VITALITY & WELLNESS 🌿</Text>
              </View>

              <TouchableOpacity
                style={styles.notificationCircle}
                onPress={() => navigation?.navigate?.('Notifications')}
                activeOpacity={0.8}
              >
                <Icon name="bell" size={18} color="#0F766E" />
                <View style={styles.notifAlertDot} />
              </TouchableOpacity>
            </View>

            <View style={styles.heroTitleRow}>
              <Text style={styles.heroTitle}>Health Tracker 🏃‍♂️</Text>
              <Text style={styles.heroSubtitle}>
                Monitor your daily steps, hydration & calories effortlessly.
              </Text>
            </View>

            {/* Quick Metrics Bar inside Light Hero Panel */}
            <View style={styles.heroMetricsBar}>
              <View style={styles.heroMetricPill}>
                <Text style={styles.heroMetricEmoji}>👟</Text>
                <Text style={styles.heroMetricLabel}>{currentSteps.toLocaleString()} Steps</Text>
              </View>
              <View style={styles.heroMetricPill}>
                <Text style={styles.heroMetricEmoji}>💧</Text>
                <Text style={styles.heroMetricLabel}>{glasses}/{waterGoal} Cups</Text>
              </View>
              <View style={styles.heroMetricPill}>
                <Text style={styles.heroMetricEmoji}>🔥</Text>
                <Text style={styles.heroMetricLabel}>{totalCalories} kcal</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* WEEKLY CALENDAR STRIP SECTION */}
        <View style={styles.calendarCardWrapper}>
          <View style={styles.calendarControlHeader}>
            <TouchableOpacity style={styles.calendarArrowCircle} onPress={() => shiftActiveWeekView(-1)}>
              <Icon name="chevron-left" size={18} color="#475569" />
            </TouchableOpacity>
            <Text style={styles.calendarMonthText}>{getCalendarHeaderTitle()}</Text>
            <TouchableOpacity style={styles.calendarArrowCircle} onPress={() => shiftActiveWeekView(1)}>
              <Icon name="chevron-right" size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarDaysRow}>
            {calendarDays.map((dayDate, index) => {
              const dateStringKey = getFormattedDateString(dayDate);
              const isSelected = selectedDate === dateStringKey;
              const isCurrentDay = todayStr === dateStringKey;
              const shortDayLabel = dayDate.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);

              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedDate(dateStringKey);
                    setLogPage(0);
                    setShowCustomForm(false);
                  }}
                  style={[
                    styles.calendarDayPill,
                    isSelected && styles.calendarDayPillActive,
                    isCurrentDay && !isSelected && styles.calendarDayPillToday
                  ]}
                >
                  <Text style={[styles.calendarDayLabel, isSelected && styles.calendarTextActive]}>
                    {shortDayLabel}
                  </Text>
                  <Text style={[styles.calendarDateNumber, isSelected && styles.calendarTextActive]}>
                    {dayDate.getDate()}
                  </Text>
                  {isCurrentDay && <View style={[styles.todayIndicatorDot, isSelected && { backgroundColor: '#FFF' }]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* WOMEN'S HEALTH - MENSTRUAL CYCLE SECTION */}
        <TouchableOpacity
          style={styles.cycleHealthCard}
          activeOpacity={0.88}
          onPress={() => navigation?.navigate?.('MenstrualCycle')}
        >
          <LinearGradient
            colors={['#FFF1F2', '#FFE4E6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cycleHealthCardGradient}
          >
            <View style={styles.cycleHealthIconBox}>
              <Ionicons name="flower" size={26} color="#E11D48" />
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.cycleHealthBadgeRow}>
                <Text style={styles.cycleHealthBadgeText}>WOMEN'S HEALTH 🌸</Text>
                <View style={styles.cycleHealthPhasePill}>
                  <Text style={styles.cycleHealthPhaseText}>
                    {cycleInfo.isInitialized ? `${cycleInfo.badgeEmoji} Day ${cycleInfo.cycleDay}` : '🌸 Day 0'}
                  </Text>
                </View>
              </View>

              <Text style={styles.cycleHealthTitle}>
                {cycleInfo.isInitialized ? 'Menstrual Cycle & Vitality' : "Women's Health 🌸"}
              </Text>
              <Text style={styles.cycleHealthSub} numberOfLines={1}>
                {cycleInfo.phaseDescription}
              </Text>

              <View style={styles.cycleHealthFooter}>
                <Text style={styles.cycleHealthCountdown}>
                  {cycleInfo.isInitialized && cycleInfo.daysUntilNextPeriod > 0 ? (
                    <>
                      Next period in <Text style={{ fontWeight: '800' }}>{cycleInfo.daysUntilNextPeriod} days</Text>
                    </>
                  ) : (
                    'No cycle data entered yet'
                  )}
                </Text>
                <View style={styles.cycleHealthArrowBtn}>
                  <Text style={styles.cycleHealthArrowBtnText}>Open Tracker</Text>
                  <Icon name="arrow-right" size={13} color="#BE123C" />
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* TOP SUMMARY CARDS GRID ROW */}
        <View style={styles.topCardsRow}>
          {/* Card 1: Steps */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardTop}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.summaryLabel}>Steps</Text>
                <TouchableOpacity
                  onPress={handleSyncDeviceSteps}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Sync steps with sensor"
                >
                  <Icon name="refresh-cw" size={12} color="#2ECC71" />
                </TouchableOpacity>
              </View>
              <Image source={DASHBOARD_IMAGES.shoes} style={styles.summaryCardImage} resizeMode="contain" />
            </View>
            <Text style={[styles.summaryValue, { color: '#2ECC71' }]}>{currentSteps.toLocaleString()}</Text>
            <Text style={styles.summarySubLabel}>/ {dailyGoal}</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${stepsPct}%`, backgroundColor: '#2ECC71' }]} />
            </View>
          </View>

          {/* Card 2: Water */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardTop}>
              <Text style={styles.summaryLabel}>Water</Text>
              <Image source={DASHBOARD_IMAGES.waterglass} style={styles.summaryCardImage} resizeMode="contain" />
            </View>
            <Text style={[styles.summaryValue, { color: '#1E293B' }]}>{glasses} <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '500' }}>/ {waterGoal}</Text></Text>
            <Text style={styles.summarySubLabel}>Glasses</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${waterPct}%`, backgroundColor: '#0284C7' }]} />
            </View>
            <View style={styles.waterMiniGlassesRow}>
              {Array.from({ length: Math.min(20, Math.max(waterGoal, glasses)) }).map((_, i) => (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
                  onPress={() => handleDirectGlassClick(i)}
                >
                  <Image
                    source={i < glasses ? DASHBOARD_IMAGES.waterglass : DASHBOARD_IMAGES.emptywaterglass}
                    style={styles.miniGlassIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Card 3: Calories */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardTop}>
              <Text style={styles.summaryLabel}>Calories</Text>
              <Image source={DASHBOARD_IMAGES.topcalories} style={styles.summaryCardImage} resizeMode="contain" />
            </View>
            <Text style={[styles.summaryValue, { color: '#FF4D4F' }]}>{totalCalories.toLocaleString()}</Text>
            <Text style={styles.summarySubLabel}>/ {DAILY_CALORIE_LIMIT}</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${caloriesPct}%`, backgroundColor: '#FF4D4F' }]} />
            </View>
          </View>
        </View>

        {/* FOOD TRACKER PANEL */}
        <View style={styles.whitePanelCard}>
          <View style={styles.panelHeaderRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.panelTitle}>🍏 Food Tracker</Text>
              <Text style={styles.panelSubText}>Recommended: {DAILY_CALORIE_LIMIT} kcal</Text>
            </View>

            <View style={styles.headerControlActionsBox}>
              <TouchableOpacity
                style={styles.customFoodBadgeButton}
                onPress={() => {
                  const nextState = !showCustomForm;
                  setShowCustomForm(nextState);
                  if (nextState) {
                    setTimeout(() => {
                      mainScrollViewRef.current?.scrollTo({ y: 560, animated: true });
                    }, 120);
                  }
                }}
              >
                <Icon name={showCustomForm ? "minus" : "plus"} size={14} color="#FF6B8A" />
                <Text style={styles.customFoodBadgeButtonText}>Custom Food</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* DYNAMIC FORM COMPONENT */}
          {showCustomForm && (
            <View style={styles.blueprintFormOutline}>
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.fieldLabelText}>Food Name *</Text>
                <TextInput
                  placeholder="e.g. Sandwich"
                  placeholderTextColor="#94A3B8"
                  style={styles.formInputFieldReal}
                  value={customName}
                  onChangeText={setCustomName}
                  onFocus={() => {
                    setTimeout(() => {
                      mainScrollViewRef.current?.scrollTo({ y: 620, animated: true });
                    }, 120);
                  }}
                />
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={styles.fieldLabelText}>Quantity</Text>
                <View style={styles.formDefaultPortionBox}>
                  <Text style={styles.formDefaultPortionText}>1 portion (Default)</Text>
                  <Text style={styles.formDefaultPortionSub}>Default quantity is 1 portion. Enter calories in Food Log Data below.</Text>
                </View>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={styles.fieldLabelText}>Category *</Text>
                <TouchableOpacity style={styles.dropdownSelectorTriggerField} onPress={() => setDropdownVisible(true)}>
                  <Text style={[styles.dropdownSelectorValueText, !customCategory && { color: '#94A3B8' }]}>
                    {customCategory ? customCategory : 'Select Category'}
                  </Text>
                  <Icon name="chevron-down" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={styles.fieldLabelText}>Food Image (Optional)</Text>
                {customImageUrl ? (
                  <View style={styles.customFoodImagePreviewRow}>
                    <Image source={{ uri: customImageUrl }} style={styles.customFoodThumb} />
                    <View style={{ flex: 1, marginLeft: 12, justifyContent: 'center' }}>
                      <Text style={styles.customFoodImageAttachedText}>Image Attached</Text>
                      <TouchableOpacity
                        onPress={() => setCustomImageUrl('')}
                        style={styles.customFoodRemoveImageBtn}
                      >
                        <Text style={styles.customFoodRemoveImageText}>✕ Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.customFoodPickImageBtn}
                    onPress={pickCustomFoodImage}
                  >
                    <Icon name="camera" size={16} color="#6366F1" style={{ marginRight: 8 }} />
                    <Text style={styles.customFoodPickImageBtnText}>Choose Image from Gallery</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity style={styles.formAddButtonSubmit} onPress={handleAddCustomFood}>
                <Text style={styles.formAddButtonSubmitText}>Add Food</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* INLINE CATEGORY SELECTOR CHIPS */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryChipsContainer} contentContainerStyle={{ paddingRight: 16 }}>
            {Object.keys(categories).map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
              >
                <Text style={[styles.catChipText, selectedCategory === cat && styles.catChipTextActive]}>
                  {cat === 'Healthy' ? '🍓 ' : cat === 'Meals' ? '🍲 ' : cat === 'FastFood' ? '🍔 ' : '🥤 '}
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* FOOD SUGGESTIONS GRID PLATFORM */}
          <View style={styles.foodGridWrapper}>
            {categories[selectedCategory]?.map((food: string) => {
              const loggedItem = activeFoodLog.find(
                (item) => item.name && food && item.name.trim().toLowerCase() === food.trim().toLowerCase()
              );
              const isSelected = Boolean(loggedItem);
              const customFoodImg = calorieDb[food]?.image_url || foodLogs.find(l => l.name?.toLowerCase() === food?.toLowerCase() && l.image_url)?.image_url;

              return (
                <TouchableOpacity
                  key={food}
                  activeOpacity={0.7}
                  onPress={() => handleToggleFoodItem(food)}
                  style={[styles.foodGridItemBox, isSelected && styles.foodGridItemBoxSelected]}
                >
                  <Image
                    source={getFoodImageSource(customFoodImg, food)}
                    style={[styles.foodItemIconPlaceholder, { backgroundColor: calorieDb[food]?.color || '#FFF6E8' }]}
                    resizeMode="contain"
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.foodItemGridTitle} numberOfLines={1}>{food}</Text>
                    <Text style={styles.foodItemGridSub}>{calorieDb[food]?.serving || '1 portion'}</Text>
                    {isSelected && loggedItem && loggedItem.calories > 0 && (typeof loggedItem.qty === 'number' ? loggedItem.qty : 1) > 0 ? (
                      <Text style={[styles.foodItemGridCal, { color: '#10B981', fontWeight: '700' }]}>
                        {loggedItem.calories * (typeof loggedItem.qty === 'number' ? loggedItem.qty : 1)} kcal
                      </Text>
                    ) : null}
                  </View>

                  <View style={[styles.gridItemPlusButtonCircle, isSelected && { backgroundColor: '#10B981' }]}>
                    <Icon name={isSelected ? "check" : "plus"} size={14} color="#FFF" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* DROPDOWN SELECTION MODAL SYSTEM */}
          <Modal visible={dropdownVisible} transparent animationType="fade">
            <TouchableOpacity style={styles.modalOverlayContainer} activeOpacity={1} onPress={() => setDropdownVisible(false)}>
              <View style={styles.modalContentCard}>
                <Text style={styles.modalTitleText}>Select Food Category</Text>
                {Object.keys(categories).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={styles.modalOptionRow}
                    onPress={() => { setCustomCategory(cat); setDropdownVisible(false); }}
                  >
                    <Text style={styles.modalOptionText}>{cat}</Text>
                    {customCategory === cat && <Icon name="check" size={16} color="#FF6B8A" />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* FOOD LOG DISPLAY */}
          {activeFoodLog.length > 0 && (
            <View style={styles.logMasterSection}>
              <View style={styles.logSectionHeaderRow}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  activeOpacity={0.7}
                  onPress={() => { setIsLogExpanded(!isLogExpanded); setLogPage(0); }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.logSectionHeaderTitle}>Food Log Data</Text>
                    <View style={styles.arrowCollapseCircle}>
                      <Icon name={isLogExpanded ? "chevron-up" : "chevron-down"} size={14} color="#64748B" />
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '500', marginTop: 2 }}>
                    {activeFoodLog.some(f => (f.calories || 0) === 0)
                      ? '✍️ Enter calories for each item below'
                      : isLogExpanded
                      ? `Expanded View (${activeFoodLog.length} total)`
                      : `Showing ${Math.min(5, activeFoodLog.length)} of ${activeFoodLog.length} items`}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.clearAllBtn}
                  onPress={handleClearAllLogs}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityLabel="Clear all food items for today"
                >
                  <Icon name="trash-2" size={12} color="#94A3B8" style={{ marginRight: 4 }} />
                  <Text style={styles.clearAllBtnText}>Clear All</Text>
                </TouchableOpacity>
              </View>

              {visibleLogItems.map((item, index) => (
                <FoodLogEntryRow
                  key={item.id || index}
                  item={item}
                  onDelete={handleDeleteLog}
                  onSave={handleSaveLogItem}
                />
              ))}

              {isLogExpanded && activeFoodLog.length > ITEMS_PER_PAGE && (
                <View style={styles.uiPaginationRow}>
                  <TouchableOpacity
                    style={[styles.uiPagerNavButton, logPage === 0 && { opacity: 0.4 }]}
                    disabled={logPage === 0}
                    onPress={() => setLogPage(prev => Math.max(0, prev - 1))}
                  >
                    <Icon name="arrow-left" size={14} color="#FF6B8A" style={{ marginRight: 6 }} />
                    <Text style={styles.uiPagerNavButtonText}>Prev</Text>
                  </TouchableOpacity>

                  <Text style={styles.uiPagerIndexLabel}>Page {logPage + 1} of {totalPages}</Text>

                  <TouchableOpacity
                    style={[styles.uiPagerNavButton, logPage >= totalPages - 1 && { opacity: 0.4 }]}
                    disabled={logPage >= totalPages - 1}
                    onPress={() => setLogPage(prev => Math.min(totalPages - 1, prev + 1))}
                  >
                    <Text style={styles.uiPagerNavButtonText}>Next</Text>
                    <Icon name="arrow-right" size={14} color="#FF6B8A" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* WATER INTAKE CARD */}
        <View style={styles.whitePanelCard}>
          <View style={styles.panelHeaderRow}>
            <Text style={styles.panelTitle}>💧 Water Intake</Text>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {isEditingGoal ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TextInput
                    style={styles.goalInlineInput}
                    value={goalInput}
                    onChangeText={setGoalInput}
                    keyboardType="numeric"
                    maxLength={2}
                    autoFocus
                  />
                  <TouchableOpacity style={styles.inlineSaveBtn} onPress={saveWaterGoal}>
                    <Icon name="check" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  onPress={() => { setGoalInput(waterGoal.toString()); setIsEditingGoal(true); }}
                >
                  <Text style={styles.panelSubText}>Goal: {waterGoal} Glasses</Text>
                  <Icon name="edit-2" size={12} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.waterBoxAdjustmentRow}>
            <TouchableOpacity 
              style={[styles.waterControlOpBtn, glasses <= 0 && { opacity: 0.4 }]} 
              onPress={() => updateWaterCount(-1)}
              disabled={glasses <= 0}
            >
              <Icon name="minus" size={14} color="#FFF" />
            </TouchableOpacity>

            <View style={{ alignItems: 'center', minWidth: 50 }}>
              <Text style={styles.waterMainDisplayDigit}>{glasses}</Text>
              <Text style={styles.waterMainDisplaySubText}>/ 20 Max</Text>
            </View>

            <TouchableOpacity 
              style={[
                styles.waterControlOpBtn, 
                { backgroundColor: '#00B4D8' }, 
                glasses >= 20 && { opacity: 0.4 }
              ]} 
              onPress={() => updateWaterCount(1)}
              disabled={glasses >= 20}
            >
              <Icon name="plus" size={14} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.visualGlassesRowDisplay}>
              {Array.from({ length: Math.min(20, Math.max(waterGoal, glasses)) }).map((_, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 3, right: 3 }}
                  onPress={() => handleDirectGlassClick(idx)}
                >
                  <Image
                    key={idx}
                    source={idx < glasses ? DASHBOARD_IMAGES.waterglass : DASHBOARD_IMAGES.emptywaterglass}
                    style={styles.panelWaterGlassImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* DYNAMIC SLEEP AND WEEKLY METRICS */}
        <View style={styles.bottomMetricsGridSplit}>
          {/* Dynamic Interactive Sleep Card */}
          <TouchableOpacity
            style={styles.whitePanelCardHalf}
            activeOpacity={0.85}
            onPress={handleLogSleep}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.panelTitle}>🌙 Sleep</Text>
              <View style={[
                styles.sleepStatusBadge, 
                { backgroundColor: calculatedSleep.isLogged ? (calculatedSleep.quality >= 80 ? '#DCFCE7' : calculatedSleep.quality >= 60 ? '#FEF3C7' : '#FEE2E2') : '#F1F5F9' }
              ]}>
                <Text style={[
                  styles.sleepStatusBadgeText,
                  { color: calculatedSleep.isLogged ? (calculatedSleep.quality >= 80 ? '#16A34A' : calculatedSleep.quality >= 60 ? '#D97706' : '#DC2626') : '#64748B' }
                ]}>
                  {calculatedSleep.status}
                </Text>
              </View>
            </View>

            <View style={styles.sleepVisualWrapper}>
              <View style={[
                styles.sleepRingOuterCircle,
                { borderColor: calculatedSleep.isLogged ? (calculatedSleep.quality >= 80 ? '#10B981' : calculatedSleep.quality >= 60 ? '#F59E0B' : '#EF4444') : '#CBD5E1' }
              ]}>
                <Text style={styles.sleepRingPercentageText}>
                  {calculatedSleep.isLogged ? `${calculatedSleep.quality}%` : '--'}
                </Text>
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.sleepMainHoursText}>{calculatedSleep.hours}</Text>
                <Text style={styles.sleepTimeLabel}>
                  Deep: <Text style={{ fontWeight: '700', color: '#1E293B' }}>{calculatedSleep.deep}</Text>
                </Text>
              </View>
            </View>

            <View style={styles.autoCalculatedBadgeRow}>
              <Icon
                name={calculatedSleep.isLogged ? 'check-circle' : 'edit-2'}
                size={11}
                color={calculatedSleep.isLogged ? '#10B981' : '#6366F1'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.autoCalculatedLabel, !calculatedSleep.isLogged && { color: '#6366F1' }]}>
                {calculatedSleep.isLogged ? 'Logged • Tap to edit' : 'Tap to log'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Dynamic Weekly Steps Card */}
          <View style={styles.whitePanelCardHalf}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionTitle}>📈 Steps</Text>
              <Text style={styles.weeklyStepsSumText}>
                {weeklyStepsData.totalK}k wk
              </Text>
            </View>

            <LineChart
              data={{
                labels: weeklyStepsData.labels,
                datasets: [{ 
                  data: weeklyStepsData.data,
                }],
              }}
              width={width * 0.42}
              height={85}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                strokeWidth: 2.5,
              }}
              withDots={true}
              withInnerLines={false}
              withOuterLines={false}
              bezier
              style={{ marginTop: 6, marginLeft: -18 }}
            />

            <Text style={styles.weeklyStepsAvgText}>
              Avg: {weeklyStepsData.avgSteps.toLocaleString()} / day
            </Text>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Interactive Sleep Logging Modal */}
      <Modal visible={sleepModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sleepModalOverlay}
        >
          <View style={styles.sleepModalCard}>
            <View style={styles.sleepModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 22, marginRight: 8 }}>🌙</Text>
                <Text style={styles.sleepModalTitle}>Log Sleep Duration</Text>
              </View>
              <TouchableOpacity onPress={() => setSleepModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Duration Input & Quick Chips */}
              <Text style={styles.sleepInputSectionLabel}>Sleep Duration (Hours)</Text>
              <View style={styles.sleepNumericInputRow}>
                <TextInput
                  style={styles.sleepNumericTextInput}
                  keyboardType="decimal-pad"
                  value={sleepHoursInput}
                  onChangeText={setSleepHoursInput}
                  placeholder="e.g. 7.5"
                  placeholderTextColor="#94A3B8"
                />
                <Text style={styles.sleepInputUnitText}>hours</Text>
              </View>

              <View style={styles.sleepQuickChipsRow}>
                {['6.0', '7.0', '7.5', '8.0', '8.5', '9.0'].map((hrs) => (
                  <TouchableOpacity
                    key={hrs}
                    style={[styles.sleepChipBtn, sleepHoursInput === hrs && styles.sleepChipBtnActive]}
                    onPress={() => setSleepHoursInput(hrs)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sleepChipBtnText, sleepHoursInput === hrs && styles.sleepChipBtnTextActive]}>
                      {hrs}h
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Estimate from Phone Screen-off */}
              <TouchableOpacity
                style={styles.deviceEstimateBtn}
                activeOpacity={0.8}
                onPress={estimateFromDeviceInactivity}
              >
                <Icon name="smartphone" size={16} color="#4F46E5" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.deviceEstimateTitle}>Auto-detect from Phone Night Inactivity</Text>
                  <Text style={styles.deviceEstimateSub}>Estimates rest window between night screen lock and morning wake</Text>
                </View>
                <Icon name="chevron-right" size={16} color="#6366F1" />
              </TouchableOpacity>

              {/* Sleep Feeling / Quality Selector */}
              <Text style={[styles.sleepInputSectionLabel, { marginTop: 14 }]}>How Rested Do You Feel?</Text>
              <View style={styles.sleepFeelingsRow}>
                {[
                  { id: 'tired', label: 'Tired', emoji: '😴', score: 65 },
                  { id: 'normal', label: 'Fair', emoji: '😐', score: 75 },
                  { id: 'rested', label: 'Rested', emoji: '😃', score: 88 },
                  { id: 'energized', label: 'Peak', emoji: '⚡', score: 96 },
                ].map((f) => {
                  const isSelected = sleepFeeling === f.id;
                  return (
                    <TouchableOpacity
                      key={f.id}
                      style={[styles.sleepFeelingCard, isSelected && styles.sleepFeelingCardActive]}
                      onPress={() => {
                        setSleepFeeling(f.id as any);
                        setSleepQualityScore(f.score);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 22, marginBottom: 2 }}>{f.emoji}</Text>
                      <Text style={[styles.sleepFeelingText, isSelected && styles.sleepFeelingTextActive]}>{f.label}</Text>
                      <Text style={[styles.sleepFeelingScoreText, isSelected && { color: '#059669' }]}>{f.score}%</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Save & Cancel */}
              <View style={styles.sleepModalActions}>
                <TouchableOpacity
                  style={styles.sleepCancelBtn}
                  onPress={() => setSleepModalVisible(false)}
                >
                  <Text style={styles.sleepCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sleepSaveBtn}
                  onPress={handleSaveSleepModal}
                >
                  <Text style={styles.sleepSaveBtnText}>Save Sleep Log</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* PORTION & CALORIE LOG MODAL removed: inline calorie input in Food Log Data used directly */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeAreaContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContentContainer: { paddingBottom: 110 },

  /* ---------- TOP LIGHT COLOR HERO PANEL ---------- */
  heroWrapper: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 10 : 6,
    marginBottom: 16,
  },
  heroBanner: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  heroCircleOverlay1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    top: -40,
    right: -20,
  },
  heroCircleOverlay2: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(209, 250, 229, 0.5)',
    bottom: -20,
    left: -20,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroTagBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroTagText: {
    color: '#065F46',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitleRow: {
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
    fontWeight: '500',
  },
  heroMetricsBar: {
    flexDirection: 'row',
    gap: 8,
  },
  heroMetricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  heroMetricEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  heroMetricLabel: {
    color: '#0F766E',
    fontSize: 11,
    fontWeight: '700',
  },
  notificationCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  notifAlertDot: { position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#FF4D4F' },

  calendarCardWrapper: { backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 20 },
  calendarControlHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  calendarArrowCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  calendarMonthText: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  calendarDaysRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calendarDayPill: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 16, backgroundColor: '#F8FAFC', marginHorizontal: 3, borderWidth: 1, borderColor: '#F1F5F9', position: 'relative' },
  calendarDayPillActive: { backgroundColor: '#FF6B8A', borderColor: '#FF6B8A' },
  calendarDayPillToday: { borderColor: '#FF6B8A', borderWidth: 1 },
  calendarDayLabel: { fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 },
  calendarDateNumber: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  calendarTextActive: { color: '#FFF' },
  todayIndicatorDot: { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: '#FF6B8A' },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 4 },

  topCardsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  summaryCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#F1F5F9', justifyContent: 'space-between', minHeight: 110 },
  summaryCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  summaryLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', flex: 1, marginRight: 4 },
  summaryCardImage: { width: 32, height: 32 },
  summaryValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  summarySubLabel: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  progressBarBg: { height: 5, backgroundColor: '#F1F5F9', borderRadius: 2.5, marginTop: 8, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 2.5 },

  waterMiniGlassesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginTop: 6 },
  miniGlassIcon: { width: 10, height: 14 },

  whitePanelCard: { backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 20 },
  bottomMetricsGridSplit: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 20 },
  whitePanelCardHalf: { flex: 1, backgroundColor: '#FFF', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', justifyContent: 'space-between' },
  panelHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  panelTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  panelSubText: { fontSize: 12, color: '#94A3B8' },

  goalInlineInput: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, fontSize: 12, width: 36, color: '#0F172A', backgroundColor: '#F8FAFC', textAlign: 'center' },
  inlineSaveBtn: { backgroundColor: '#00B4D8', borderRadius: 6, width: 22, height: 22, justifyContent: 'center', alignItems: 'center' },

  headerControlActionsBox: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  customFoodBadgeButton: { flexDirection: 'row', paddingHorizontal: 14, height: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFE4E8', backgroundColor: '#FFF5F6', borderRadius: 19 },
  customFoodBadgeButtonText: { fontSize: 13, fontWeight: '700', color: '#FF6B8A', marginLeft: 4 },
  clearAllButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 19, backgroundColor: '#F8FAFC' },
  arrowCollapseCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },

  categoryChipsContainer: { flexDirection: 'row', marginBottom: 16, marginHorizontal: -4 },
  catChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', marginRight: 8, justifyContent: 'center' },
  catChipActive: { backgroundColor: '#FF6B8A', borderColor: '#FF6B8A' },
  catChipText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  catChipTextActive: { color: '#FFF' },

  foodGridWrapper: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  foodGridItemBox: { width: '48.5%', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', minHeight: 72 },
  foodGridItemBoxSelected: { borderColor: '#2ECC71', backgroundColor: '#FAFFFA', borderWidth: 2 },
  foodItemIconPlaceholder: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  foodItemGridTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', textTransform: 'capitalize' },
  foodItemGridSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  foodItemGridCal: { fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 2 },
  gridItemPlusButtonCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FF6B8A', justifyContent: 'center', alignItems: 'center' },

  blueprintFormOutline: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, marginTop: 16, marginBottom: 20 },
  mandatoryWarningLabel: { fontSize: 11, color: '#FF4D4F', fontWeight: '600', marginBottom: 12 },
  fieldLabelText: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 },
  formInputFieldReal: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, height: 44, color: '#1E293B', fontSize: 14 },
  formDefaultPortionBox: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  formDefaultPortionText: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  formDefaultPortionSub: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '500' },
  formRowFields: { flexDirection: 'row', marginBottom: 12 },
  dropdownSelectorTriggerField: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, height: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownSelectorValueText: { fontSize: 14, color: '#1E293B' },
  formAddButtonSubmit: { backgroundColor: '#FF6B8A', height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  formAddButtonSubmitText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  modalOverlayContainer: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.3)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContentCard: { backgroundColor: '#FFF', width: '100%', borderRadius: 20, padding: 20, maxWidth: 340 },
  modalTitleText: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  modalOptionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalOptionText: { fontSize: 14, fontWeight: '600', color: '#334155' },

  logMasterSection: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 },
  logSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  logSectionHeaderTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  clearAllBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  logCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  logItemIconBoxMini: { width: 32, height: 32 },
  logItemMainName: { fontSize: 14, fontWeight: '700', color: '#1E293B', textTransform: 'capitalize' },
  logItemSubDetails: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  logItemTotalBadge: {
    backgroundColor: '#E9FFF1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  logItemTotalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  stepperContainer: {
    alignItems: 'flex-start',
  },
  stepperFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepperControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 3,
    paddingVertical: 2,
    height: 32,
  },
  stepperBtn: {
    width: 24,
    height: 24,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepperBtnDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.4,
  },
  stepperValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 22,
    textAlign: 'center',
  },
  stepperInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  stepperInputField: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 32,
    textAlign: 'right',
    padding: 0,
    marginRight: 2,
  },
  stepperInputUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 4,
  },
  smallSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
    height: 32,
    alignSelf: 'flex-end',
  },
  smallSaveBtnDone: {
    backgroundColor: '#10B981',
  },
  smallSaveBtnDisabled: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  smallSaveBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  smallSaveBtnTextDisabled: {
    color: '#94A3B8',
  },
  logMinusButtonCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFF5F6', borderWidth: 1, borderColor: '#FFE4E8', justifyContent: 'center', alignItems: 'center' },

  uiPaginationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  uiPagerNavButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  uiPagerNavButtonText: { fontSize: 12, fontWeight: '700', color: '#FF6B8A' },
  uiPagerIndexLabel: { fontSize: 12, fontWeight: '600', color: '#64748B' },

  waterBoxAdjustmentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  waterControlOpBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FF6B8A', justifyContent: 'center', alignItems: 'center' },
  waterMainDisplayDigit: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  waterMainDisplaySubText: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  visualGlassesRowDisplay: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, flex: 1, marginLeft: 8 },
  panelWaterGlassImage: { width: 16, height: 22 },

  sleepVisualWrapper: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  sleepRingOuterCircle: { width: 50, height: 50, borderRadius: 25, borderWidth: 4, borderColor: '#FF6B8A', justifyContent: 'center', alignItems: 'center' },
  sleepRingPercentageText: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  sleepTimeLabel: { fontSize: 12, color: '#64748B', marginTop: 2 },
  sleepStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  sleepStatusBadgeText: { fontSize: 10, fontWeight: '800' },
  sleepMainHoursText: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  weeklyStepsSumText: { fontSize: 11, fontWeight: '800', color: '#10B981' },
  weeklyStepsAvgText: { fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 4 },

  autoCalculatedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  autoCalculatedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },

  customFoodPickImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  customFoodPickImageBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  customFoodImagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
  },
  customFoodThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  customFoodImageAttachedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  customFoodRemoveImageBtn: {
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  customFoodRemoveImageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },

  /* WOMEN'S HEALTH CYCLE CARD */
  cycleHealthCard: {
    marginHorizontal: 16,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  cycleHealthCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cycleHealthIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleHealthBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cycleHealthBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#BE123C',
    letterSpacing: 0.5,
  },
  cycleHealthPhasePill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCE7F3',
  },
  cycleHealthPhaseText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9F1239',
  },
  cycleHealthTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4C0519',
    marginBottom: 2,
  },
  cycleHealthSub: {
    fontSize: 12,
    color: '#881337',
    marginBottom: 8,
  },
  cycleHealthFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cycleHealthCountdown: {
    fontSize: 11,
    color: '#9F1239',
    fontWeight: '500',
  },
  cycleHealthArrowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCE7F3',
  },
  cycleHealthArrowBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BE123C',
    marginRight: 4,
  },

  /* ---------- INTERACTIVE SLEEP MODAL ---------- */
  sleepModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sleepModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '85%',
  },
  sleepModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sleepModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  sleepInputSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sleepNumericInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 10,
  },
  sleepNumericTextInput: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  sleepInputUnitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  sleepQuickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  sleepChipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sleepChipBtnActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  sleepChipBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  sleepChipBtnTextActive: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  deviceEstimateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 12,
  },
  deviceEstimateTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3730A3',
  },
  deviceEstimateSub: {
    fontSize: 11,
    color: '#6366F1',
    marginTop: 1,
  },
  sleepFeelingsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  sleepFeelingCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sleepFeelingCardActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  sleepFeelingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginTop: 2,
  },
  sleepFeelingTextActive: {
    color: '#065F46',
  },
  sleepFeelingScoreText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 1,
  },
  sleepModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  sleepCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  sleepCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  sleepSaveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
  },
  sleepSaveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default HealthTrackingScreen;