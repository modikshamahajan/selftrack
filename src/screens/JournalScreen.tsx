import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Keyboard,
  Image, TextInput, Alert, KeyboardAvoidingView, Platform, Dimensions,
  ActivityIndicator, Modal, TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = (_event: string, _callback: any) => { };

try {
  const speechPkg = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = speechPkg.ExpoSpeechRecognitionModule;
  if (typeof speechPkg.useSpeechRecognitionEvent === 'function') {
    useSpeechRecognitionEvent = speechPkg.useSpeechRecognitionEvent;
  }
} catch {
  // Gracefully fallback when native module is absent in Expo Go
}

import { Colors } from '../theme/colors';
import { BorderRadius, Spacing, Shadow } from '../theme/spacing';
import { getScreenBgColor } from '../theme/screenBgColors';
import Card from '../components/Card';
import PopupModal from '../components/PopupModal';
import { useJournalStore } from '../store/useJournalStore';
import { useSettingsStore } from '../store/useSettingsStore';

// Layout Constants
const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_SPACING = 8;
const CONTAINER_PADDING = 32;
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
  activities?: string[];
}

interface MoodOption {
  id: string;
  emoji: string;
  label: string;
  tag: string;
  softBg: string;
  activeBg: [string, string];
  color: string;
  borderColor: string;
}

const MOOD_COLOR_PANEL: MoodOption[] = [
  {
    id: 'great',
    emoji: '🤩',
    label: 'Great',
    tag: 'Radiant',
    softBg: '#FEF3C7',
    activeBg: ['#F59E0B', '#D97706'],
    color: '#B45309',
    borderColor: '#F59E0B',
  },
  {
    id: 'good',
    emoji: '😊',
    label: 'Good',
    tag: 'Joyful',
    softBg: '#D1FAE5',
    activeBg: ['#10B981', '#059669'],
    color: '#047857',
    borderColor: '#10B981',
  },
  {
    id: 'okay',
    emoji: '😌',
    label: 'Okay',
    tag: 'Peaceful',
    softBg: '#CFFAFE',
    activeBg: ['#06B6D4', '#0891B2'],
    color: '#0e7490',
    borderColor: '#06B6D4',
  },
  {
    id: 'bad',
    emoji: '😔',
    label: 'Bad',
    tag: 'Low',
    softBg: '#EDE9FE',
    activeBg: ['#8B5CF6', '#6D28D9'],
    color: '#6d28d9',
    borderColor: '#8B5CF6',
  },
  {
    id: 'awful',
    emoji: '😫',
    label: 'Awful',
    tag: 'Stressed',
    softBg: '#FFE4E6',
    activeBg: ['#F43F5E', '#BE123C'],
    color: '#be123c',
    borderColor: '#F43F5E',
  },
];

const MOOD_ACTIVITIES = [
  { id: 'exercise', label: 'Workout', emoji: '🏃‍♂️', color: '#10B981' },
  { id: 'sleep', label: 'Good Sleep', emoji: '💤', color: '#6366F1' },
  { id: 'walk', label: 'Nature Walk', emoji: '🌿', color: '#059669' },
  { id: 'work', label: 'Productive', emoji: '💼', color: '#F59E0B' },
  { id: 'friends', label: 'Friends', emoji: '👥', color: '#EC4899' },
  { id: 'meditation', label: 'Mindful', emoji: '🧘', color: '#8B5CF6' },
  { id: 'food', label: 'Good Food', emoji: '🥗', color: '#14B8A6' },
  { id: 'reading', label: 'Reading', emoji: '📚', color: '#3B82F6' },
  { id: 'music', label: 'Music', emoji: '🎵', color: '#F43F5E' },
  { id: 'relax', label: 'Relaxation', emoji: '🛀', color: '#06B6D4' },
];

const MOOD_EMOJIS: Record<string, string> = {
  great: '🤩',
  good: '😊',
  okay: '😌',
  bad: '😔',
  awful: '😫',
  terrible: '😫',
};

const PROMPT_SUGGESTIONS = [
  "What made you smile today? 😊",
  "What is one challenge you navigated through? 💪",
  "Who inspired you or showed kindness recently? 🌟",
  "What are you deeply grateful for right now? 🌿",
  "What did you learn about yourself today? 📖"
];

export type FormatType = 'bold' | 'italic' | 'h1' | 'h2' | 'bullet' | 'number' | 'check' | 'quote' | 'code';

interface FormatConfigItem {
  title: string;
  badge: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  iconBg: string;
  iconColor: string;
  placeholder: string;
  description: string;
  prefix: string;
  suffix: string;
  isBlock?: boolean;
}

const FORMAT_CONFIG: Record<FormatType, FormatConfigItem> = {
  bold: {
    title: 'Bold Text',
    badge: 'B',
    icon: 'bold',
    iconBg: '#EEF2FF',
    iconColor: '#4F46E5',
    placeholder: 'Enter bold text...',
    description: 'Text will appear in strong bold font',
    prefix: '**',
    suffix: '**',
  },
  italic: {
    title: 'Italic Text',
    badge: 'I',
    icon: 'italic',
    iconBg: '#F5F3FF',
    iconColor: '#7C3AED',
    placeholder: 'Enter italic text...',
    description: 'Text will appear in soft italic font',
    prefix: '*',
    suffix: '*',
  },
  h1: {
    title: 'Heading 1',
    badge: 'H1',
    icon: 'type',
    iconBg: '#ECFDF5',
    iconColor: '#059669',
    placeholder: 'Enter section heading...',
    description: 'Large title header for your section',
    prefix: '\n# ',
    suffix: '\n',
    isBlock: true,
  },
  h2: {
    title: 'Heading 2',
    badge: 'H2',
    icon: 'type',
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    placeholder: 'Enter subsection heading...',
    description: 'Medium subsection header',
    prefix: '\n## ',
    suffix: '\n',
    isBlock: true,
  },
  bullet: {
    title: 'Bullet Point',
    badge: '•',
    icon: 'list',
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    placeholder: 'Enter list item...',
    description: 'Adds a bullet list item with dot',
    prefix: '\n• ',
    suffix: '\n',
    isBlock: true,
  },
  number: {
    title: 'Numbered Item',
    badge: '1.',
    icon: 'hash',
    iconBg: '#FEF2F2',
    iconColor: '#DC2626',
    placeholder: 'Enter numbered item...',
    description: 'Adds an ordered list item',
    prefix: '\n1. ',
    suffix: '\n',
    isBlock: true,
  },
  check: {
    title: 'Checklist Task',
    badge: '☐',
    icon: 'check-square',
    iconBg: '#F0FDF4',
    iconColor: '#16A34A',
    placeholder: 'Enter action item...',
    description: 'Adds a task item to your reflection',
    prefix: '\n[ ] ',
    suffix: '\n',
    isBlock: true,
  },
  quote: {
    title: 'Reflection Quote',
    badge: '❝',
    icon: 'message-circle',
    iconBg: '#FDF4FF',
    iconColor: '#C026D3',
    placeholder: 'Enter thought or quote...',
    description: 'Displays inside a highlighted quote card',
    prefix: '\n> ',
    suffix: '\n',
    isBlock: true,
  },
  code: {
    title: 'Highlighted Keyword / Code',
    badge: '</>',
    icon: 'code',
    iconBg: '#F1F5F9',
    iconColor: '#475569',
    placeholder: 'Enter keyword or code...',
    description: 'Highlights text in a monospaced badge',
    prefix: '`',
    suffix: '`',
  },
};

