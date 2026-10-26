import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather as Icon } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius } from '../theme/spacing';
import { getScreenBgColor } from '../theme/screenBgColors';
import Header from '../components/Header';
import { safeGoBack } from '../utils/navigation';
import api from '../services/api';

interface Message {
  id: string;
  text: string;
  isAI: boolean;
  timestamp: string;
  modelUsed?: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    text: "Hi! I'm your AI Companion coach. I monitor your habits, streaks, steps, and wellness data to give you personalized coaching. How are you feeling today?",
    isAI: true,
    timestamp: 'Just now',
    modelUsed: 'SelfTrack AI',
  },
];

const SUGGESTIONS = ['How am I doing?', 'Mood check', 'Daily summary', 'Habit tips'];

const AIChatScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const bgColor = getScreenBgColor('AIChat');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Load conversation history from backend
    api.get('/ai/history')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setMessages(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const sendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputText).trim();
    if (!content || isThinking) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: content,
      isAI: false,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsThinking(true);

    try {
      const res = await api.post('/ai/chat', { message: content });
      const aiReply: Message = {
        id: (Date.now() + 1).toString(),
        text: res.data.reply,
        isAI: true,
        timestamp: res.data.timestamp || 'Now',
        modelUsed: res.data.model_used || 'AI Coach',
      };
      setMessages((prev) => [...prev, aiReply]);
    } catch (err: any) {
      const fallbackReply: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm having a brief connection pause, but remember: consistency is the key! Every small step toward your goals counts today. 💪",
        isAI: true,
        timestamp: 'Now',
        modelUsed: 'SelfTrack Coach (Offline)',
      };
      setMessages((prev) => [...prev, fallbackReply]);
    } finally {
      setIsThinking(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const toggleSpeech = async () => {
    try {
      const { ExpoSpeechRecognitionModule } = require('expo-speech-recognition');
      if (!isRecording) {
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (result.granted) {
          setIsRecording(true);
          ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true });
        } else {
          Alert.alert('Permission Required', 'Microphone permission is required for voice dictation.');
        }
      } else {
        setIsRecording(false);
        ExpoSpeechRecognitionModule.stop();
      }
    } catch (e) {
      setIsRecording(!isRecording);
      if (!isRecording) {
        setInputText((prev) => (prev ? prev + ' How are my habits?' : 'How am I doing today?'));
      }
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageRow, item.isAI ? styles.aiRow : styles.userRow]}>
      {item.isAI && (
        <View style={styles.aiAvatar}>
          <Icon name="cpu" size={16} color={Colors.primary} />
        </View>
      )}
      <View style={[styles.messageBubble, item.isAI ? styles.aiBubble : styles.userBubble]}>
        {item.isAI && item.modelUsed && (
          <View style={styles.modelBadge}>
            <Text style={styles.modelBadgeText}>{item.modelUsed}</Text>
          </View>
        )}
        <Text style={[styles.messageText, item.isAI ? styles.aiText : styles.userText]}>
          {item.text}
        </Text>
        <Text style={[styles.timestamp, item.isAI ? styles.aiTimestamp : styles.userTimestamp]}>
          {item.timestamp}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: bgColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header
        title="AI Companion"
        onBack={() => safeGoBack(navigation, 'MainTabs', { screen: 'Home' })}
        rightAction={
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Icon name="sliders" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        }
      />

      {/* Quick Suggestions bar */}
      <View style={styles.suggestions}>
        {SUGGESTIONS.map((s) => (
          <TouchableOpacity
            key={s}
            style={styles.suggestionChip}
            onPress={() => sendMessage(s)}
            activeOpacity={0.7}
          >
            <Text style={styles.suggestionText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          isThinking ? (
            <View style={styles.thinkingRow}>
              <View style={styles.aiAvatar}>
                <Icon name="cpu" size={16} color={Colors.primary} />
              </View>
              <View style={[styles.messageBubble, styles.aiBubble, styles.thinkingBubble]}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.thinkingText}>Thinking...</Text>
              </View>
            </View>
          ) : undefined
        }
      />

      {/* Input */}
      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={[styles.voiceBtn, isRecording && styles.voiceBtnActive]}
          onPress={toggleSpeech}
        >
          <Icon name="mic" size={20} color={isRecording ? '#FFF' : Colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Ask me anything..."
          placeholderTextColor={Colors.textTertiary}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={!inputText.trim() || isThinking}
        >
          <Icon name="send" size={20} color={Colors.textWhite} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  suggestions: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  suggestionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: Colors.primarySoft },
  suggestionText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
  messagesList: { paddingHorizontal: 16, paddingBottom: 16 },
  messageRow: { marginBottom: 16, flexDirection: 'row', alignItems: 'flex-end' },
  aiRow: { justifyContent: 'flex-start' },
  userRow: { justifyContent: 'flex-end' },
  aiAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primarySoft, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  messageBubble: { maxWidth: '78%', padding: 14, borderRadius: BorderRadius.xl },
  aiBubble: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  userBubble: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  messageText: { ...Typography.body, lineHeight: 22 },
  aiText: { color: Colors.textPrimary },
  userText: { color: Colors.textWhite },
  timestamp: { ...Typography.overline, marginTop: 6 },
  aiTimestamp: { color: Colors.textTertiary },
  userTimestamp: { color: 'rgba(255, 255, 255, 0.75)' },
  modelBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, backgroundColor: Colors.primarySoft, borderRadius: 6, marginBottom: 6 },
  modelBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  thinkingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  thinkingText: { ...Typography.caption, color: Colors.textSecondary },
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight, backgroundColor: '#FFFFFF' },
  voiceBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primarySoft, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  voiceBtnActive: { backgroundColor: '#EF4444' },
  input: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: BorderRadius.xl, paddingHorizontal: 16, paddingVertical: 10, ...Typography.body, color: Colors.textPrimary, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendBtnDisabled: { opacity: 0.5 },
});

export default AIChatScreen;
