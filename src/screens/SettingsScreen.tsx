import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Spacing, Shadow } from '../theme/spacing';
import { getScreenBgColor } from '../theme/screenBgColors';
import Header from '../components/Header';
import Toggle from '../components/Toggle';
import Card from '../components/Card';
import Button from '../components/Button';
import { useSettingsStore } from '../store/useSettingsStore';
import api from '../services/api';

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro'];
const OPENAI_MODELS = ['gpt-4o-mini', 'gpt-4o'];

const SettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const bgColor = getScreenBgColor('Settings');
  const { settings, fetchSettings, updateSetting, updateMultipleSettings, setCustomApiUrl } = useSettingsStore();

  const [aiMode, setAiMode] = useState(settings.ai_mode === 'openai' ? 'openai' : 'gemini');
  const [modelName, setModelName] = useState(
    settings.ai_model_name && (settings.ai_model_name.includes('gemini') || settings.ai_model_name.includes('gpt'))
      ? settings.ai_model_name
      : 'gemini-2.5-flash'
  );
  const [apiKey, setApiKey] = useState(settings.custom_api_key || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [backendUrl, setBackendUrl] = useState('http://10.0.2.2:5000');
  const [isSavingAi, setIsSavingAi] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    setAiMode(settings.ai_mode === 'openai' ? 'openai' : 'gemini');
    setModelName(
      settings.ai_model_name && (settings.ai_model_name.includes('gemini') || settings.ai_model_name.includes('gpt'))
        ? settings.ai_model_name
        : 'gemini-2.5-flash'
    );
    setApiKey(settings.custom_api_key || '');
  }, [settings]);

  const handleSaveAiConfig = async () => {
    setIsSavingAi(true);
    try {
      await updateMultipleSettings({
        ai_mode: aiMode,
        ai_model_name: modelName,
        custom_api_key: apiKey,
      });
      Alert.alert('Settings Saved', 'Your AI API configuration has been saved successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save settings.');
    } finally {
      setIsSavingAi(false);
    }
  };

  const handleTestBackend = async () => {
    setIsTesting(true);
    setTestStatus(null);
    try {
      await setCustomApiUrl(backendUrl);
      const res = await api.get('/health', { timeout: 4000 });
      if (res.data?.status === 'ok') {
        setTestStatus('✅ Connected to FastAPI backend!');
      } else {
        setTestStatus('⚠️ Server responded, but status was unexpected.');
      }
    } catch (e: any) {
      setTestStatus(`❌ Could not connect: ${e.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Header title="Settings" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* AI ENGINE CONFIGURATION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Intelligence Engine</Text>
          <Card style={styles.sectionCard}>
            <Text style={styles.cardHeaderDesc}>
              Choose your AI coaching assistant provider. SelfTrack connects with high-speed, secure Cloud AI APIs (Google Gemini & OpenAI BYOK).
            </Text>

            {/* Provider Tabs */}
            <View style={styles.providerTabs}>
              <TouchableOpacity
                style={[styles.providerTab, aiMode === 'gemini' && styles.providerTabActive]}
                onPress={() => {
                  setAiMode('gemini');
                  setModelName('gemini-2.5-flash');
                }}
              >
                <Icon
                  name="zap"
                  size={16}
                  color={aiMode === 'gemini' ? '#FFFFFF' : Colors.textSecondary}
                />
                <Text style={[styles.providerTabText, aiMode === 'gemini' && styles.providerTabTextActive]}>
                  Google Gemini API
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.providerTab, aiMode === 'openai' && styles.providerTabActive]}
                onPress={() => {
                  setAiMode('openai');
                  setModelName('gpt-4o-mini');
                }}
              >
                <Icon
                  name="globe"
                  size={16}
                  color={aiMode === 'openai' ? '#FFFFFF' : Colors.textSecondary}
                />
                <Text style={[styles.providerTabText, aiMode === 'openai' && styles.providerTabTextActive]}>
                  OpenAI API (BYOK)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Cloud API Key (Gemini / OpenAI) */}
            {(aiMode === 'gemini' || aiMode === 'openai') && (
              <View style={styles.configFields}>
                <Text style={styles.fieldLabel}>
                  {aiMode === 'gemini' ? 'Google Gemini API Key' : 'OpenAI API Key (BYOK)'}
                </Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    value={apiKey}
                    onChangeText={setApiKey}
                    placeholder="Enter your API Key..."
                    placeholderTextColor={Colors.textTertiary}
                    secureTextEntry={!showApiKey}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowApiKey(!showApiKey)}
                  >
                    <Icon name={showApiKey ? 'eye-off' : 'eye'} size={18} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.fieldHint}>
                  Your key is stored securely in encrypted storage and never shared.
                </Text>

                <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Model Selection</Text>
                <View style={styles.modelPillRow}>
                  {(aiMode === 'gemini' ? GEMINI_MODELS : OPENAI_MODELS).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.modelPill, modelName === m && styles.modelPillActive]}
                      onPress={() => setModelName(m)}
                    >
                      <Text style={[styles.modelPillText, modelName === m && styles.modelPillTextActive]}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <Button
              title="Save AI Configuration"
              onPress={handleSaveAiConfig}
              loading={isSavingAi}
              style={{ marginTop: 16 }}
            />
          </Card>
        </View>

        {/* BACKEND SERVER URL */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FastAPI Backend Server</Text>
          <Card style={styles.sectionCard}>
            <Text style={styles.fieldLabel}>Server URL</Text>
            <TextInput
              style={styles.input}
              value={backendUrl}
              onChangeText={setBackendUrl}
              placeholder="http://10.0.2.2:5000"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.testBtn}
              onPress={handleTestBackend}
              disabled={isTesting}
            >
              {isTesting ? (
                <ActivityIndicator color={Colors.primary} size="small" />
              ) : (
                <>
                  <Icon name="activity" size={16} color={Colors.primary} />
                  <Text style={styles.testBtnText}>Test Connection</Text>
                </>
              )}
            </TouchableOpacity>
            {testStatus && <Text style={styles.testStatusText}>{testStatus}</Text>}
          </Card>
        </View>

        {/* PREFERENCES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <Card style={styles.sectionCard}>
            <View style={[styles.settingRow, styles.settingBorder]}>
              <View style={styles.settingLeft}>
                <Icon name="bell" size={18} color={Colors.textSecondary} />
                <Text style={styles.settingLabel}>Push Notifications</Text>
              </View>
              <Toggle
                value={settings.push_notifications}
                onValueChange={(v) => updateSetting('push_notifications', v)}
                size="sm"
              />
            </View>

            <TouchableOpacity
              style={[styles.settingRow, styles.settingBorder]}
              onPress={() => navigation.navigate('Notifications', { initialTab: 'events' })}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <Icon name="calendar" size={18} color={Colors.primary} />
                <View>
                  <Text style={styles.settingLabel}>Special Event Reminders</Text>
                  <Text style={{ ...Typography.caption, fontSize: 11, color: Colors.textTertiary }}>
                    Birthdays, anniversaries, meetings & occasions
                  </Text>
                </View>
              </View>
              <Icon name="chevron-right" size={16} color={Colors.textTertiary} />
            </TouchableOpacity>

            <View style={[styles.settingRow, styles.settingBorder]}>
              <View style={styles.settingLeft}>
                <Icon name="volume-2" size={18} color={Colors.textSecondary} />
                <Text style={styles.settingLabel}>Sound Effects</Text>
              </View>
              <Toggle
                value={settings.sound_effects}
                onValueChange={(v) => updateSetting('sound_effects', v)}
                size="sm"
              />
            </View>

            <View style={[styles.settingRow, styles.settingBorder]}>
              <View style={styles.settingLeft}>
                <Icon name="smartphone" size={18} color={Colors.textSecondary} />
                <Text style={styles.settingLabel}>Haptic Feedback</Text>
              </View>
              <Toggle
                value={settings.haptic_feedback}
                onValueChange={(v) => updateSetting('haptic_feedback', v)}
                size="sm"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Icon name="moon" size={18} color={Colors.textSecondary} />
                <Text style={styles.settingLabel}>Dark Mode</Text>
              </View>
              <Toggle
                value={settings.dark_mode}
                onValueChange={(v) => updateSetting('dark_mode', v)}
                size="sm"
              />
            </View>
          </Card>
        </View>

        {/* DATA & SYNC */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Sync</Text>
          <Card style={styles.sectionCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Icon name="cloud" size={18} color={Colors.textSecondary} />
                <Text style={styles.settingLabel}>Auto Sync with Server</Text>
              </View>
              <Toggle
                value={settings.auto_sync}
                onValueChange={(v) => updateSetting('auto_sync', v)}
                size="sm"
              />
            </View>
          </Card>
        </View>

        {/* APP INFO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About SelfTrack</Text>
          <Card style={styles.sectionCard}>
            <View style={[styles.settingRow, styles.settingBorder]}>
              <Text style={styles.settingLabel}>Version</Text>
              <Text style={styles.settingValue}>1.0.0 (Build 1)</Text>
            </View>
            <View style={[styles.settingRow, styles.settingBorder]}>
              <Text style={styles.settingLabel}>Google Play Target SDK</Text>
              <Text style={styles.settingValue}>API 35 (Android 15)</Text>
            </View>
            <TouchableOpacity
              style={[styles.settingRow, styles.settingBorder]}
              onPress={() => setShowPrivacyModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.settingLabel}>Privacy Policy</Text>
              <Icon name="chevron-right" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.settingRow, styles.settingBorder]}
              onPress={() => setShowTermsModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.settingLabel}>Terms of Service</Text>
              <Icon name="chevron-right" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => navigation.navigate('Security')}
              activeOpacity={0.7}
            >
              <Text style={[styles.settingLabel, { color: Colors.primary, fontWeight: '600' }]}>Security & Data Deletion</Text>
              <Icon name="chevron-right" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </Card>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Privacy Policy Modal */}
      <Modal visible={showPrivacyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Privacy Policy</Text>
              <TouchableOpacity onPress={() => setShowPrivacyModal(false)} style={styles.modalClose}>
                <Icon name="x" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <Text style={styles.policyHeading}>1. Information We Collect</Text>
              <Text style={styles.policyText}>
                SelfTrack collects account registration data (name, email), habits created, health metrics (water, steps, sleep), and journal reflections to provide personalized habit tracking and wellness insights.
              </Text>
              <Text style={styles.policyHeading}>2. Data Storage & Security</Text>
              <Text style={styles.policyText}>
                All personal data is encrypted in transit using industry-standard protocols. We do not sell or rent your personal information to third parties.
              </Text>
              <Text style={styles.policyHeading}>3. AI & Cloud Processing</Text>
              <Text style={styles.policyText}>
                AI coaching requests are processed securely via encrypted Cloud AI APIs (Google Gemini & OpenAI) solely to generate insights and are not retained for external model training.
              </Text>
              <Text style={styles.policyHeading}>4. Data Portability & Erasure</Text>
              <Text style={styles.policyText}>
                In compliance with Google Play Store data safety guidelines and global privacy frameworks (GDPR/CCPA), you may export your data archive or permanently delete your account at any time via Security Settings.
              </Text>
            </ScrollView>
            <Button title="Done" variant="primary" onPress={() => setShowPrivacyModal(false)} style={{ marginTop: 14 }} />
          </View>
        </View>
      </Modal>

      {/* Terms of Service Modal */}
      <Modal visible={showTermsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms of Service</Text>
              <TouchableOpacity onPress={() => setShowTermsModal(false)} style={styles.modalClose}>
                <Icon name="x" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <Text style={styles.policyHeading}>1. Acceptance of Terms</Text>
              <Text style={styles.policyText}>
                By creating an account or using SelfTrack, you agree to these terms. SelfTrack is a personal growth and productivity application designed to assist in habit tracking and wellness self-monitoring.
              </Text>
              <Text style={styles.policyHeading}>2. Health & Wellness Disclaimer</Text>
              <Text style={styles.policyText}>
                SelfTrack and its AI companion provide motivational and tracking tools. They do not constitute medical diagnosis, treatment, or professional clinical healthcare advice.
              </Text>
              <Text style={styles.policyHeading}>3. Account Responsibilities</Text>
              <Text style={styles.policyText}>
                You are responsible for maintaining the confidentiality of your login credentials and ensuring the device is secured with passcode or biometrics.
              </Text>
            </ScrollView>
            <Button title="Done" variant="primary" onPress={() => setShowTermsModal(false)} style={{ marginTop: 14 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  sectionCard: {
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.card,
    ...Shadow.sm,
    padding: 16,
  },
  cardHeaderDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  providerTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.lg,
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  providerTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  providerTabActive: {
    backgroundColor: Colors.primary,
  },
  providerTabText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  providerTabTextActive: {
    color: '#FFFFFF',
  },
  configFields: {
    marginTop: 8,
  },
  fieldLabel: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  fieldHint: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.backgroundGray,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyeBtn: {
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundGray,
  },
  modelPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  modelPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.backgroundGray,
  },
  modelPillActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  modelPillText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  modelPillTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    marginTop: 10,
  },
  testBtnText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.primary,
  },
  testStatusText: {
    ...Typography.caption,
    marginTop: 8,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingLabel: { ...Typography.body, color: Colors.textPrimary },
  settingValue: { ...Typography.caption, color: Colors.textTertiary, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    ...Typography.heading2,
    color: Colors.textPrimary,
  },
  modalClose: {
    padding: 4,
  },
  modalScroll: {
    maxHeight: 400,
  },
  policyHeading: {
    ...Typography.subtitle,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 14,
    marginBottom: 6,
  },
  policyText: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
});

export default SettingsScreen;
