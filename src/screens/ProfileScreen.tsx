import React, { useState, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as ImagePicker from 'expo-image-picker';

import { Feather as Icon } from '@expo/vector-icons';

import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Shadow } from '../theme/spacing';
import { getScreenBgColor } from '../theme/screenBgColors';
import { useAuthStore } from '../store/useAuthStore';
import { useHabitStore } from '../store/useHabitStore';
import { useRewardsStore } from '../store/useRewardsStore';

interface MenuItem {
  icon: string;
  label: string;
  screen?: string;
  color?: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    icon: 'edit-3',
    label: 'Edit Profile Name',
    color: '#EC4899',
  },
  {
    icon: 'target',
    label: 'My Habits & Goals',
    screen: 'HabitTracker',
    color: '#8B5CF6',
  },
  {
    icon: 'heart',
    label: "Women's Health (Cycle Tracker)",
    screen: 'MenstrualCycle',
    color: '#F43F5E',
  },
  {
    icon: 'award',
    label: 'Rewards & Badges',
    screen: 'Rewards',
    color: '#F39C12',
  },
  {
    icon: 'users',
    label: 'Community Feed',
    screen: 'Social',
    color: '#6C5CE7',
  },
  {
    icon: 'bell',
    label: 'Notifications',
    screen: 'Notifications',
    color: '#3B82F6',
  },
  {
    icon: 'shield',
    label: 'Privacy & Security',
    screen: 'Security',
    color: '#00B4D8',
  },
  {
    icon: 'settings',
    label: 'Settings & AI Config',
    screen: 'Settings',
    color: '#6B7280',
  },
  {
    icon: 'log-out',
    label: 'Logout',
    color: '#EF4444',
  },
];