// Rich Markdown Parser Component for formatted preview & feed cards
const MarkdownRenderer: React.FC<{ content: string; style?: any }> = ({ content, style }) => {
  if (!content) return null;

  const lines = content.split('\n');

  const renderInlineFormatted = (text: string) => {
    // Regex splits bold (**...** or __...__), italic (*...* or _..._), and code (`...`)
    const parts = text.split(/(\*\*.*?\*\*|__.*?__|\*.*?\*|_.*?_|`.*?`)/g);

    return parts.map((part, idx) => {
      if ((part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
          (part.startsWith('__') && part.endsWith('__') && part.length >= 4)) {
        return (
          <Text key={idx} style={{ fontWeight: '700', color: '#0F172A' }}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      if ((part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
          (part.startsWith('_') && part.endsWith('_') && part.length >= 2)) {
        return (
          <Text key={idx} style={{ fontStyle: 'italic', color: '#334155' }}>
            {part.slice(1, -1)}
          </Text>
        );
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <Text
            key={idx}
            style={{
              fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
              backgroundColor: '#F1F5F9',
              color: '#6366F1',
              paddingHorizontal: 5,
              paddingVertical: 1,
              borderRadius: 4,
            }}
          >
            {part.slice(1, -1)}
          </Text>
        );
      }
      return <Text key={idx}>{part}</Text>;
    });
  };

  return (
    <View style={style}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        // Heading 1 (# ...)
        if (trimmed.startsWith('# ')) {
          return (
            <Text key={lineIdx} style={mdStyles.h1}>
              {renderInlineFormatted(trimmed.slice(2))}
            </Text>
          );
        }

        // Heading 2 (## ...)
        if (trimmed.startsWith('## ')) {
          return (
            <Text key={lineIdx} style={mdStyles.h2}>
              {renderInlineFormatted(trimmed.slice(3))}
            </Text>
          );
        }

        // Heading 3 (### ...)
        if (trimmed.startsWith('### ')) {
          return (
            <Text key={lineIdx} style={mdStyles.h3}>
              {renderInlineFormatted(trimmed.slice(4))}
            </Text>
          );
        }

        // Blockquote (> ...)
        if (trimmed.startsWith('> ') || trimmed === '>') {
          return (
            <View key={lineIdx} style={mdStyles.blockquote}>
              <Text style={mdStyles.blockquoteText}>
                {renderInlineFormatted(trimmed.slice(2))}
              </Text>
            </View>
          );
        }

        // Bullet list (- ... or • ... or * ...)
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || (trimmed.startsWith('* ') && !trimmed.endsWith('*'))) {
          return (
            <View key={lineIdx} style={mdStyles.bulletRow}>
              <Text style={mdStyles.bulletDot}>•</Text>
              <Text style={mdStyles.bulletText}>
                {renderInlineFormatted(trimmed.slice(2))}
              </Text>
            </View>
          );
        }

        // Checklist ([ ] or [x])
        if (trimmed.startsWith('[ ] ') || trimmed.startsWith('[x] ') || trimmed.startsWith('[X] ')) {
          const checked = trimmed.startsWith('[x] ') || trimmed.startsWith('[X] ');
          return (
            <View key={lineIdx} style={mdStyles.checkRow}>
              <Text style={[mdStyles.checkBoxMark, checked && mdStyles.checkBoxChecked]}>
                {checked ? '☑' : '☐'}
              </Text>
              <Text style={[mdStyles.checkText, checked && mdStyles.checkTextDone]}>
                {renderInlineFormatted(trimmed.slice(4))}
              </Text>
            </View>
          );
        }

        // Numbered list (1. ...)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <View key={lineIdx} style={mdStyles.bulletRow}>
              <Text style={mdStyles.numberPrefix}>{numMatch[1]}.</Text>
              <Text style={mdStyles.bulletText}>
                {renderInlineFormatted(numMatch[2])}
              </Text>
            </View>
          );
        }

        // Empty line spacer
        if (!trimmed) {
          return <View key={lineIdx} style={{ height: 6 }} />;
        }

        // Regular Paragraph
        return (
          <Text key={lineIdx} style={mdStyles.paragraph}>
            {renderInlineFormatted(line)}
          </Text>
        );
      })}
    </View>
  );
};

const mdStyles = StyleSheet.create({
  h1: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginTop: 8, marginBottom: 4 },
  h2: { fontSize: 17, fontWeight: '700', color: '#1E293B', marginTop: 6, marginBottom: 3 },
  h3: { fontSize: 15, fontWeight: '700', color: '#334155', marginTop: 4, marginBottom: 2 },
  paragraph: { fontSize: 14, color: '#334155', lineHeight: 22, marginBottom: 4 },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
    paddingLeft: 10,
    backgroundColor: '#F8FAFC',
    paddingVertical: 4,
    marginVertical: 4,
    borderRadius: 4,
  },
  blockquoteText: { fontSize: 13, fontStyle: 'italic', color: '#4F46E5', lineHeight: 20 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 2, paddingLeft: 4 },
  bulletDot: { fontSize: 14, color: '#6366F1', marginRight: 6, fontWeight: '700' },
  bulletText: { flex: 1, fontSize: 14, color: '#334155', lineHeight: 21 },
  numberPrefix: { fontSize: 13, fontWeight: '700', color: '#6366F1', marginRight: 6, minWidth: 16 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  checkBoxMark: { fontSize: 16, color: '#94A3B8', marginRight: 8 },
  checkBoxChecked: { color: '#10B981' },
  checkText: { flex: 1, fontSize: 14, color: '#334155' },
  checkTextDone: { textDecorationLine: 'line-through', color: '#94A3B8' },
});

const JournalScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { entries: storeEntries, fetchEntries } = useJournalStore();
  const privacyPrivateJournal = useSettingsStore((s) => s.settings.privacy_private_journal);

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedMood, setSelectedMood] = useState<string>('good');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  // Weekly slider state
  const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = current week, -1 = last week, +1 = next week
  const [selectedJournalDate, setSelectedJournalDate] = useState<Date>(new Date());

  // Calendar modal state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<'dates' | 'months'>('dates');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(new Date().getMonth());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<number>(new Date().getDate());

  const [activePromptIndex, setActivePromptIndex] = useState(0);
  const baseTextRef = useRef('');

  // Unified Rich Editor State
  const [segments, setSegments] = useState<
    Array<{ id: string; text: string; format: FormatType | 'normal'; checked?: boolean }>
  >([]);
  const [activeInputText, setActiveInputText] = useState<string>('');
  const [activeFormat, setActiveFormat] = useState<FormatType | null>(null);
  const textInputRef = useRef<TextInput>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Helper to calculate the next sequence number for a numbered list
  const getNextListNumber = (
    segs: Array<{ id: string; text: string; format: FormatType | 'normal'; checked?: boolean }>
  ) => {
    let count = 0;
    for (let i = segs.length - 1; i >= 0; i--) {
      if (segs[i].format === 'number') {
        count++;
      } else {
        break;
      }
    }
    return count + 1;
  };

  // Helper to calculate item number of a committed segment in its list
  const getSegmentNumber = (
    segs: Array<{ id: string; text: string; format: FormatType | 'normal'; checked?: boolean }>,
    index: number
  ) => {
    let num = 1;
    for (let i = index - 1; i >= 0; i--) {
      if (segs[i].format === 'number') {
        num++;
      } else {
        break;
      }
    }
    return num;
  };

  // Serializes segments + active input into standard markdown for storing & store sync
  const serializeToMarkdown = (
    segs: Array<{ id: string; text: string; format: FormatType | 'normal'; checked?: boolean }>,
    activeText: string,
    activeFmt: FormatType | null
  ): string => {
    const all = [...segs];
    if (activeText) {
      all.push({
        id: 'active',
        text: activeText,
        format: activeFmt || 'normal',
      });
    }

    let md = '';
    let currentNumber = 1;

    all.forEach((seg) => {
      const text = seg.text?.trim();
      if (!text) return;
      if (text === '\n') {
        md += '\n';
        currentNumber = 1;
        return;
      }

      switch (seg.format) {
        case 'bold':
          md += `**${text}** `;
          currentNumber = 1;
          break;
        case 'italic':
          md += `*${text}* `;
          currentNumber = 1;
          break;
        case 'h1':
          md += `\n# ${text}\n`;
          currentNumber = 1;
          break;
        case 'h2':
          md += `\n## ${text}\n`;
          currentNumber = 1;
          break;
        case 'bullet':
          md += `\n• ${text}\n`;
          currentNumber = 1;
          break;
        case 'number':
          md += `\n${currentNumber}. ${text}\n`;
          currentNumber++;
          break;
        case 'check':
          md += `\n${seg.checked ? '[x]' : '[ ]'} ${text}\n`;
          currentNumber = 1;
          break;
        case 'quote':
          md += `\n> ${text}\n`;
          currentNumber = 1;
          break;
        case 'code':
          md += `\`${text}\` `;
          currentNumber = 1;
          break;
        default:
          md += text + ' ';
          currentNumber = 1;
          break;
      }
    });

    return md.trim();
  };

  // Toggle or select format from toolbar
  const toggleFormat = (format: FormatType) => {
    if (activeFormat === format) {
      // DESELECT: Commit currently typed text under this format, and return to normal text!
      if (activeInputText.trim()) {
        const newSeg: { id: string; text: string; format: FormatType | 'normal' } = {
          id: `seg_${Date.now()}_${Math.random()}`,
          text: activeInputText.trim(),
          format: activeFormat,
        };
        const updated = [...segments, newSeg];
        setSegments(updated);
        setActiveInputText('');
        setInputText(serializeToMarkdown(updated, '', null));
      }
      setActiveFormat(null);
    } else {
      // SELECT NEW FORMAT: Commit current text if any under previous format, then activate new format!
      let updated = segments;
      if (activeInputText.trim()) {
        const newSeg: { id: string; text: string; format: FormatType | 'normal' } = {
          id: `seg_${Date.now()}_${Math.random()}`,
          text: activeInputText.trim(),
          format: activeFormat || 'normal',
        };
        updated = [...segments, newSeg];
        setSegments(updated);
        setActiveInputText('');
      }
      setActiveFormat(format);
      setInputText(serializeToMarkdown(updated, '', format));
    }
    // Reliable auto-focus ensuring keyboard opens/stays open
    requestAnimationFrame(() => {
      textInputRef.current?.focus();
    });
    setTimeout(() => textInputRef.current?.focus(), 60);
  };

  // Handles typing & auto-advancement on Enter key for bullet, number (1. -> 2.), checklist, etc.
  const handleActiveInputChange = (text: string) => {
    if (text.includes('\n')) {
      const parts = text.split('\n');
      const committedLine = parts[0];
      const remainingNewText = parts.slice(1).join('\n');

      // If user pressed Enter on an empty list item (e.g. empty '2. ' or '• ')
      if (!committedLine.trim() && !activeInputText.trim()) {
        // Exit/cancel current list mode and return to normal text!
        setActiveFormat(null);
        setActiveInputText(remainingNewText);
        setInputText(serializeToMarkdown(segments, remainingNewText, null));
        return;
      }

      const textToCommit = (committedLine || activeInputText).trim();
      let updatedSegments = segments;
      if (textToCommit) {
        const newSeg: { id: string; text: string; format: FormatType | 'normal' } = {
          id: `seg_${Date.now()}_${Math.random()}`,
          text: textToCommit,
          format: activeFormat || 'normal',
        };
        updatedSegments = [...segments, newSeg];
        setSegments(updatedSegments);
      }

      // Next line formatting:
      let nextFormat: FormatType | null = activeFormat;
      if (activeFormat === 'h1' || activeFormat === 'h2') {
        nextFormat = null; // Headings are single-line; return to normal text
      } else if (activeFormat === 'bullet' || activeFormat === 'number' || activeFormat === 'check') {
        nextFormat = activeFormat; // Lists auto-continue to next line!
      }

      setActiveFormat(nextFormat);
      setActiveInputText(remainingNewText);
      setInputText(serializeToMarkdown(updatedSegments, remainingNewText, nextFormat));
      return;
    }

    // Regular live typing
    setActiveInputText(text);
    setInputText(serializeToMarkdown(segments, text, activeFormat));
  };

  const handleKeyPress = ({ nativeEvent }: any) => {
    if (nativeEvent.key === 'Backspace' && activeInputText === '') {
      if (activeFormat) {
        // Cancel active format mode
        setActiveFormat(null);
      } else if (segments.length > 0) {
        // Pop previous segment into active input for continuous fluid typing
        const lastSeg = segments[segments.length - 1];
        const remaining = segments.slice(0, -1);
        setSegments(remaining);
        setActiveInputText(lastSeg.text);
        const prevFormat = lastSeg.format === 'normal' ? null : (lastSeg.format as FormatType);
        setActiveFormat(prevFormat);
        setInputText(serializeToMarkdown(remaining, lastSeg.text, prevFormat));
      }
    }
  };

  const handleToggleCheckSegment = (index: number) => {
    const updated = segments.map((s, i) => {
      if (i === index) {
        return { ...s, checked: !s.checked };
      }
      return s;
    });
    setSegments(updated);
    setInputText(serializeToMarkdown(updated, activeInputText, activeFormat));
  };

  const handleEditSegment = (index: number) => {
    const target = segments[index];
    const remaining = segments.filter((_, i) => i !== index);
    let updatedSegments = remaining;
    if (activeInputText.trim()) {
      updatedSegments = [
        ...remaining,
        {
          id: `seg_${Date.now()}_${Math.random()}`,
          text: activeInputText.trim(),
          format: activeFormat || 'normal',
        },
      ];
    }
    setSegments(updatedSegments);
    setActiveInputText(target.text);
    const targetFormat = target.format === 'normal' ? null : (target.format as FormatType);
    setActiveFormat(targetFormat);
    setInputText(serializeToMarkdown(updatedSegments, target.text, targetFormat));
    setTimeout(() => textInputRef.current?.focus(), 50);
  };

  const handleClearEditor = () => {
    if (segments.length > 1 || activeInputText.length > 40) {
      Alert.alert(
        'Clear Reflection Note',
        'Are you sure you want to clear your current note and start fresh?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear All',
            style: 'destructive',
            onPress: () => {
              setSegments([]);
              setActiveInputText('');
              setActiveFormat(null);
              setInputText('');
              setTimeout(() => textInputRef.current?.focus(), 50);
            },
          },
        ]
      );
    } else {
      setSegments([]);
      setActiveInputText('');
      setActiveFormat(null);
      setInputText('');
      setTimeout(() => textInputRef.current?.focus(), 50);
    }
  };

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
          moodEmoji: MOOD_EMOJIS[item.mood] || '😊',
          title: item.title,
          preview: item.content,
          images: item.images || [],
          hasVoice: item.has_voice || false,
          activities: item.tags || [],
        };
      });
      setEntries(mapped);
    }
  }, [storeEntries]);

  // Compute 7-day week array based on weekOffset
  const activeWeekDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate Monday of the targeted week
    const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday + weekOffset * 7);

    const todayStr = new Date().toDateString();

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        key: d.toISOString().split('T')[0],
        date: d,
        dayLabel: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dateLabel: d.getDate(),
        monthLabel: d.toLocaleDateString('en-US', { month: 'short' }),
        isToday: d.toDateString() === todayStr,
      };
    });
  }, [weekOffset]);

  const isTodaySelected = selectedJournalDate.toDateString() === new Date().toDateString();

  const handleJumpToToday = () => {
    setSelectedJournalDate(new Date());
    setWeekOffset(0);
  };

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

  const applySelectedDate = () => {
    const d = new Date(currentYear, selectedMonthIndex, selectedCalendarDate);
    setSelectedJournalDate(d);

    // Adjust weekOffset to align with selected date
    const today = new Date();
    const diffTime = d.getTime() - today.getTime();
    const diffWeeks = Math.round(diffTime / (7 * 24 * 60 * 60 * 1000));
    setWeekOffset(diffWeeks);

    setCalendarView('dates');
    setIsCalendarOpen(false);
  };

  const toggleActivity = (actId: string) => {
    setSelectedActivities((prev) =>
      prev.includes(actId) ? prev.filter(a => a !== actId) : [...prev, actId]
    );
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Need photo library access to attach memories.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setIsLoadingImages(true);
      try {
        const newUris = result.assets.map(asset => asset.uri);
        setSelectedImages(prev => [...prev, ...newUris]);
      } catch {
        Alert.alert("Error", "Could not process images.");
      } finally {
        setTimeout(() => setIsLoadingImages(false), 400);
      }
    }
  };

  const removeImage = (index: number) => {
    const updated = [...selectedImages];
    updated.splice(index, 1);
    setSelectedImages(updated);
  };

  useSpeechRecognitionEvent('start', () => {
    setIsRecording(true);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsRecording(false);
  });

  useSpeechRecognitionEvent('error', (event: any) => {
    setIsRecording(false);
    if (event?.error !== 'no-speech' && event?.error !== 'aborted') {
      console.log('Speech error:', event?.message || event?.error);
    }
  });

  useSpeechRecognitionEvent('result', (event: any) => {
    const transcript = event?.results?.[0]?.transcript;
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
        Alert.alert('Speech Unsupported', 'Speech recognition is not available in Expo Go. Please type directly.');
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
          Alert.alert('Permission Required', 'Microphone permission is needed for speech dictation.');
        }
      } else {
        setIsRecording(false);
        await ExpoSpeechRecognitionModule.stop();
      }
    } catch (e) {
      setIsRecording(false);
      Alert.alert('Speech Error', 'Failed to toggle voice recognition: ' + (e as Error).message);
    }
  };

  const handleSaveEntry = () => {
    Keyboard.dismiss();
    const fullContent = serializeToMarkdown(segments, activeInputText, activeFormat);
    if (!fullContent.trim()) {
      return Alert.alert("Empty Reflection", "Please write a thought or reflection before saving.");
    }

    const now = new Date();
    const entryDate = new Date(selectedJournalDate);
    entryDate.setHours(now.getHours(), now.getMinutes());
    const formattedDate = `${entryDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} • ${entryDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

    const hour = now.getHours();
    let timeGreeting = "Morning Reflection";
    if (hour >= 12 && hour < 17) timeGreeting = "Afternoon Entry";
    if (hour >= 17 || hour < 5) timeGreeting = "Evening Thoughts";

    const currentMoodObj = MOOD_COLOR_PANEL.find(m => m.id === selectedMood);

    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      date: formattedDate,
      entryDate,
      moodEmoji: currentMoodObj?.emoji || '😊',
      title: timeGreeting,
      preview: fullContent.trim(),
      images: selectedImages,
      hasVoice: isRecording,
      activities: selectedActivities,
    };

    setEntries([newEntry, ...entries]);

    useJournalStore.getState().addEntry({
      title: timeGreeting,
      content: fullContent.trim(),
      mood: selectedMood,
      mood_score: currentMoodObj ? 4 : 3,
      images: selectedImages,
      has_voice: isRecording,
      tags: selectedActivities,
      date: selectedJournalDate.toISOString().split('T')[0],
    }).catch(() => { });

    setSegments([]);
    setActiveInputText('');
    setActiveFormat(null);
    setInputText('');
    setSelectedImages([]);
    setSelectedActivities([]);
    setIsRecording(false);
  };

  const selectedDateEntries = entries.filter(
    entry => entry.entryDate.toDateString() === selectedJournalDate.toDateString(),
  );

  const rotatePrompt = () => {
    setActivePromptIndex((prev) => (prev + 1) % PROMPT_SUGGESTIONS.length);
  };

  const getActiveInputTextStyle = (format: FormatType | null) => {
    switch (format) {
      case 'bold':
        return {
          fontWeight: '700' as const,
          color: '#0F172A',
          fontSize: 16,
          lineHeight: 22,
        };
      case 'italic':
        return {
          fontStyle: 'italic' as const,
          color: '#334155',
          fontSize: 15,
          lineHeight: 22,
        };
      case 'h1':
        return {
          fontSize: 20,
          fontWeight: '800' as const,
          color: '#0F172A',
          lineHeight: 26,
          marginTop: 2,
          marginBottom: 2,
        };
      case 'h2':
        return {
          fontSize: 17,
          fontWeight: '700' as const,
          color: '#1E293B',
          lineHeight: 24,
          marginTop: 2,
          marginBottom: 2,
        };
      case 'bullet':
      case 'number':
      case 'check':
        return {
          fontSize: 15,
          color: '#0F172A',
          lineHeight: 22,
        };
      case 'quote':
        return {
          fontSize: 14,
          fontStyle: 'italic' as const,
          color: '#4F46E5',
          lineHeight: 22,
        };
      case 'code':
        return {
          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
          color: '#4F46E5',
          fontSize: 14,
          backgroundColor: '#EEF2FF',
          paddingHorizontal: 4,
          borderRadius: 4,
        };
      default:
        return {
          fontSize: 15,
          color: '#0F172A',
          fontWeight: '400' as const,
          lineHeight: 22,
        };
    }
  };

  const renderActiveFormatPrefix = (format: FormatType | null) => {
    if (format === 'bullet') {
      return (
        <View style={styles.prefixContainer}>
          <Text style={mdStyles.bulletDot}>•</Text>
        </View>
      );
    }
    if (format === 'number') {
      const nextNum = getNextListNumber(segments);
      return (
        <View style={styles.prefixContainer}>
          <Text style={mdStyles.numberPrefix}>{nextNum}.</Text>
        </View>
      );
    }
    if (format === 'check') {
      return (
        <View style={styles.prefixContainer}>
          <Text style={mdStyles.checkBoxMark}>☐</Text>
        </View>
      );
    }
    return null;
  };

  const getActiveRowStyle = (format: FormatType | null) => {
    if (format === 'quote') {
      return mdStyles.blockquote;
    }
    if (format === 'code') {
      return {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
      };
    }
    if (format === 'bullet' || format === 'number') {
      return mdStyles.bulletRow;
    }
    if (format === 'check') {
      return mdStyles.checkRow;
    }
    return null;
  };

  const renderSegmentItem = (
    seg: { id: string; text: string; format: FormatType | 'normal'; checked?: boolean },
    index: number
  ) => {
    if (seg.text === '\n') {
      return <View style={{ height: 6 }} />;
    }

    switch (seg.format) {
      case 'bold':
        return (
          <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: 16, lineHeight: 22 }}>
            {seg.text}
          </Text>
        );
      case 'italic':
        return (
          <Text style={{ fontStyle: 'italic', color: '#334155', fontSize: 15, lineHeight: 22 }}>
            {seg.text}
          </Text>
        );
      case 'h1':
        return <Text style={mdStyles.h1}>{seg.text}</Text>;
      case 'h2':
        return <Text style={mdStyles.h2}>{seg.text}</Text>;
      case 'bullet':
        return (
          <View style={mdStyles.bulletRow}>
            <Text style={mdStyles.bulletDot}>•</Text>
            <Text style={mdStyles.bulletText}>{seg.text}</Text>
          </View>
        );
      case 'number': {
        const itemNum = getSegmentNumber(segments, index);
        return (
          <View style={mdStyles.bulletRow}>
            <Text style={mdStyles.numberPrefix}>{itemNum}.</Text>
            <Text style={mdStyles.bulletText}>{seg.text}</Text>
          </View>
        );
      }
      case 'check':
        return (
          <View style={mdStyles.checkRow}>
            <TouchableOpacity
              onPress={() => handleToggleCheckSegment(index)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[mdStyles.checkBoxMark, seg.checked && mdStyles.checkBoxChecked]}>
                {seg.checked ? '☑' : '☐'}
              </Text>
            </TouchableOpacity>
            <Text style={[mdStyles.checkText, seg.checked && mdStyles.checkTextDone]}>
              {seg.text}
            </Text>
          </View>
        );
      case 'quote':
        return (
          <View style={mdStyles.blockquote}>
            <Text style={mdStyles.blockquoteText}>{seg.text}</Text>
          </View>
        );
      case 'code':
        return (
          <Text
            style={{
              fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
              backgroundColor: '#EEF2FF',
              color: '#4F46E5',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              fontSize: 14,
            }}
          >
            {seg.text}
          </Text>
        );
      default:
        return (
          <Text style={{ fontSize: 15, color: '#1E293B', lineHeight: 22 }}>
            {seg.text}
          </Text>
        );
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 110 }}
        >
          {/* TOP LIGHT COLOR HERO PANEL */}
          <View style={styles.heroWrapper}>
            <LinearGradient
              colors={['#EEF2FF', '#EDE9FE', '#FCE7F3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroBanner}
            >
              {/* Subtle decorative circles in soft pastel tones */}
              <View style={styles.heroCircleOverlay1} />
              <View style={styles.heroCircleOverlay2} />

              <View style={styles.heroTopRow}>
                <View style={styles.heroTagBadge}>
                  <Text style={styles.heroTagText}>MIND & SOUL REFLECTIONS ✨</Text>
                </View>

                <View style={styles.heroHeaderActions}>
                  <TouchableOpacity
                    style={styles.heroActionBtn}
                    onPress={() => setIsCalendarOpen(true)}
                    activeOpacity={0.8}
                  >
                    <Icon name="calendar" size={18} color="#4F46E5" />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.heroTitle}>Daily Journal 📖</Text>
              <Text style={styles.heroSubtitle}>
                Capture your mindset, celebrate progress & reflect peacefully.
              </Text>

              {/* Quick Metrics Bar inside Light Hero Panel */}
              <View style={styles.heroMetricsBar}>
                <View style={styles.heroMetricPill}>
                  <Text style={styles.heroMetricEmoji}>🔥</Text>
                  <Text style={styles.heroMetricLabel}>7 Day Streak</Text>
                </View>
                <View style={styles.heroMetricPill}>
                  <Text style={styles.heroMetricEmoji}>📝</Text>
                  <Text style={styles.heroMetricLabel}>{entries.length} Entries</Text>
                </View>

                {/* TAP TO SET DATE / TODAY ACTION */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleJumpToToday}
                  style={[
                    styles.heroJumpDateBtn,
                    isTodaySelected ? styles.heroJumpDateBtnToday : styles.heroJumpDateBtnActive
                  ]}
                >
                  <Icon
                    name={isTodaySelected ? "check-circle" : "corner-down-left"}
                    size={14}
                    color={isTodaySelected ? "#059669" : "#4F46E5"}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[styles.heroJumpDateText, { color: isTodaySelected ? "#059669" : "#4F46E5" }]}>
                    {isTodaySelected ? "Today Active" : "Tap to set date"}
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {/* 1-WEEK DATE SLIDER WITH PREVIOUS & NEXT ARROWS */}
          <View style={styles.weekSectionContainer}>
            <View style={styles.weekHeader}>
              <TouchableOpacity
                onPress={() => setWeekOffset(prev => prev - 1)}
                style={styles.weekNavArrowBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Icon name="chevron-left" size={22} color="#4338CA" />
              </TouchableOpacity>

              <View style={styles.weekHeaderCenter}>
                <Text style={styles.weekRangeTitle}>
                  {activeWeekDates[0]?.monthLabel} {activeWeekDates[0]?.dateLabel} — {activeWeekDates[6]?.monthLabel} {activeWeekDates[6]?.dateLabel}
                </Text>
                <View style={styles.weekStatusPill}>
                  <Text style={styles.weekStatusText}>
                    {weekOffset === 0 ? "This Week" : weekOffset < 0 ? `${Math.abs(weekOffset)}w ago` : `+${weekOffset}w next`}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setWeekOffset(prev => prev + 1)}
                style={styles.weekNavArrowBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Icon name="chevron-right" size={22} color="#4338CA" />
              </TouchableOpacity>
            </View>

            {/* 7 DAYS TILES ROW */}
            <View style={styles.weekDaysGrid}>
              {activeWeekDates.map((day) => {
                const isSelected = day.date.toDateString() === selectedJournalDate.toDateString();
                const hasEntry = entries.some(e => e.entryDate.toDateString() === day.date.toDateString());
                return (
                  <TouchableOpacity
                    key={day.key}
                    activeOpacity={0.75}
                    onPress={() => setSelectedJournalDate(day.date)}
                    style={[
                      styles.weekDayTile,
                      isSelected && styles.weekDayTileSelected,
                      day.isToday && !isSelected && styles.weekDayTileToday,
                    ]}
                  >
                    <Text style={[styles.weekDayName, isSelected && styles.weekDayTextSelected]}>
                      {day.dayLabel}
                    </Text>
                    <Text style={[styles.weekDayNumber, isSelected && styles.weekDayTextSelected]}>
                      {day.dateLabel}
                    </Text>
                    {hasEntry ? (
                      <View style={[styles.weekDot, isSelected && styles.weekDotSelected]} />
                    ) : (
                      <View style={{ height: 5 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quick Helper indicator when in past or future */}
            {!isTodaySelected && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleJumpToToday}
                style={styles.jumpBannerNotice}
              >
                <Icon name="clock" size={14} color="#6366F1" style={{ marginRight: 6 }} />
                <Text style={styles.jumpBannerNoticeText}>
                  Viewing {selectedJournalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} •
                </Text>
                <Text style={styles.jumpBannerNoticeAction}> Tap to set date to Today ⚡</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* VIBRANT MOOD COLOR PANEL */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>How are you feeling?</Text>
              {/* REMOVED 'Tap to set mood', replaced with current active mood pill */}
              <View style={[styles.currentMoodBadge, { backgroundColor: MOOD_COLOR_PANEL.find(m => m.id === selectedMood)?.softBg }]}>
                <Text style={[styles.currentMoodBadgeText, { color: MOOD_COLOR_PANEL.find(m => m.id === selectedMood)?.color }]}>
                  {MOOD_COLOR_PANEL.find(m => m.id === selectedMood)?.emoji} {MOOD_COLOR_PANEL.find(m => m.id === selectedMood)?.tag}
                </Text>
              </View>
            </View>

            <View style={styles.moodPanelGrid}>
              {MOOD_COLOR_PANEL.map((mood) => {
                const isSelected = selectedMood === mood.id;
                return (
                  <TouchableOpacity
                    key={mood.id}
                    onPress={() => setSelectedMood(mood.id)}
                    activeOpacity={0.8}
                    style={[
                      styles.moodColorCard,
                      { backgroundColor: isSelected ? '#FFF' : mood.softBg },
                      isSelected && { borderColor: mood.borderColor, borderWidth: 2, ...Shadow.md }
                    ]}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={mood.activeBg}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.moodActiveOverlay}
                      >
                        <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                        <Text style={styles.moodActiveLabel}>{mood.label}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.moodNormalContent}>
                        <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                        <Text style={[styles.moodLabel, { color: mood.color }]}>{mood.label}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* MOOD ACTIVITIES SELECTOR (INTERACTIVE TAGS) */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Mood Activities</Text>
              <Text style={styles.activitySubtext}>Select what influenced today</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.activitiesScroll}
            >
              {MOOD_ACTIVITIES.map((act) => {
                const isActive = selectedActivities.includes(act.id);
                return (
                  <TouchableOpacity
                    key={act.id}
                    activeOpacity={0.7}
                    onPress={() => toggleActivity(act.id)}
                    style={[
                      styles.activityChip,
                      isActive && styles.activityChipActive,
                      isActive && { backgroundColor: act.color }
                    ]}
                  >
                    <Text style={styles.activityEmoji}>{act.emoji}</Text>
                    <Text style={[styles.activityLabel, isActive && styles.activityLabelActive]}>
                      {act.label}
                    </Text>
                    {isActive && (
                      <Icon name="check" size={12} color="#FFF" style={{ marginLeft: 4 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* INSPIRING WRITING PROMPT */}
          <View style={styles.promptWrapper}>
            <LinearGradient
              colors={['#EEF2FF', '#FAF5FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.promptGradient}
            >
              <View style={styles.promptLeft}>
                <Text style={styles.promptLabel}>THOUGHT OF THE DAY</Text>
                <Text style={styles.promptText}>{PROMPT_SUGGESTIONS[activePromptIndex]}</Text>
              </View>
              <TouchableOpacity onPress={rotatePrompt} style={styles.refreshPromptBtn}>
                <Icon name="refresh-cw" size={16} color="#6366F1" />
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* COMPOSER CARD */}
          <View style={styles.section}>
            <Card style={styles.composerCard}>
              <View style={styles.composerHeader}>
                <View style={styles.composerDateBadge}>
                  <Text style={styles.composerDateBadgeText}>
                    {selectedJournalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                <Text style={styles.composerSelectedMood}>
                  Mood: {MOOD_EMOJIS[selectedMood] || '😊'} {selectedMood.toUpperCase()}
                </Text>
              </View>

              {/* Selected Activities Bar in Composer */}
              {selectedActivities.length > 0 && (
                <View style={styles.composerActivitiesRow}>
                  {selectedActivities.map((actId) => {
                    const act = MOOD_ACTIVITIES.find(a => a.id === actId);
                    return (
                      <View key={actId} style={[styles.composerActivityTag, { borderColor: act?.color || '#6366F1' }]}>
                        <Text style={styles.composerActivityTagText}>{act?.emoji} {act?.label}</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* COMPOSER TOP BAR */}
              <View style={styles.editorTopBar}>
                <View style={styles.editorHeaderBadgeRow}>
                  <Icon name="edit-2" size={13} color="#6366F1" style={{ marginRight: 6 }} />
                  <Text style={styles.editorHeaderTitle}>Reflection Note</Text>
                  {activeFormat && (
                    <View style={styles.activeFormatBadgePill}>
                      <Text style={styles.activeFormatBadgeText}>
                        ● {FORMAT_CONFIG[activeFormat]?.title || activeFormat} Active
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.editorHeaderRightRow}>
                  <Text style={styles.wordCountBadge}>
                    {inputText.trim() ? inputText.trim().split(/\s+/).length : 0} words
                  </Text>
                  {(segments.length > 0 || activeInputText.trim().length > 0) && (
                    <TouchableOpacity
                      onPress={handleClearEditor}
                      style={styles.clearHeaderBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <Icon name="trash-2" size={12} color="#EF4444" style={{ marginRight: 4 }} />
                      <Text style={styles.clearHeaderText}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* RICH TEXT FORMATTING TOOLBAR */}
              <View style={styles.markdownToolbarWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.markdownToolbarScroll}
                  keyboardShouldPersistTaps="always"
                >
                  {/* Bold */}
                  <TouchableOpacity
                    style={[styles.formatActionBtn, activeFormat === 'bold' && styles.formatActionBtnActive]}
                    onPress={() => toggleFormat('bold')}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  >
                    <Text style={[styles.formatBoldText, activeFormat === 'bold' && styles.formatActionTextActive]}>B</Text>
                  </TouchableOpacity>

                  {/* Italic */}
                  <TouchableOpacity
                    style={[styles.formatActionBtn, activeFormat === 'italic' && styles.formatActionBtnActive]}
                    onPress={() => toggleFormat('italic')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.formatItalicText, activeFormat === 'italic' && styles.formatActionTextActive]}>I</Text>
                  </TouchableOpacity>

                  {/* Heading 1 */}
                  <TouchableOpacity
                    style={[styles.formatActionBtn, activeFormat === 'h1' && styles.formatActionBtnActive]}
                    onPress={() => toggleFormat('h1')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.formatHeadingText, activeFormat === 'h1' && styles.formatActionTextActive]}>H1</Text>
                  </TouchableOpacity>

                  {/* Heading 2 */}
                  <TouchableOpacity
                    style={[styles.formatActionBtn, activeFormat === 'h2' && styles.formatActionBtnActive]}
                    onPress={() => toggleFormat('h2')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.formatHeadingText, activeFormat === 'h2' && styles.formatActionTextActive]}>H2</Text>
                  </TouchableOpacity>

                  {/* Bullet List */}
                  <TouchableOpacity
                    style={[styles.formatActionBtn, activeFormat === 'bullet' && styles.formatActionBtnActive]}
                    onPress={() => toggleFormat('bullet')}
                    activeOpacity={0.7}
                  >
                    <Icon name="list" size={15} color={activeFormat === 'bullet' ? '#FFFFFF' : '#475569'} />
                  </TouchableOpacity>

                  {/* Numbered List */}
                  <TouchableOpacity
                    style={[styles.formatActionBtn, activeFormat === 'number' && styles.formatActionBtnActive]}
                    onPress={() => toggleFormat('number')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.formatSmallText, activeFormat === 'number' && styles.formatActionTextActive]}>1.</Text>
                  </TouchableOpacity>

                  {/* Checklist */}
                  <TouchableOpacity
                    style={[styles.formatActionBtn, activeFormat === 'check' && styles.formatActionBtnActive]}
                    onPress={() => toggleFormat('check')}
                    activeOpacity={0.7}
                  >
                    <Icon name="check-square" size={14} color={activeFormat === 'check' ? '#FFFFFF' : '#475569'} />
                  </TouchableOpacity>

                  {/* Quote / Reflection */}
                  <TouchableOpacity
                    style={[styles.formatActionBtn, activeFormat === 'quote' && styles.formatActionBtnActive]}
                    onPress={() => toggleFormat('quote')}
                    activeOpacity={0.7}
                  >
                    <Icon name="message-circle" size={14} color={activeFormat === 'quote' ? '#FFFFFF' : '#475569'} />
                  </TouchableOpacity>

                  {/* Highlight / Code */}
                  <TouchableOpacity
                    style={[styles.formatActionBtn, activeFormat === 'code' && styles.formatActionBtnActive]}
                    onPress={() => toggleFormat('code')}
                    activeOpacity={0.7}
                  >
                    <Icon name="code" size={14} color={activeFormat === 'code' ? '#FFFFFF' : '#475569'} />
                  </TouchableOpacity>

                  {/* Clear Editor Option */}
                  {(segments.length > 0 || activeInputText.trim().length > 0) && (
                    <TouchableOpacity
                      style={styles.formatActionBtnClear}
                      onPress={handleClearEditor}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    >
                      <Icon name="rotate-ccw" size={12} color="#EF4444" style={{ marginRight: 4 }} />
                      <Text style={styles.formatClearText}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>

              {/* SINGLE UNIFIED DYNAMIC EDITOR BOX */}
              <TouchableOpacity
                activeOpacity={1}
                style={styles.unifiedEditorBox}
                onPress={() => textInputRef.current?.focus()}
              >
                {/* Previously typed styled segments */}
                {segments.length > 0 && (
                  <View style={styles.committedSegmentsWrap}>
                    {segments.map((seg, idx) => (
                      <TouchableOpacity
                        key={seg.id || idx}
                        activeOpacity={0.8}
                        onPress={() => handleEditSegment(idx)}
                      >
                        {renderSegmentItem(seg, idx)}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Active typing line with live dynamic format styling */}
                <View style={[styles.activeInputRow, getActiveRowStyle(activeFormat)]}>
                  {renderActiveFormatPrefix(activeFormat)}
                  <TextInput
                    ref={textInputRef}
                    style={[styles.activeTextInput, getActiveInputTextStyle(activeFormat)]}
                    placeholder={
                      segments.length === 0
                        ? "Write your reflections, breakthroughs, and gratitude..."
                        : activeFormat === 'bold'
                        ? "Type bold text..."
                        : activeFormat === 'italic'
                        ? "Type italic text..."
                        : activeFormat === 'h1'
                        ? "Type Heading 1..."
                        : activeFormat === 'h2'
                        ? "Type Heading 2..."
                        : activeFormat === 'bullet'
                        ? "Type bullet item..."
                        : activeFormat === 'number'
                        ? `Type item ${getNextListNumber(segments)}...`
                        : activeFormat === 'check'
                        ? "Type action task..."
                        : activeFormat === 'quote'
                        ? "Type meaningful thought..."
                        : activeFormat === 'code'
                        ? "Type code keyword..."
                        : "Continue writing your reflection..."
                    }
                    placeholderTextColor="#94A3B8"
                    multiline
                    value={activeInputText}
                    onChangeText={handleActiveInputChange}
                    onKeyPress={handleKeyPress}
                  />
                </View>
              </TouchableOpacity>

              {/* Image Grid with Delete Badge */}
              {(selectedImages.length > 0 || isLoadingImages) && (
                <View style={styles.imageGrid}>
                  {selectedImages.map((uri, index) => (
                    <View key={index} style={styles.gridImageWrapper}>
                      <Image source={{ uri }} style={styles.gridImage} />
                      <TouchableOpacity
                        onPress={() => removeImage(index)}
                        style={styles.removeBadge}
                      >
                        <Icon name="x" size={12} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {isLoadingImages && (
                    <View style={[styles.gridImage, styles.loaderSquare]}>
                      <ActivityIndicator color="#4F46E5" size="small" />
                      <Text style={styles.loadingText}>Attaching...</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Bottom Toolbar & Save */}
              <View style={styles.toolbarRow}>
                <View style={styles.toolButtons}>
                  <TouchableOpacity onPress={pickImage} style={styles.toolBtn} activeOpacity={0.7}>
                    <Icon name="image" size={20} color="#4F46E5" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={toggleSpeech}
                    style={[styles.toolBtn, isRecording && styles.recordingToolBtn]}
                    activeOpacity={0.7}
                  >
                    <Icon name="mic" size={20} color={isRecording ? "#FFF" : "#4F46E5"} />
                  </TouchableOpacity>
                  {isRecording && (
                    <View style={styles.recordingPulseTag}>
                      <View style={styles.pulseDot} />
                      <Text style={styles.recordingText}>Listening...</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.saveEntryBtn, !inputText.trim() && { opacity: 0.6 }]}
                  onPress={handleSaveEntry}
                  disabled={!inputText.trim()}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#4F46E5', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.saveEntryGradient}
                  >
                    <Icon name="check" size={16} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.saveEntryBtnText}>Save Entry</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Card>
          </View>

          {/* LIST OF REFLECTIONS FOR THE DAY */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                Entries for {selectedJournalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              <View style={styles.entriesCountBadge}>
                <Text style={styles.entriesCountText}>{selectedDateEntries.length}</Text>
              </View>
            </View>

            {selectedDateEntries.length === 0 ? (
              <Card style={styles.emptyEntriesCard}>
                <View style={styles.emptyIconCircle}>
                  <Text style={{ fontSize: 28 }}>✍️</Text>
                </View>
                <Text style={styles.emptyEntriesTitle}>No reflections for this date</Text>
                <Text style={styles.emptyEntriesSub}>
                  Take a mindful breath and jot down how your day went.
                </Text>
              </Card>
            ) : (
              selectedDateEntries.map((entry) => (
                <Card key={entry.id} style={styles.entryFeedCard}>
                  <View style={styles.entryTopBar}>
                    <View style={styles.entryMoodPill}>
                      <Text style={styles.entryMoodEmoji}>{entry.moodEmoji}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.entryTitle}>{entry.title}</Text>
                      <Text style={styles.entryTimestamp}>{entry.date}</Text>
                    </View>
                    {entry.hasVoice && (
                      <View style={styles.voiceIndicatorBadge}>
                        <Icon name="mic" size={12} color="#4F46E5" />
                      </View>
                    )}
                  </View>

                  <MarkdownRenderer content={entry.preview} style={styles.entryMarkdownBody} />

                  {/* Activity tags in Feed Item */}
                  {entry.activities && entry.activities.length > 0 && (
                    <View style={styles.entryActivitiesRow}>
                      {entry.activities.map((actId) => {
                        const act = MOOD_ACTIVITIES.find(a => a.id === actId);
                        return (
                          <View key={actId} style={styles.entryActivityChip}>
                            <Text style={styles.entryActivityChipText}>{act?.emoji} {act?.label}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {entry.images.length > 0 && (
                    <View style={styles.entryImagesRow}>
                      {entry.images.map((uri, idx) => (
                        <Image key={idx} source={{ uri }} style={styles.entryImageThumb} />
                      ))}
                    </View>
                  )}
                </Card>
              ))
            )}
          </View>

          {/* CALENDAR PICKER MODAL */}
          <PopupModal
            visible={isCalendarOpen}
            onClose={() => setIsCalendarOpen(false)}
            title={`${currentYear} Calendar`}
            message="Jump directly to any date to write or review your journal."
            secondaryAction={{ title: 'Select Date', onPress: applySelectedDate }}
          >
            {calendarView === 'dates' ? (
              <>
                <TouchableOpacity
                  style={styles.calendarHeaderPill}
                  onPress={() => setCalendarView('months')}
                >
                  <Text style={styles.calendarHeaderPillText}>
                    {months[selectedMonthIndex]} {currentYear} ▾
                  </Text>
                </TouchableOpacity>

                <View style={styles.weekdayRow}>
                  {weekdayLabels.map((lbl, idx) => (
                    <Text key={idx} style={styles.weekdayLabel}>{lbl}</Text>
                  ))}
                </View>

                <View style={styles.dateGrid}>
                  {calendarDates.map((item, index) => {
                    const isSelected = item.value === selectedCalendarDate;
                    return (
                      <TouchableOpacity
                        key={index}
                        disabled={!item.value}
                        style={[
                          styles.dateCell,
                          isSelected && styles.dateCellSelected,
                        ]}
                        onPress={() => item.value && setSelectedCalendarDate(item.value)}
                      >
                        <Text
                          style={[
                            styles.dateCellText,
                            isSelected && styles.dateCellTextSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : (
              <View style={styles.monthGrid}>
                {months.map((m, index) => {
                  const isSelected = index === selectedMonthIndex;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.monthItem,
                        isSelected && styles.monthItemActive,
                      ]}
                      onPress={() => {
                        setSelectedMonthIndex(index);
                        setCalendarView('dates');
                      }}
                    >
                      <Text
                        style={[
                          styles.monthLabel,
                          isSelected && styles.monthLabelActive,
                        ]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </PopupModal>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  // HERO BANNER (LIGHT COLOR PANEL)
  heroWrapper: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 10 : 6,
    marginBottom: 6,
  },
  heroBanner: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E0E7FF',
    backgroundColor: '#EEF2FF',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  heroCircleOverlay1: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  heroCircleOverlay2: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(224, 231, 255, 0.55)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroTagBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.18)',
  },
  heroTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4338CA',
    letterSpacing: 0.6,
  },
  heroHeaderActions: { flexDirection: 'row', alignItems: 'center' },
  heroActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    ...Shadow.sm,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#475569',
    marginTop: 3,
    lineHeight: 18,
    fontWeight: '500',
  },
  heroMetricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  heroMetricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.sm,
  },
  heroMetricEmoji: { fontSize: 12, marginRight: 4 },
  heroMetricLabel: { fontSize: 11, fontWeight: '700', color: '#4338CA' },
  heroJumpDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  heroJumpDateBtnActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    ...Shadow.sm,
  },
  heroJumpDateBtnToday: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    ...Shadow.sm,
  },
  heroJumpDateText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
  },

  // 1-WEEK DATE STRIP
  weekSectionContainer: {
    marginTop: 14,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  weekNavArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    ...Shadow.sm,
  },
  weekHeaderCenter: {
    alignItems: 'center',
  },
  weekRangeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  weekStatusPill: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  weekStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4338CA',
  },
  weekDaysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  weekDayTile: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  weekDayTileSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4338CA',
    ...Shadow.md,
  },
  weekDayTileToday: {
    borderColor: '#818CF8',
    borderWidth: 2,
  },
  weekDayName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  weekDayNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  weekDayTextSelected: {
    color: '#FFF',
  },
  weekDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginTop: 5,
  },
  weekDotSelected: {
    backgroundColor: '#34D399',
  },
  jumpBannerNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  jumpBannerNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  jumpBannerNoticeAction: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
  },

  // SECTION GENERAL
  section: {
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  currentMoodBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  currentMoodBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // MOOD COLOR PANEL
  moodPanelGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  moodColorCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    height: 74,
    borderWidth: 1,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodActiveOverlay: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  moodNormalContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodEmoji: {
    fontSize: 26,
    marginBottom: 2,
  },
  moodLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  moodActiveLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },

  // MOOD ACTIVITIES
  activitySubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  activitiesScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  activityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    ...Shadow.sm,
  },
  activityChipActive: {
    borderColor: 'transparent',
    ...Shadow.md,
  },
  activityEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  activityLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  activityLabelActive: {
    color: '#FFF',
  },

  // PROMPT
  promptWrapper: { paddingHorizontal: 16, marginBottom: 16 },
  promptGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  promptLeft: { flex: 1, marginRight: 10 },
  promptLabel: { fontSize: 10, fontWeight: '800', color: '#6366F1', letterSpacing: 0.8, marginBottom: 2 },
  promptText: { fontSize: 13, fontWeight: '600', color: '#1E293B', lineHeight: 18 },
  refreshPromptBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.sm,
  },

  // COMPOSER
  composerCard: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.md,
  },
  composerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    paddingBottom: 8,
  },
  composerDateBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  composerDateBadgeText: { fontSize: 11, fontWeight: '700', color: '#4F46E5' },
  composerSelectedMood: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  composerActivitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  composerActivityTag: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#F8FAFC',
  },
  composerActivityTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  textInputArea: {
    fontSize: 15,
    color: '#0F172A',
    minHeight: 110,
    textAlignVertical: 'top',
    lineHeight: 22,
    paddingTop: 8,
  },
  editorTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
    paddingBottom: 4,
  },
  editorHeaderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editorHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  activeFormatBadgePill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  activeFormatBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  editorHeaderRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  clearHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  wordCountBadge: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  markdownToolbarWrapper: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    paddingVertical: 6,
    marginBottom: 6,
  },
  markdownToolbarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  formatActionBtn: {
    minWidth: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  formatActionBtnActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4338CA',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  formatActionTextActive: {
    color: '#FFFFFF',
  },
  formatActionBtnClear: {
    flexDirection: 'row',
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 9,
    marginLeft: 4,
  },
  formatClearText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  formatBoldText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  formatItalicText: {
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '700',
    color: '#0F172A',
  },
  formatHeadingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4338CA',
  },
  formatSmallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  unifiedEditorBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    minHeight: 140,
    marginVertical: 6,
    width: '100%',
  },
  committedSegmentsWrap: {
    width: '100%',
    marginBottom: 6,
    gap: 4,
  },
  activeInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    minHeight: 36,
  },
  prefixContainer: {
    paddingTop: 3,
    marginRight: 6,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  activeTextInput: {
    flex: 1,
    width: '100%',
    minHeight: 36,
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: 2,
    paddingHorizontal: 0,
    margin: 0,
    textAlignVertical: 'top',
  },
  entryMarkdownBody: {
    marginTop: 6,
    marginBottom: 8,
  },

  // IMAGES
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_SPACING, marginTop: 12 },
  gridImageWrapper: { position: 'relative' },
  gridImage: { width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: 14, backgroundColor: '#F1F5F9' },
  removeBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  loaderSquare: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
  },
  loadingText: { fontSize: 10, color: '#4F46E5', marginTop: 4, fontWeight: '600' },

  // TOOLBAR
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  toolButtons: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toolBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingToolBtn: { backgroundColor: '#EF4444' },
  recordingPulseTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginRight: 6 },
  recordingText: { fontSize: 11, fontWeight: '700', color: '#B91C1C' },
  saveEntryBtn: { borderRadius: 18, overflow: 'hidden' },
  saveEntryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  saveEntryBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },

  // ENTRIES FEED
  entriesCountBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  entriesCountText: { fontSize: 12, fontWeight: '800', color: '#4F46E5' },
  emptyEntriesCard: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.sm,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyEntriesTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  emptyEntriesSub: { fontSize: 13, color: '#64748B', textAlign: 'center', paddingHorizontal: 30 },
  entryFeedCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.sm,
  },
  entryTopBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  entryMoodPill: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryMoodEmoji: { fontSize: 22 },
  entryTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  entryTimestamp: { fontSize: 12, color: '#94A3B8', marginTop: 1 },
  voiceIndicatorBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryContentText: { fontSize: 14, color: '#334155', lineHeight: 21 },
  entryActivitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  entryActivityChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  entryActivityChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  entryImagesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  entryImageThumb: { width: 70, height: 70, borderRadius: 12, backgroundColor: '#F1F5F9' },

  // CALENDAR MODAL
  calendarHeaderPill: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  calendarHeaderPillText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  weekdayRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  weekdayLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', width: `${100 / 7}%`, textAlign: 'center' },
  dateGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  dateCell: {
    flexBasis: '14.2857%',
    maxWidth: '14.2857%',
    minWidth: 36,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderRadius: 12,
  },
  dateCellSelected: { backgroundColor: '#4F46E5' },
  dateCellText: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  dateCellTextSelected: { color: '#FFF', fontWeight: '800' },
  monthGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 8 },
  monthItem: {
    width: '30%',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  monthItemActive: { backgroundColor: '#4F46E5' },
  monthLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  monthLabelActive: { color: '#FFF' },
});

export default JournalScreen;
