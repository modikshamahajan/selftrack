import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TextInput,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import { Pedometer } from 'expo-sensors';
import { useHealthStore } from '../store/useHealthStore';

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

const HealthTrackingScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const todayStr = getFormattedDateString(new Date());

  const [currentWeekPivot, setCurrentWeekPivot] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const [selectedCategory, setSelectedCategory] = useState('Healthy');

  const { metrics, foodLogs, customCalorieDb, customCategories, addCustomFoodItem, trends, fetchTrends, updateSleep } = useHealthStore();

  const [sleepModalVisible, setSleepModalVisible] = useState(false);
  const [sleepHoursInput, setSleepHoursInput] = useState('7.5');
  const [sleepQualityInput, setSleepQualityInput] = useState('80');

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

  const [isLogExpanded, setIsLogExpanded] = useState(false);
  const [logPage, setLogPage] = useState(0);
  const ITEMS_PER_PAGE = 5;

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customQty, setCustomQty] = useState('');
  const [customCal, setCustomCal] = useState('');
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
        const perm = await Pedometer.requestPermissionsAsync();
        const available = await Pedometer.isAvailableAsync();
        if (available && perm.granted) {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          let stepsCount = 0;
          try {
            const result = await Pedometer.getStepCountAsync(start, new Date());
            stepsCount = result.steps || 0;
            useHealthStore.getState().syncSteps(stepsCount);
          } catch (e) {
            console.log('Error fetching daily steps:', e);
          }
          
          try {
            subscription = Pedometer.watchStepCount((res) => {
              console.log('Pedometer live steps update:', res.steps);
              setLiveSteps(res.steps);
              useHealthStore.getState().syncSteps(stepsCount + res.steps);
            });
          } catch (e) {
            console.log('Error watching live steps:', e);
          }
        }
      } catch (e) {
        // Ignore permission error
      }
    };
    subscribe();
    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  const currentSteps = (metrics?.steps || 0) + (selectedDate === todayStr ? liveSteps : 0);
  const activeFoodLog = foodLogs || [];
  const totalCalories = activeFoodLog.reduce((sum, item) => sum + item.calories * item.qty, 0);
  const glasses = metrics?.water_glasses || 0;
  const waterGoal = metrics?.water_goal || 8;
  const dailyGoal = metrics?.step_goal || 10000;

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

  const addFood = (food: string) => {
    const normalizedFood = food.toLowerCase();
    const existing = activeFoodLog.find((f) => f.name === normalizedFood);
    const calories = calorieDb[normalizedFood]?.calories || 120;
    const serving = calorieDb[normalizedFood]?.serving || '1 serving';

    // The backend just creates a new log. We don't UPSERT locally anymore.
    useHealthStore.getState().addFoodLog({
      name: normalizedFood,
      qty: 1,
      calories,
      serving,
      category: selectedCategory,
      date: selectedDate,
    }).catch(() => {});
  };

  const handleAddCustomFood = () => {
    const cleanName = customName.trim().toLowerCase();
    const cleanQty = parseInt(customQty);
    const cleanCal = parseInt(customCal);

    if (!cleanName || !cleanQty || !cleanCal || !customCategory) {
      Alert.alert('Required Fields', 'All fields are compulsory.');
      return;
    }

    addCustomFoodItem(cleanName, cleanCal, customCategory);

    useHealthStore.getState().addFoodLog({
      name: cleanName,
      qty: cleanQty,
      calories: cleanCal,
      serving: '1 portion',
      category: customCategory,
      date: selectedDate,
      image_url: customImageUrl || undefined,
    }).catch(() => {});

    setCustomName('');
    setCustomQty('');
    setCustomCal('');
    setCustomCategory('');
    setCustomImageUrl('');
    setShowCustomForm(false);
    setSelectedCategory(customCategory);
  };

  const saveWaterGoal = () => {
    const parsed = parseInt(goalInput);
    if (!isNaN(parsed) && parsed > 0) {
      useHealthStore.setState((state) => {
        if (state.metrics) {
          return { metrics: { ...state.metrics, water_goal: parsed } };
        }
        return state;
      });
      setIsEditingGoal(false);
    } else {
      Alert.alert('Invalid Input', 'Please enter a valid number of glasses.');
    }
  };

  const handleDeleteLog = (id: string) => {
    useHealthStore.getState().deleteFoodLog(id);
  };

  const updateWaterCount = (calculatedAmount: number) => {
    useHealthStore.getState().updateWater(calculatedAmount, selectedDate);
  };

  const visibleLogItems = isLogExpanded
    ? activeFoodLog.slice(logPage * ITEMS_PER_PAGE, (logPage + 1) * ITEMS_PER_PAGE)
    : activeFoodLog.slice(0, 3);

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
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
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

        {/* TOP SUMMARY CARDS GRID ROW */}
        <View style={styles.topCardsRow}>
          {/* Card 1: Steps */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardTop}>
              <Text style={styles.summaryLabel}>Steps</Text>
              <Image source={DASHBOARD_IMAGES.shoes} style={styles.summaryCardImage} resizeMode="contain" />
            </View>
            <Text style={[styles.summaryValue, { color: '#2ECC71' }]}>{currentSteps.toLocaleString()}</Text>
            <Text style={styles.summarySubLabel}>/ {dailyGoal}</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '78%', backgroundColor: '#2ECC71' }]} />
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
            <View style={styles.waterMiniGlassesRow}>
              {Array.from({ length: Math.max(waterGoal, glasses) }).map((_, i) => (
                <Image
                  key={i}
                  source={i < glasses ? DASHBOARD_IMAGES.waterglass : DASHBOARD_IMAGES.emptywaterglass}
                  style={styles.miniGlassIcon}
                  resizeMode="contain"
                />
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
              <View style={[styles.progressBarFill, { width: '66%', backgroundColor: '#FF4D4F' }]} />
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
              <TouchableOpacity style={styles.customFoodBadgeButton} onPress={() => setShowCustomForm(!showCustomForm)}>
                <Icon name={showCustomForm ? "minus" : "plus"} size={14} color="#FF6B8A" />
                <Text style={styles.customFoodBadgeButtonText}>Custom Food</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* DYNAMIC FORM COMPONENT */}
          {showCustomForm && (
            <View style={styles.blueprintFormOutline}>
              <Text style={styles.mandatoryWarningLabel}>* All fields are compulsory</Text>

              <View style={{ marginBottom: 12 }}>
                <Text style={styles.fieldLabelText}>Food Name *</Text>
                <TextInput placeholder="e.g. Sandwich" placeholderTextColor="#94A3B8" style={styles.formInputFieldReal} value={customName} onChangeText={setCustomName} />
              </View>

              <View style={styles.formRowFields}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabelText}>Quantity *</Text>
                  <TextInput placeholder="e.g. 1" placeholderTextColor="#94A3B8" style={styles.formInputFieldReal} keyboardType="numeric" value={customQty} onChangeText={setCustomQty} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabelText}>Calories *</Text>
                  <TextInput placeholder="e.g. 250" placeholderTextColor="#94A3B8" style={styles.formInputFieldReal} keyboardType="numeric" value={customCal} onChangeText={setCustomCal} />
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
                <Text style={styles.fieldLabelText}>Image URL (Optional)</Text>
                <TextInput placeholder="https://example.com/image.png" placeholderTextColor="#94A3B8" style={styles.formInputFieldReal} value={customImageUrl} onChangeText={setCustomImageUrl} />
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
              const isSelected = activeFoodLog.some(item => item.name === food);

              return (
                <TouchableOpacity
                  key={food}
                  activeOpacity={isSelected ? 1 : 0.7}
                  onPress={() => !isSelected && addFood(food)}
                  style={[styles.foodGridItemBox, isSelected && styles.foodGridItemBoxSelected]}
                >
                  <Image
                    source={FOOD_IMAGES[food] || FOOD_IMAGES['custom']}
                    style={[styles.foodItemIconPlaceholder, { backgroundColor: calorieDb[food]?.color || '#FFF6E8' }]}
                    resizeMode="contain"
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.foodItemGridTitle} numberOfLines={1}>{food}</Text>
                    <Text style={styles.foodItemGridSub}>{calorieDb[food]?.serving || '1 portion'}</Text>
                    <Text style={styles.foodItemGridCal}>{calorieDb[food]?.calories || 100} kcal</Text>
                  </View>

                  {!isSelected && (
                    <View style={styles.gridItemPlusButtonCircle}>
                      <Icon name="plus" size={14} color="#FFF" />
                    </View>
                  )}
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
              <TouchableOpacity
                style={styles.logHeaderClickToggle}
                onPress={() => { setIsLogExpanded(!isLogExpanded); setLogPage(0); }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.logSectionHeaderTitle}>Food Log Data</Text>
                  <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '500', marginTop: 2 }}>
                    {isLogExpanded ? `Expanded View (${activeFoodLog.length} total)` : `Showing 3 of ${activeFoodLog.length} items`}
                  </Text>
                </View>
                <View style={styles.arrowCollapseCircle}>
                  <Icon name={isLogExpanded ? "chevron-up" : "chevron-down"} size={18} color="#64748B" />
                </View>
              </TouchableOpacity>

              {visibleLogItems.map((item, index) => (
                <View key={index} style={styles.logRowItem}>
                  <Image source={item.image_url ? { uri: item.image_url } : (FOOD_IMAGES[item.name] || FOOD_IMAGES['custom'])} style={styles.logItemIconBoxMini} resizeMode="cover" />

                  <View style={{ flex: 1, marginLeft: 12, paddingRight: 4 }}>
                    <Text style={styles.logItemMainName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.logItemSubDetails}>{item.serving}</Text>
                  </View>

                  <Text style={styles.logItemCalCounter}>{item.calories * item.qty} kcal</Text>

                  <View style={styles.logActionButtonsContainer}>
                    <Text style={[styles.logItemQtyText, { marginRight: 12 }]}>x {item.qty}</Text>
                    <TouchableOpacity style={styles.logMinusButtonCircle} onPress={() => handleDeleteLog(item.id)}>
                      <Icon name="trash-2" size={14} color="#FF6B8A" />
                    </TouchableOpacity>
                  </View>
                </View>
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
            <TouchableOpacity style={styles.waterControlOpBtn} onPress={() => updateWaterCount(-1)}>
              <Icon name="minus" size={14} color="#FFF" />
            </TouchableOpacity>

            <View style={{ alignItems: 'center', minWidth: 50 }}>
              <Text style={styles.waterMainDisplayDigit}>{glasses}</Text>
              <Text style={styles.waterMainDisplaySubText}>Glasses</Text>
            </View>

            <TouchableOpacity style={[styles.waterControlOpBtn, { backgroundColor: '#00B4D8' }]} onPress={() => updateWaterCount(1)}>
              <Icon name="plus" size={14} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.visualGlassesRowDisplay}>
              {Array.from({ length: Math.max(waterGoal, glasses) }).map((_, idx) => (
                <Image
                  key={idx}
                  source={idx < glasses ? DASHBOARD_IMAGES.waterglass : DASHBOARD_IMAGES.emptywaterglass}
                  style={styles.panelWaterGlassImage}
                  resizeMode="contain"
                />
              ))}
            </View>
          </View>
        </View>

        {/* DYNAMIC SLEEP AND WEEKLY METRICS */}
        <View style={styles.bottomMetricsGridSplit}>
          {/* Dynamic Sleep Quality Card */}
          <TouchableOpacity 
            style={styles.whitePanelCardHalf} 
            activeOpacity={0.85}
            onPress={() => {
              setSleepHoursInput((metrics?.sleep_hours || 7.5).toString());
              setSleepQualityInput((metrics?.sleep_quality || 80).toString());
              setSleepModalVisible(true);
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.panelTitle}>🌙 Sleep</Text>
              <View style={[
                styles.sleepStatusBadge, 
                { backgroundColor: (metrics?.sleep_quality || 80) >= 80 ? '#DCFCE7' : (metrics?.sleep_quality || 80) >= 60 ? '#FEF3C7' : '#FEE2E2' }
              ]}>
                <Text style={[
                  styles.sleepStatusBadgeText,
                  { color: (metrics?.sleep_quality || 80) >= 80 ? '#16A34A' : (metrics?.sleep_quality || 80) >= 60 ? '#D97706' : '#DC2626' }
                ]}>
                  {(metrics?.sleep_quality || 80) >= 80 ? 'Optimal' : (metrics?.sleep_quality || 80) >= 60 ? 'Fair' : 'Tired'}
                </Text>
              </View>
            </View>

            <View style={styles.sleepVisualWrapper}>
              <View style={[
                styles.sleepRingOuterCircle,
                { borderColor: (metrics?.sleep_quality || 80) >= 80 ? '#10B981' : (metrics?.sleep_quality || 80) >= 60 ? '#F59E0B' : '#EF4444' }
              ]}>
                <Text style={styles.sleepRingPercentageText}>{metrics?.sleep_quality || 80}%</Text>
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.sleepMainHoursText}>{metrics?.sleep_hours ? `${metrics.sleep_hours} hrs` : '7.5 hrs'}</Text>
                <Text style={styles.sleepTimeLabel}>
                  Deep: <Text style={{ fontWeight: '700', color: '#1E293B' }}>{((metrics?.sleep_hours || 7.5) * 0.32).toFixed(1)}h</Text>
                </Text>
              </View>
            </View>

            <Text style={styles.tapToEditLabel}>Tap to adjust ✏️</Text>
          </TouchableOpacity>

          {/* Dynamic Weekly Steps Card */}
          <View style={styles.whitePanelCardHalf}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionTitle}>📈 Steps</Text>
              <Text style={styles.weeklyStepsSumText}>
                {trends?.datasets?.[0]?.data?.length 
                  ? `${Math.round(trends.datasets[0].data.reduce((a, b) => a + b, 0) / 1000)}k wk`
                  : `${Math.round((currentSteps * 7) / 1000)}k wk`}
              </Text>
            </View>

            <LineChart
              data={{
                labels: trends?.labels?.length ? trends.labels.map(l => l.charAt(0)) : ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
                datasets: [{ 
                  data: trends?.datasets?.[0]?.data?.length 
                    ? trends.datasets[0].data 
                    : [3200, 4100, 5600, 6200, 8100, 7500, Math.max(100, currentSteps)] 
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
              Avg: {trends?.datasets?.[0]?.data?.length 
                ? Math.round(trends.datasets[0].data.reduce((a, b) => a + b, 0) / trends.datasets[0].data.length).toLocaleString()
                : currentSteps.toLocaleString()} / day
            </Text>
          </View>
        </View>

        {/* MODAL TO ADJUST SLEEP */}
        <Modal visible={sleepModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlayContainer}>
            <View style={styles.modalContentCard}>
              <Text style={styles.modalTitleText}>Log Sleep Metrics 🌙</Text>
              <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
                Record your rest for {selectedDate}
              </Text>

              <Text style={styles.fieldLabelText}>Total Sleep (Hours):</Text>
              <TextInput
                style={[styles.formInputFieldReal, { marginBottom: 12 }]}
                keyboardType="numeric"
                value={sleepHoursInput}
                onChangeText={setSleepHoursInput}
                placeholder="e.g. 7.5"
              />

              <Text style={styles.fieldLabelText}>Sleep Quality (0 - 100%):</Text>
              <TextInput
                style={[styles.formInputFieldReal, { marginBottom: 20 }]}
                keyboardType="numeric"
                value={sleepQualityInput}
                onChangeText={setSleepQualityInput}
                placeholder="e.g. 85"
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity 
                  style={[styles.formAddButtonSubmit, { flex: 1, backgroundColor: '#E2E8F0' }]} 
                  onPress={() => setSleepModalVisible(false)}
                >
                  <Text style={[styles.formAddButtonSubmitText, { color: '#475569' }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.formAddButtonSubmit, { flex: 1, backgroundColor: '#4F46E5' }]} 
                  onPress={() => {
                    const hrs = parseFloat(sleepHoursInput) || 7.5;
                    const qual = parseInt(sleepQualityInput) || 80;
                    updateSleep(hrs, qual, selectedDate);
                    setSleepModalVisible(false);
                  }}
                >
                  <Text style={styles.formAddButtonSubmitText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
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
  foodItemIconPlaceholder: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  foodItemGridTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', textTransform: 'capitalize' },
  foodItemGridSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  foodItemGridCal: { fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 2 },
  gridItemPlusButtonCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FF6B8A', justifyContent: 'center', alignItems: 'center' },

  blueprintFormOutline: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, marginTop: 16, marginBottom: 20 },
  mandatoryWarningLabel: { fontSize: 11, color: '#FF4D4F', fontWeight: '600', marginBottom: 12 },
  fieldLabelText: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 },
  formInputFieldReal: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, height: 44, color: '#1E293B', fontSize: 14 },
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
  logHeaderClickToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  logSectionHeaderTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  logRowItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  logItemIconBoxMini: { width: 32, height: 32 },
  logItemMainName: { fontSize: 14, fontWeight: '700', color: '#1E293B', textTransform: 'capitalize' },
  logItemSubDetails: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  logItemCalCounter: { fontSize: 13, fontWeight: '700', color: '#475569', marginRight: 12 },
  logActionButtonsContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logMinusButtonCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF5F6', borderWidth: 1, borderColor: '#FFE4E8', justifyContent: 'center', alignItems: 'center' },
  logPlusButtonCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E9FFF1', borderWidth: 1, borderColor: '#C8F7D2', justifyContent: 'center', alignItems: 'center' },
  logItemQtyText: { fontSize: 14, fontWeight: '700', color: '#1E293B', minWidth: 14, textAlign: 'center' },

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
  tapToEditLabel: { fontSize: 11, fontWeight: '600', color: '#6366F1', marginTop: 8 },
  weeklyStepsSumText: { fontSize: 11, fontWeight: '800', color: '#10B981' },
  weeklyStepsAvgText: { fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 4 },
});

export default HealthTrackingScreen;