const ProfileScreen: React.FC<{ navigation: any }> = ({
  navigation,
}) => {
  const bgColor = getScreenBgColor('Profile');
  const { user, logout, updateProfile } = useAuthStore();
  const habits = useHabitStore((s) => s.habits);
  const { summary, badges, fetchRewards } = useRewardsStore();

  const [profileImage, setProfileImage] = useState<string | null>(
    user?.avatar_url || null
  );

  const [isEditNameModalVisible, setIsEditNameModalVisible] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const handleOpenEditName = () => {
    setEditedName(user?.name || '');
    setIsEditNameModalVisible(true);
  };

  const handleSaveName = async () => {
    const trimmed = editedName.trim();
    if (!trimmed) {
      Alert.alert('Invalid Name', 'Profile name cannot be empty.');
      return;
    }
    if (trimmed.length < 2) {
      Alert.alert('Invalid Name', 'Name must be at least 2 characters.');
      return;
    }
    if (trimmed.length > 40) {
      Alert.alert('Invalid Name', 'Name cannot exceed 40 characters.');
      return;
    }
    setIsSavingName(true);
    try {
      await updateProfile({ name: trimmed });
      setIsEditNameModalVisible(false);
      Alert.alert('Success', 'Profile name updated successfully! 🎉');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update name. Please try again.');
    } finally {
      setIsSavingName(false);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  //
  // PICK IMAGE FROM GALLERY
  //

  const pickFromGallery = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Gallery permission is required.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);
      updateProfile({ avatar_url: uri }).catch(() => {});
    }
  };

  //
  // OPEN CAMERA
  //

  const openCamera = async () => {
    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Camera permission is required.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);
      updateProfile({ avatar_url: uri }).catch(() => {});
    }
  };

  //
  // HANDLE PHOTO EDIT
  //

  const handleEditPhoto = () => {
    Alert.alert('Profile Photo', 'Choose an option', [
      {
        text: 'Camera',
        onPress: openCamera,
      },

      {
        text: 'Gallery',
        onPress: pickFromGallery,
      },

      {
        text: 'Remove Photo',
        onPress: () => {
          setProfileImage(null);
          updateProfile({ avatar_url: '' }).catch(() => {});
        },
        style: 'destructive',
      },

      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
        },
      ]}
    >
      {/* TOP HEADER */}

      <View style={styles.topBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
        >
          <Icon
            name="arrow-left"
            size={22}
            color="#111827"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* PROFILE */}

        <View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            {profileImage ? (
              <Image
                source={{
                  uri: profileImage,
                }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon
                  name="user"
                  size={48}
                  color="#8B5CF6"
                />
              </View>
            )}

            {/* EDIT BUTTON */}

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.editAvatarBtn}
              onPress={handleEditPhoto}
            >
              <Icon
                name="camera"
                size={16}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          {/* USER NAME WITH EDIT OPTION */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.userNameContainer}
            onPress={handleOpenEditName}
          >
            <Text style={styles.userName}>{user?.name || 'SelfTracker'}</Text>
            <View style={styles.editNameBadge}>
              <Icon name="edit-2" size={13} color="#8B5CF6" />
            </View>
          </TouchableOpacity>

          <Text style={styles.userLevel}>Level {user?.level || 1}</Text>

          {/* XP */}

          <Text style={styles.xpText}>
            XP {(user?.total_xp || 0).toLocaleString()} / {((user?.level || 1) * 1000).toLocaleString()}
          </Text>

          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(100, Math.max(6, (((user?.total_xp || 0) % 1000) / 1000) * 100))}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* STATS */}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{habits.length}</Text>

            <Text style={styles.statLabel}>Habits</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {badges.filter((b) => b.is_unlocked).length || summary?.badges_count || 1}
            </Text>

            <Text style={styles.statLabel}>Badges</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{user?.streak_count || 1}d</Text>

            <Text style={styles.statLabel}>Streak</Text>
          </View>
        </View>

        {/* MENU */}

        <View style={styles.menuContainer}>
          {MENU_ITEMS.map((item, index) => {
            const isLogout =
              item.label === 'Logout';

            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.8}
                style={[
                  styles.menuItem,

                  index ===
                    MENU_ITEMS.length - 1 && {
                    borderBottomWidth: 0,
                  },
                ]}
                onPress={() => {
                  if (item.label === 'Edit Profile Name') {
                    handleOpenEditName();
                    return;
                  }

                  if (item.label === 'Logout') {
                    Alert.alert(
                      'Logout',
                      'Are you sure you want to logout?',
                      [
                        {
                          text: 'Cancel',
                          style: 'cancel',
                        },

                        {
                          text: 'Logout',
                          style: 'destructive',
                          onPress: async () => {
                            await logout();
                            navigation.reset({
                              index: 0,
                              routes: [{ name: 'Login' }],
                            });
                          },
                        },
                      ]
                    );

                    return;
                  }

                  if (item.screen) {
                    navigation.navigate(
                      item.screen
                    );
                  }
                }}
              >
                <View style={styles.menuLeft}>
                  <View
                    style={[
                      styles.menuIconWrapper,
                      {
                        backgroundColor:
                          item.color + '15',
                      },
                    ]}
                  >
                    <Icon
                      name={item.icon as any}
                      size={18}
                      color={item.color}
                    />
                  </View>

                  <Text
                    style={[
                      styles.menuText,

                      isLogout && {
                        color: '#EF4444',
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>

                <Icon
                  name="chevron-right"
                  size={18}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* EDIT PROFILE NAME MODAL */}
      <Modal
        visible={isEditNameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditNameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardAvoid}
          >
            <View style={styles.modalCard}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsEditNameModalVisible(false)}
                activeOpacity={0.7}
              >
                <Icon name="x" size={18} color="#64748B" />
              </TouchableOpacity>

              <View style={styles.modalIconCircle}>
                <Icon name="user" size={24} color="#8B5CF6" />
              </View>

              <Text style={styles.modalTitle}>Edit Profile Name</Text>
              <Text style={styles.modalSubtitle}>
                Update how your name appears across habits, streaks & feed.
              </Text>

              <View
                style={[
                  styles.inputContainer,
                  isInputFocused && styles.inputContainerFocused,
                ]}
              >
                <Icon
                  name="edit-3"
                  size={18}
                  color={isInputFocused ? '#8B5CF6' : '#94A3B8'}
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  style={styles.inputField}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Enter your name"
                  placeholderTextColor="#94A3B8"
                  maxLength={40}
                  autoFocus
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                />
                {editedName.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setEditedName('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="x-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.charCountText}>
                {editedName.length} / 40 characters
              </Text>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setIsEditNameModalVisible(false)}
                  activeOpacity={0.7}
                  disabled={isSavingName}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleSaveName}
                  activeOpacity={0.8}
                  disabled={isSavingName}
                >
                  {isSavingName ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSaveBtnText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  //
  // CONTAINER
  //

  container: {
    flex: 1,
  },

  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 110,
  },

  //
  // PROFILE SECTION
  //

  profileSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 32,
  },

  avatarWrapper: {
    position: 'relative',
    marginBottom: 18,
  },

  avatarPlaceholder: {
    width: 125,
    height: 125,
    borderRadius: 62.5,

    backgroundColor: '#F7DDF4',

    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarImage: {
    width: 125,
    height: 125,
    borderRadius: 62.5,
  },

  editAvatarBtn: {
    position: 'absolute',
    bottom: 4,
    right: 4,

    width: 38,
    height: 38,
    borderRadius: 19,

    backgroundColor: '#8B5CF6',

    justifyContent: 'center',
    alignItems: 'center',

    borderWidth: 3,
    borderColor: '#FFFFFF',
  },

  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  editNameBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },

  userName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },

  userLevel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B94A7',
    marginTop: 6,
  },

  xpText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },

  progressBarBg: {
    width: '60%',
    height: 7,

    backgroundColor: '#ECECF5',

    borderRadius: 999,

    overflow: 'hidden',

    marginTop: 10,
  },

  progressBarFill: {
    width: '52%',
    height: '100%',

    backgroundColor: '#C86BFA',

    borderRadius: 999,
  },

  //
  // STATS
  //

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',

    marginBottom: 28,
  },

  statCard: {
    flex: 1,
    alignItems: 'center',
  },

  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },

  statLabel: {
    marginTop: 6,

    fontSize: 13,
    fontWeight: '500',

    color: '#8B94A7',
  },

  //
  // MENU
  //

  menuContainer: {
    backgroundColor: '#FFFFFF',

    borderRadius: 28,

    overflow: 'hidden',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.05,
    shadowRadius: 12,

    elevation: 3,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    paddingHorizontal: 18,
    paddingVertical: 18,

    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  menuIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 14,

    justifyContent: 'center',
    alignItems: 'center',

    marginRight: 14,
  },

  menuText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },

  //
  // EDIT NAME MODAL
  //

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modalKeyboardAvoid: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    position: 'relative',
    ...Shadow.xl,
  },

  modalCloseBtn: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  modalIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },

  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 50,
  },

  inputContainerFocused: {
    borderColor: '#8B5CF6',
    backgroundColor: '#FFFFFF',
  },

  inputField: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
    height: '100%',
  },

  charCountText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 18,
  },

  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },

  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },

  modalSaveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.sm,
  },

  modalSaveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default ProfileScreen;