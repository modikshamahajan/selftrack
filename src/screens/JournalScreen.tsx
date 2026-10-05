import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Keyboard,
  Image, TextInput, Alert, KeyboardAvoidingView, Platform, Dimensions,
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather as Icon } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Spacing, Shadow } from '../theme/spacing';
import { getScreenBgColor } from '../theme/screenBgColors';
import Card from '../components/Card';
import MoodSelector, { MOODS } from '../components/MoodSelector';
import PopupModal from '../components/PopupModal';
import { useJournalStore } from '../store/useJournalStore';
import { useSettingsStore } from '../store/useSettingsStore';

// Layout Constants
const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_SPACING = 10;
const CONTAINER_PADDING = 40; 
const IMAGE_SIZE = (SCREEN_WIDTH - CONTAINER_PADDING - (GRID_SPACING * 2)) / 3;

interface JournalEntry {
  id: string;
  date: string;
  moodEmoji: string;
  title: string;
  preview: string;
  images: string[];
  entryDate: Date;
  hasVoice: boolean;
}

const MOOD_EMOJIS: Record<string, string> = {
  great: '🤩',
  good: '🙂',
  okay: '😐',
  bad: '😔',
  terrible: '😫',
};

const JournalScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { entries: storeEntries, fetchEntries } = useJournalStore();
  const privacyPrivateJournal = useSettingsStore((s) => s.settings.privacy_private_journal);
  const [isUnlocked, setIsUnlocked] = useState(!privacyPrivateJournal);

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedMood, setSelectedMood] = useState<string>('good');
  const [inputText, setInputText] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<'dates' | 'months'>('dates');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(new Date().getMonth());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<number>(new Date().getDate());
  const [selectedJournalDate, setSelectedJournalDate] = useState<Date>(new Date());
  const scrollViewRef = useRef<ScrollView>(null);
  
  const bgColor = getScreenBgColor('Journal');

  useEffect(() => {
    fetchEntries();
  }, []);

  // Sync backend store entries into local view
  useEffect(() => {
    if (storeEntries && storeEntries.length > 0) {
      const mapped: JournalEntry[] = storeEntries.map((item) => {
        const d = item.date ? new Date(item.date + 'T12:00:00') : new Date();
        return {
          id: item.id,
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          entryDate: d,
          moodEmoji: MOOD_EMOJIS[item.mood] || '🙂',
          title: item.title,
          preview: item.content,
          images: item.images || [],
          hasVoice: item.has_voice || false,
        };
      });
      setEntries(mapped);
    }
  }, [storeEntries]);

  const getTimelineDates = (pastDays = 60, futureDays = 30) => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - pastDays);

    const totalDays = pastDays + futureDays + 1;
    return Array.from({ length: totalDays }).map((_, i) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      return {
        key: date.toISOString().split('T')[0],
        date,
        dayLabel: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dateLabel: date.getDate(),
        monthLabel: date.toLocaleDateString('en-US', { month: 'short' }),
        isToday: date.toDateString() === today.toDateString(),
      };
    });
  };
  const timelineDays = useMemo(() => getTimelineDates(60, 30), []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollViewRef.current) {
        const idx = timelineDays.findIndex(td => td.date.toDateString() === selectedJournalDate.toDateString());
        if (idx >= 0) {
          const itemWidth = 84;
          const scrollX = Math.max(0, idx * itemWidth - (SCREEN_WIDTH / 2) + (itemWidth / 2));
          scrollViewRef.current.scrollTo({ x: scrollX, animated: true });
        }
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [selectedJournalDate, timelineDays]);

  const currentYear = new Date().getFullYear();
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getCalendarDates = (monthIndex: number, year: number) => {
    const firstDayIndex = new Date(year, monthIndex, 1).getDay();
    const lastDate = new Date(year, monthIndex + 1, 0).getDate();
    const calendarDates: Array<{ label: string; value?: number }> = [];
    for (let i = 0; i < firstDayIndex; i += 1) {
      calendarDates.push({ label: '' });
    }
    for (let date = 1; date <= lastDate; date += 1) {
      calendarDates.push({ label: date.toString(), value: date });
    }
    while (calendarDates.length % 7 !== 0) {
      calendarDates.push({ label: '' });
    }
    return calendarDates;
  };
  const calendarDates = getCalendarDates(selectedMonthIndex, currentYear);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Need photo access to add images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.6, // Slightly lowered for faster processing
    });

    if (!result.canceled) {
      setIsLoadingImages(true);
      try {
        const newUris = result.assets.map(asset => asset.uri);
        setSelectedImages(prev => [...prev, ...newUris]);
      } catch (error) {
        Alert.alert("Error", "Could not process images.");
      } finally {
        // Short timeout to ensure the UI thread can render the loader before finishing
        setTimeout(() => setIsLoadingImages(false), 500);
      }
    }
  };

  const removeImage = (index: number) => {
    const updated = [...selectedImages];
    updated.splice(index, 1);
    setSelectedImages(updated);
  };

  const baseTextRef = useRef('');

  useSpeechRecognitionEvent('start', () => {
    setIsRecording(true);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsRecording(false);
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsRecording(false);
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      console.log('Speech error:', event.message || event.error);
    }
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript;
    if (transcript) {
      const base = baseTextRef.current ? baseTextRef.current.trim() + ' ' : '';
      setInputText(base + transcript);
      if (event.isFinal) {
        baseTextRef.current = base + transcript;
      }
    }
  });

  const toggleSpeech = async () => {
    try {
      if (!ExpoSpeechRecognitionModule) {
        Alert.alert('Not Supported', 'Speech recognition is not available or supported on this device.');
        return;
      }
      if (!isRecording) {
        baseTextRef.current = inputText;
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (result.granted) {
          setIsRecording(true);
          await ExpoSpeechRecognitionModule.start({
            lang: 'en-US',
            interimResults: true,
            continuous: true,
          });
        } else {
          Alert.alert('Permission Required', 'Microphone permission is required for speech dictation.');
        }
      } else {
        setIsRecording(false);
        await ExpoSpeechRecognitionModule.stop();
      }
    } catch (e) {
      setIsRecording(false);
      Alert.alert('Speech Error', 'Failed to start speech recognition. ' + (e as Error).message);
    }
  };
  
  const handleSaveEntry = () => {
    Keyboard.dismiss();
    if (!inputText.trim()) return Alert.alert("Empty Journal", "Please write something first.");
    
    // 1. Generate Dynamic Date
    const now = new Date();
    const entryDate = new Date(selectedJournalDate);
    entryDate.setHours(now.getHours(), now.getMinutes());
    const formattedDate = `${entryDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} • ${entryDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

    // 2. Generate Dynamic Title based on Time
    const hour = now.getHours();
    let timeGreeting = "Morning Reflection";
    if (hour >= 12 && hour < 17) timeGreeting = "Afternoon Entry";
    if (hour >= 17 || hour < 5) timeGreeting = "Evening Thoughts";

    // 3. Find selected mood emoji from imported MOODS array
    const currentMoodObj = MOODS.find(m => m.id === selectedMood);

    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      date: formattedDate,
      entryDate,
      moodEmoji: currentMoodObj?.emoji || '🙂', 
      title: timeGreeting,
      preview: inputText,
      images: selectedImages,
      hasVoice: isRecording,
    };

    setEntries([newEntry, ...entries]);

    useJournalStore.getState().addEntry({
      title: timeGreeting,
      content: inputText.trim(),
      mood: selectedMood,
      mood_score: currentMoodObj ? 4 : 3,
      images: selectedImages,
      has_voice: isRecording,
      date: selectedJournalDate.toISOString().split('T')[0],
    }).catch(() => {});
    
    // Reset inputs
    setInputText('');
    setSelectedImages([]);
    setSelectedMood('good');
    setIsRecording(false);
  };

  const selectedDateEntries = entries.filter(
    entry => entry.entryDate.toDateString() === selectedJournalDate.toDateString(),
  );

  const applySelectedDate = () => {
    const d = new Date(currentYear, selectedMonthIndex, selectedCalendarDate);
    setSelectedJournalDate(d);
    setCalendarView('dates');
    setIsCalendarOpen(false);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}> 
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
      >
          <ScrollView 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 100, paddingTop: 16 }}
          >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Journal</Text>
            <TouchableOpacity style={styles.calendarBtn} onPress={() => setIsCalendarOpen(true)}>
              <Icon name="calendar" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Removed single-date card - entries are shown under Recent Entries now */}

          {/* Date timeline */}
          <View style={styles.weekContainer}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              nestedScrollEnabled={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weekStrip}
            >
              {timelineDays.map((day) => {
                const isSelected = day.date.toDateString() === selectedJournalDate.toDateString();
                return (
                  <TouchableOpacity
                    key={day.key}
                    style={[styles.dayItem, isSelected ? styles.dayItemSelected : (day.isToday && styles.dayItemToday)]}
                    onPress={() => setSelectedJournalDate(day.date)}
                  >
                    <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected, !isSelected && day.isToday && styles.dayLabelToday]}>{day.dayLabel}</Text>
                    <Text style={[styles.dayDate, isSelected && styles.dayDateSelected, !isSelected && day.isToday && styles.dayDateToday]}>{day.dateLabel}</Text>
                    <Text style={[styles.dayMonthLabel, isSelected && styles.dayMonthLabelActive]}>{day.monthLabel}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Mood Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How are you feeling?</Text>
            <MoodSelector selectedMood={selectedMood} onSelectMood={setSelectedMood} />
          </View>

          {/* Editor Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Write your thoughts</Text>
            <Card style={styles.inputCard}>
              <TextInput 
                style={styles.textInput}
                placeholder="How was your day?"
                multiline
                value={inputText}
                onChangeText={setInputText}
              />
              
              {/* Image Grid with Loader */}
              {(selectedImages.length > 0 || isLoadingImages) && (
                <View style={styles.imageGrid}>
                  {selectedImages.map((uri, index) => (
                    <View key={index} style={styles.gridImageWrapper}>
                      <Image source={{ uri }} style={styles.gridImage} />
                      <TouchableOpacity 
                        onPress={() => removeImage(index)} 
                        style={styles.removeBadge}
                      >
                        <Icon name="x" size={14} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  
                  {isLoadingImages && (
                    <View style={[styles.gridImage, styles.loaderSquare]}>
                      <ActivityIndicator color={Colors.primary} size="small" />
                      <Text style={styles.loadingText}>Adding...</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.inputActions}>
                <View style={styles.mediaButtons}>
                  <TouchableOpacity onPress={pickImage} style={styles.iconBtn}>
                    <Icon name="image" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={toggleSpeech} 
                    style={[styles.iconBtn, isRecording && styles.recordingBtn]}
                  >
                    <Icon name="mic" size={20} color={isRecording ? "#FFF" : Colors.primary} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEntry}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>

          

          {/* List of Entries */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Entries</Text>
            {selectedDateEntries.length === 0 ? (
              <Text style={styles.emptyText}>No entries for the selected date. Start writing!</Text>
            ) : (
              selectedDateEntries.map((entry) => (
                <Card key={entry.id} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <View style={styles.entryMeta}>
                      <Text style={styles.entryEmoji}>{entry.moodEmoji}</Text>
                      <View>
                        <Text style={styles.entryTitle}>{entry.title}</Text>
                        <Text style={styles.entryDate}>{entry.date}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.entryPreview}>{entry.preview}</Text>

                  {entry.images.length > 0 && (
                    <View style={[styles.imageGrid, { marginBottom: 10 }]}> 
                      {entry.images.map((uri, idx) => (
                        <Image key={idx} source={{ uri }} style={styles.gridImage} />
                      ))}
                    </View>
                  )}

                </Card>
              ))
            )}
          </View>

          <PopupModal
            visible={isCalendarOpen}
            onClose={() => setIsCalendarOpen(false)}
            title={`${currentYear}`}
            message="Choose a month to review entries or focus your journal."
            secondaryAction={{ title: 'Select', onPress: applySelectedDate }}
          >
            {calendarView === 'dates' ? (
              <>
                <TouchableOpacity
                  style={styles.calendarHeader}
                  onPress={() => setCalendarView('months')}
                >
                  <Text style={styles.calendarHeaderText}>{`${months[selectedMonthIndex]} ${currentYear}`}</Text>
                </TouchableOpacity>
                <View style={styles.weekdayRow}>
                  {weekdayLabels.map((label) => (
                    <Text key={label} style={styles.weekdayLabel}>{label}</Text>
                  ))}
                </View>
                <View style={styles.dateGrid}>
                  {calendarDates.map((item, index) => {
                    const isSelected = item.value === selectedCalendarDate;
                    return (
                      <TouchableOpacity
                        key={`${item.label}-${index}`}
                        style={[styles.dateCell, isSelected && styles.dateCellActive]}
                        disabled={!item.value}
                        onPress={() => item.value && setSelectedCalendarDate(item.value)}
                      >
                        <Text style={[styles.dateText, isSelected && styles.dateTextActive]}>{item.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : (
              <View style={styles.monthGrid}>
                {months.map((month, index) => {
                  const isSelected = index === selectedMonthIndex;
                  return (
                    <TouchableOpacity
                      key={month}
                      style={[styles.monthItem, isSelected && styles.monthItemActive]}
                      onPress={() => {
                        setSelectedMonthIndex(index);
                        setSelectedCalendarDate(1);
                        setCalendarView('dates');
                      }}
                    >
                      <Text style={[styles.monthLabel, isSelected && styles.monthLabelActive]}>{month}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </PopupModal>

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'android' ? 1 : 0, paddingBottom: Platform.OS === 'android' ? 1 : 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 2, paddingBottom: 16 },
  title: { ...Typography.heading2, color: Colors.textPrimary },
  calendarBtn: { padding: 8 },
  weekStrip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  dayItem: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: BorderRadius.xl, marginRight: 12, backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.borderLight, minWidth: 78 },
  dayItemActive: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark, borderWidth: 1 },
  dayLabel: { ...Typography.caption, color: Colors.textSecondary, marginBottom: 4 },
  dayLabelActive: { color: Colors.textWhite },
  dayDate: { ...Typography.subtitle, fontWeight: '600', color: Colors.textPrimary },
  dayDateActive: { color: Colors.textWhite },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { ...Typography.subtitle, fontWeight: '600', color: Colors.textPrimary, marginBottom: 12, marginTop: 5 },
  selectedDateCard: { padding: Spacing.base, borderRadius: BorderRadius.xl, backgroundColor: Colors.card, marginTop: 8 },
  selectedDateTitle: { ...Typography.subtitle, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  selectedDateEntry: { marginBottom: 10 },
  inputCard: { padding: Spacing.base, borderRadius: BorderRadius.xl, backgroundColor: Colors.card },
  textInput: { ...Typography.body, minHeight: 80, textAlignVertical: 'top', color: Colors.textPrimary },
  inputActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  mediaButtons: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 8, borderRadius: 12, backgroundColor: Colors.primarySoft },
  recordingBtn: { backgroundColor: Colors.error },
  saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.md },
  saveBtnText: { color: Colors.textWhite, fontWeight: '600' },
  
  // Image Grid Styles
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_SPACING, marginTop: 10 },
  gridImageWrapper: { position: 'relative' },
  gridImage: { width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: BorderRadius.md, backgroundColor: Colors.background, resizeMode: 'cover' },
  removeBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: Colors.error, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  
  // Loader Styles
  loaderSquare: { justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primarySoft, borderWidth: 1, borderColor: Colors.primary, borderStyle: 'dashed' },
  loadingText: { ...Typography.caption, color: Colors.primary, fontSize: 10, marginTop: 4 },

  entryCard: { marginBottom: 12, padding: Spacing.base, borderRadius: BorderRadius.xl, backgroundColor: Colors.card, ...Shadow.sm },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  entryEmoji: { fontSize: 24 },
  entryTitle: { ...Typography.body, fontWeight: '600', color: Colors.textPrimary },
  entryDate: { ...Typography.caption, color: Colors.textTertiary },
  entryPreview: { ...Typography.body, color: Colors.textSecondary },
  emptyText: { ...Typography.body, color: Colors.textTertiary, textAlign: 'center', marginTop: 20 },
  monthGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 8 },
  monthItem: { width: '30%', paddingVertical: 14, borderRadius: BorderRadius.lg, backgroundColor: Colors.secondaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  monthItemActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondaryDark, borderWidth: 1 },
  monthLabel: { ...Typography.body, color: Colors.textPrimary },
  monthLabelActive: { color: Colors.textWhite, fontWeight: '700' },
  calendarHeader: { width: '100%', paddingVertical: 14, borderRadius: BorderRadius.xl, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  calendarHeaderText: { ...Typography.subtitle, color: Colors.textWhite, fontWeight: '700' },
  weekdayRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  weekdayLabel: { ...Typography.caption, color: Colors.textSecondary, width: `${100 / 7}%`, textAlign: 'center' },
  dateGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  dateCell: { flexBasis: '14.2857%', maxWidth: '14.2857%', minWidth: 38, flexGrow: 0, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 6, borderRadius: BorderRadius.md },
  dateCellActive: { backgroundColor: Colors.primarySoft },
  dateText: { ...Typography.body, color: Colors.textPrimary },
  dateTextActive: { color: Colors.primary },
  weekContainer: { paddingVertical: 8 },
  dayItemSelected: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark, borderWidth: 2 },
  dayItemToday: { borderColor: Colors.primary, borderWidth: 2 },
  dayMonthLabel: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4 },
  dayMonthLabelActive: { color: Colors.textWhite },
  dayLabelToday: { color: Colors.textSecondary, fontWeight: '600' },
  dayDateToday: { color: Colors.primary, fontWeight: '700' },
  dayLabelSelected: { color: Colors.textWhite },
  dayDateSelected: { color: Colors.textWhite },
});

export default JournalScreen;

