import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Share,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather as Icon, Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring } from 'react-native-reanimated';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Spacing, Shadow } from '../theme/spacing';
import { getScreenBgColor } from '../theme/screenBgColors';
import Card from '../components/Card';
import FloatingActionButton from '../components/FloatingActionButton';
import Button from '../components/Button';
import { useSocialStore, FeedPost } from '../store/useSocialStore';
import { useAuthStore } from '../store/useAuthStore';
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedHeart = ({ isLiked, size = 20, unlikedColor = Colors.textSecondary }: { isLiked: boolean; size?: number, unlikedColor?: string }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isLiked) {
      scale.value = withSequence(
        withTiming(1.3, { duration: 150 }),
        withSpring(1, { damping: 10, stiffness: 150 })
      );
    } else {
      scale.value = 1;
    }
  }, [isLiked]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons
        name={isLiked ? "heart" : "heart-outline"}
        size={size}
        color={isLiked ? '#EF4444' : unlikedColor}
      />
    </Animated.View>
  );
};

const DEFAULT_POSTS: FeedPost[] = [];

const SocialFeedScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const bgColor = getScreenBgColor('Social');
  const user = useAuthStore((s) => s.user);
  const { posts, stories, isLoading, fetchFeed, createPost, likePost, deletePost, commentPost, addStory, likeStory } = useSocialStore();

  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postAchievement, setPostAchievement] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Post Options Modal state
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);

  // Comment Modal state
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Achievement state
  const ACHIEVEMENT_SUGGESTIONS = ['7 Day Streak', 'First Workout', 'Sleep Master', 'Diet Champion', 'Other'];
  const [selectedAchievement, setSelectedAchievement] = useState<string>('');
  const [customAchievement, setCustomAchievement] = useState('');

  // Story state
  const [storyModalVisible, setStoryModalVisible] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [storyImage, setStoryImage] = useState<string | null>(null);

  // Story Viewer state
  const [viewingStoryUser, setViewingStoryUser] = useState<string | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  useEffect(() => {
    fetchFeed();
  }, []);

  const activeUserStories = useMemo(() => {
    if (!viewingStoryUser) return [];
    return stories.filter(s => s.user === viewingStoryUser).reverse(); // Oldest first
  }, [viewingStoryUser, stories]);

  useEffect(() => {
    let timer: any;
    if (viewingStoryUser && activeUserStories.length > 0) {
      timer = setTimeout(() => {
        if (currentStoryIndex < activeUserStories.length - 1) {
          setCurrentStoryIndex(prev => prev + 1);
        } else {
          setViewingStoryUser(null);
        }
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [viewingStoryUser, currentStoryIndex, activeUserStories]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFeed();
    setRefreshing(false);
  };

  const handleCreatePost = async () => {
    if (!postContent.trim()) return;
    setIsSubmitting(true);
    try {
      const finalAchievement = selectedAchievement === 'Other' ? customAchievement.trim() : selectedAchievement;
      await createPost(postContent.trim(), finalAchievement || undefined);
      setPostContent('');
      setSelectedAchievement('');
      setCustomAchievement('');
      setModalVisible(false);
    } catch {
      // Error handled
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePickStoryImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].uri) {
      setStoryImage(result.assets[0].uri);
    }
  };

  const handleCreateStory = () => {
    if (!storyText.trim() && !storyImage) return;
    addStory(storyText.trim(), user?.name || 'Anonymous', storyImage || undefined);
    setStoryText('');
    setStoryImage(null);
    setStoryModalVisible(false);
    Alert.alert('Story Added', 'Your story will be visible for 24 hours!');
  };

  const handleShare = async (post: FeedPost) => {
    try {
      await Share.share({
        message: `${post.user} shared an update on SelfTrack: "${post.content}" ${post.achievement ? `🏆 ${post.achievement}` : ''}`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleComment = (postId: string) => {
    setActiveCommentPostId(postId);
    setCommentModalVisible(true);
  };

  const submitComment = () => {
    if (activeCommentPostId && commentText.trim()) {
      commentPost(activeCommentPostId, commentText.trim(), user?.name || 'Anonymous');
      setCommentText('');
      // Note: We don't close the modal automatically so they can see their comment.
      // Or we can leave it open. Let's just keep it open so they see the list.
    }
  };

  const handleOptions = (post: FeedPost) => {
    setSelectedPost(post);
    setOptionsModalVisible(true);
  };

  const handleDeletePost = () => {
    if (selectedPost) {
      deletePost(selectedPost.id);
      setOptionsModalVisible(false);
      setSelectedPost(null);
    }
  };

  const filteredPosts = useMemo(() => {
    let result = posts;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.content.toLowerCase().includes(q) ||
          p.user.toLowerCase().includes(q) ||
          (p.achievement && p.achievement.toLowerCase().includes(q))
      );
    }
    return result;
  }, [posts, searchQuery]);

  const uniqueUsers = useMemo(() => {
    const users = new Set<string>();
    const result: {name: string, emoji: string, avatar?: string}[] = [];
    const emojis = ['👩', '👨', '👩‍🦰', '🧑', '👱‍♀️', '👲', '🧔'];
    
    // Always include current user mapped correctly
    if (user?.name) {
      users.add(user.name);
      result.push({ name: user.name, emoji: '🌟', avatar: user.avatar_url });
    }
    
    posts.forEach(p => {
      if (!users.has(p.user) && result.length < 7) {
        users.add(p.user);
        result.push({
          name: p.user.split(' ')[0],
          emoji: p.avatar || emojis[result.length % emojis.length],
          avatar: p.user === user?.name ? user?.avatar_url : undefined
        });
      }
    });
    return result;
  }, [posts, user?.name, user?.avatar_url]);

  const groupedStories = useMemo(() => {
    const groups: Record<string, typeof stories> = {};
    stories.forEach(s => {
      if (!groups[s.user]) groups[s.user] = [];
      groups[s.user].push(s);
    });
    return Object.entries(groups).map(([u, userStories]) => ({
      user: u,
      stories: userStories,
    }));
  }, [stories]);

  const viewerAvatar = useMemo(() => {
    if (!viewingStoryUser) return { emoji: '🌟', avatar: undefined };
    const found = uniqueUsers.find(u => viewingStoryUser.startsWith(u.name));
    return found || { emoji: '🌟', avatar: undefined };
  }, [viewingStoryUser, uniqueUsers]);

  const gradients = [
    ['#e0c3fc', '#8ec5fc'] as const,
    ['#ffecd2', '#fcb69f'] as const,
    ['#cfd9df', '#e2ebf0'] as const,
    ['#a1c4fd', '#c2e9fb'] as const,
    ['#fdfbfb', '#ebedee'] as const,
  ];

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        <View style={styles.header}>
          {!isSearching ? (
            <>
              <Text style={styles.title}>Social Feed</Text>
              <TouchableOpacity style={styles.searchBtn} onPress={() => setIsSearching(true)}>
                <Icon name="search" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color={Colors.textTertiary} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search posts..."
                placeholderTextColor={Colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              <TouchableOpacity style={styles.searchBtn} onPress={() => { setIsSearching(false); setSearchQuery(''); }}>
                <Icon name="x" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Stories/Friends bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesBar}>
          <TouchableOpacity style={styles.storyItem} onPress={() => setStoryModalVisible(true)}>
            <View style={[styles.storyAvatar, styles.storyAdd]}>
              <Icon name="plus" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.storyName}>You</Text>
          </TouchableOpacity>
          {groupedStories.map((group) => {
            const foundUser = uniqueUsers.find(u => group.user.startsWith(u.name));
            return (
            <TouchableOpacity key={group.user} style={styles.storyItem} onPress={() => {
              setViewingStoryUser(group.user);
              setCurrentStoryIndex(0);
            }}>
              <LinearGradient colors={['#ffecd2', '#fcb69f'] as const} style={[styles.storyAvatarGradient, { overflow: 'hidden' }]}>
                {foundUser?.avatar ? (
                  <Image source={{ uri: foundUser.avatar }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={styles.storyEmoji}>{foundUser?.emoji || '🌟'}</Text>
                )}
              </LinearGradient>
              <Text style={styles.storyName}>{group.user.split(' ')[0]}</Text>
            </TouchableOpacity>
          )})}
          {uniqueUsers.filter(u => !groupedStories.some(g => g.user.startsWith(u.name))).map((u, i) => (
            <TouchableOpacity key={`unique-${i}`} style={styles.storyItem}>
              <LinearGradient colors={gradients[i % gradients.length]} style={[styles.storyAvatarGradient, { overflow: 'hidden' }]}>
                {u.avatar ? (
                  <Image source={{ uri: u.avatar }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={styles.storyEmoji}>{u.emoji}</Text>
                )}
              </LinearGradient>
              <Text style={styles.storyName}>{u.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Posts */}
        {filteredPosts.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Icon name="message-square" size={32} color={Colors.textTertiary} />
            </View>
            <Text style={{ color: Colors.textSecondary, fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
              No updates yet
            </Text>
            <Text style={{ color: Colors.textTertiary, textAlign: 'center' }}>
              {searchQuery ? "We couldn't find anything matching your search." : "Be the first to share your journey with the community!"}
            </Text>
          </View>
        ) : (
          filteredPosts.map((post, index) => (
            <Card key={post.id} style={styles.postCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.05)'] as const}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <View style={styles.postHeader}>
                <View style={styles.postUser}>
                  <LinearGradient colors={gradients[index % gradients.length]} style={styles.postAvatarGradient}>
                    <Text style={{ fontSize: 18 }}>{post.avatar || '👤'}</Text>
                  </LinearGradient>
                  <View>
                    <Text style={styles.postUserName}>{post.user}</Text>
                    <Text style={styles.postTime}>{post.time}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleOptions(post)} style={{ padding: 4 }}>
                  <Icon name="more-horizontal" size={20} color={Colors.textTertiary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.postContent}>{post.content}</Text>

              {!!post.achievement && (
                <View style={styles.achievementBadge}>
                  <LinearGradient
                    colors={['#FFD700', '#FFA500'] as const}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.achievementGradient}
                  >
                    <Icon name="award" size={14} color="#FFF" />
                    <Text style={styles.achievementText}>{post.achievement}</Text>
                  </LinearGradient>
                </View>
              )}

              {post.hasImage && (
                <View style={styles.postImage}>
                  <Icon name="image" size={40} color={Colors.textTertiary} />
                </View>
              )}

              <View style={styles.postActions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => likePost(post.id)}
                  activeOpacity={0.7}
                >
                  <AnimatedHeart 
                    isLiked={!!post.isLiked} 
                    size={20} 
                  />
                  <Text style={[styles.actionText, post.isLiked && { color: '#EF4444', fontWeight: '600' }]}>
                    {post.likes}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => handleComment(post.id)}>
                  <Icon name="message-circle" size={20} color={Colors.textSecondary} />
                  <Text style={styles.actionText}>{post.comments}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(post)}>
                  <Icon name="share-2" size={20} color={Colors.textSecondary} />
                  <Text style={styles.actionText}>Share</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <FloatingActionButton icon="edit" onPress={() => setModalVisible(true)} gradient />

      {/* Create Post Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share an Update</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="x" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.postInput}
              placeholder="What habit or milestone are you celebrating today?"
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={4}
              value={postContent}
              onChangeText={setPostContent}
            />

            <Text style={styles.sectionLabel}>Add Achievement (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
              {ACHIEVEMENT_SUGGESTIONS.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion}
                  style={[
                    styles.chip,
                    selectedAchievement === suggestion && styles.chipSelected
                  ]}
                  onPress={() => setSelectedAchievement(selectedAchievement === suggestion ? '' : suggestion)}
                >
                  <Text style={[
                    styles.chipText,
                    selectedAchievement === suggestion && styles.chipTextSelected
                  ]}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedAchievement === 'Other' && (
              <View style={styles.achievementInputRow}>
                <Icon name="award" size={18} color={Colors.warning} />
                <TextInput
                  style={styles.achievementInput}
                  placeholder="Custom Achievement Title"
                  placeholderTextColor={Colors.textTertiary}
                  value={customAchievement}
                  onChangeText={setCustomAchievement}
                  autoFocus
                />
              </View>
            )}

            <Button
              title="Post to Community"
              onPress={handleCreatePost}
              loading={isSubmitting}
              disabled={!postContent.trim()}
              variant="gradient"
              style={{ marginTop: 16 }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Options Modal */}
      <Modal visible={optionsModalVisible} animationType="fade" transparent>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOptionsModalVisible(false)}>
          <View style={styles.optionsContent}>
            {selectedPost?.user_id === user?.id ? (
              <TouchableOpacity style={styles.optionBtn} onPress={handleDeletePost}>
                <Icon name="trash-2" size={20} color="#EF4444" />
                <Text style={[styles.optionText, { color: '#EF4444' }]}>Delete Post</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={styles.optionBtn} onPress={() => { Alert.alert('Post Hidden', 'You will see fewer posts like this.'); setOptionsModalVisible(false); }}>
                  <Icon name="eye-off" size={20} color={Colors.textPrimary} />
                  <Text style={styles.optionText}>Hide Post</Text>
                </TouchableOpacity>
                <View style={styles.optionDivider} />
                <TouchableOpacity style={styles.optionBtn} onPress={() => { Alert.alert('Reported', 'Thank you for reporting this post.'); setOptionsModalVisible(false); }}>
                  <Icon name="flag" size={20} color="#EF4444" />
                  <Text style={[styles.optionText, { color: '#EF4444' }]}>Report Post</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Comment Modal */}
      <Modal visible={commentModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity onPress={() => setCommentModalVisible(false)}>
                <Icon name="x" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flexGrow: 0, maxHeight: 300, marginBottom: 16 }}>
              {activeCommentPostId &&
                posts
                  .find((p) => p.id === activeCommentPostId)
                  ?.commentsList?.map((c) => (
                    <View key={c.id} style={{ marginBottom: 12, backgroundColor: Colors.backgroundGray, padding: 12, borderRadius: BorderRadius.lg }}>
                      <Text style={{ ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' }}>
                        {c.user} <Text style={{ fontWeight: '400', fontSize: 10 }}>• {c.time}</Text>
                      </Text>
                      <Text style={{ ...Typography.body, color: Colors.textPrimary, marginTop: 4 }}>{c.text}</Text>
                    </View>
                  ))}
              {(!posts.find((p) => p.id === activeCommentPostId)?.commentsList || posts.find((p) => p.id === activeCommentPostId)!.commentsList!.length === 0) && (
                <Text style={{ color: Colors.textTertiary, textAlign: 'center', marginVertical: 20 }}>No comments yet. Be the first!</Text>
              )}
            </ScrollView>

            <TextInput
              style={[styles.postInput, { minHeight: 60 }]}
              placeholder="Type your comment..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={2}
              value={commentText}
              onChangeText={setCommentText}
            />

            <Button
              title="Post Comment"
              onPress={submitComment}
              disabled={!commentText.trim()}
              variant="gradient"
              style={{ marginTop: 16 }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Story Creation Modal */}
      <Modal visible={storyModalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: '#000', paddingTop: 60 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, alignItems: 'center', zIndex: 10 }}>
            <TouchableOpacity onPress={() => setStoryModalVisible(false)}>
              <Icon name="x" size={28} color="#FFF" />
            </TouchableOpacity>
            <Button 
              title="Share Story" 
              onPress={handleCreateStory} 
              disabled={!storyText.trim() && !storyImage} 
              size="sm"
              variant="gradient"
              style={{ width: 140 }}
            />
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            {storyImage && (
              <Image source={{ uri: storyImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            )}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: storyImage ? 'rgba(0,0,0,0.3)' : 'transparent', justifyContent: 'center' }]}>
              <TextInput
                style={{
                  fontSize: 28,
                  color: '#FFF',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  width: '100%',
                }}
                placeholder={storyImage ? "Add text (optional)..." : "Type your story..."}
                placeholderTextColor="rgba(255,255,255,0.5)"
                multiline
                autoFocus
                value={storyText}
                onChangeText={setStoryText}
              />
            </View>
          </View>
          
          <View style={{ padding: 20, paddingBottom: 40, flexDirection: 'row', justifyContent: 'center' }}>
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 30 }}
              onPress={handlePickStoryImage}
            >
              <Icon name="image" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{storyImage ? 'Change Image' : 'Add Image'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Story Viewer Modal */}
      <Modal visible={!!viewingStoryUser} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {/* Progress bars */}
          <View style={{ flexDirection: 'row', paddingTop: 60, paddingHorizontal: 10, gap: 4, zIndex: 10 }}>
            {activeUserStories.map((s, i) => (
              <View key={s.id} style={{ flex: 1, height: 2, borderRadius: 1, backgroundColor: i <= currentStoryIndex ? '#FFF' : 'rgba(255,255,255,0.3)' }} />
            ))}
          </View>
          
          <View style={{ paddingHorizontal: 20, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <LinearGradient colors={['#ffecd2', '#fcb69f'] as const} style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {viewerAvatar.avatar ? (
                  <Image source={{ uri: viewerAvatar.avatar }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={{ fontSize: 16 }}>{viewerAvatar.emoji}</Text>
                )}
              </LinearGradient>
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>{viewingStoryUser}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{activeUserStories[currentStoryIndex]?.time}</Text>
            </View>
            <TouchableOpacity onPress={() => setViewingStoryUser(null)}>
              <Icon name="x" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          <View style={{ flex: 1, marginTop: -100 }}>
            {activeUserStories[currentStoryIndex]?.image_url && (
               <Image source={{ uri: activeUserStories[currentStoryIndex].image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            )}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: activeUserStories[currentStoryIndex]?.image_url ? 'rgba(0,0,0,0.3)' : 'transparent', padding: 20 }}>
              <Text style={{ color: '#FFF', fontSize: 28, textAlign: 'center', fontWeight: 'bold' }}>
                {activeUserStories[currentStoryIndex]?.text}
              </Text>
            </View>
            
            {/* Tap areas for navigation */}
            <TouchableOpacity 
              style={{ position: 'absolute', top: 100, bottom: 0, left: 0, width: '30%' }} 
              onPress={() => {
                if (currentStoryIndex > 0) setCurrentStoryIndex(currentStoryIndex - 1);
              }} 
            />
            <TouchableOpacity 
              style={{ position: 'absolute', top: 100, bottom: 0, right: 0, width: '70%' }} 
              onPress={() => {
                if (currentStoryIndex < activeUserStories.length - 1) setCurrentStoryIndex(currentStoryIndex + 1);
                else setViewingStoryUser(null);
              }} 
            />

            {/* Story Actions */}
            {activeUserStories[currentStoryIndex] && (
              <View style={{ position: 'absolute', bottom: 40, right: 20, zIndex: 20 }}>
                <TouchableOpacity 
                  style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 24, flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => likeStory(activeUserStories[currentStoryIndex].id)}
                >
                  <AnimatedHeart 
                    isLiked={!!activeUserStories[currentStoryIndex].isLiked} 
                    size={24} 
                    unlikedColor="#FFF"
                  />
                  {activeUserStories[currentStoryIndex].isLiked && <Text style={{ color: '#EF4444', fontWeight: 'bold', marginLeft: 8 }}>Liked</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    minHeight: 60,
  },
  title: { ...Typography.heading2, color: Colors.textPrimary },
  searchBtn: { padding: 8 },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  storiesBar: { paddingHorizontal: 20, paddingBottom: 16, gap: 16 },
  storyItem: { alignItems: 'center' },
  storyAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.backgroundGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    marginBottom: 4,
  },
  storyAvatarGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    ...Shadow.sm,
  },
  storyAdd: { borderStyle: 'dashed', borderColor: Colors.primary },
  storyEmoji: { fontSize: 24 },
  storyName: { ...Typography.caption, color: Colors.textSecondary },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  postCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.card,
    overflow: 'hidden',
    ...Shadow.md,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  postUser: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  postAvatarGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.sm,
  },
  postUserName: { ...Typography.body, fontWeight: '700', color: Colors.textPrimary },
  postTime: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },
  postContent: {
    ...Typography.body,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginBottom: 12,
  },
  achievementBadge: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  achievementGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  achievementText: { ...Typography.caption, fontWeight: '700', color: '#FFF' },
  postImage: {
    height: 160,
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionText: { ...Typography.caption, color: Colors.textSecondary, fontSize: 14 },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { ...Typography.heading3, color: Colors.textPrimary },
  postInput: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.lg,
    padding: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
    minHeight: 100,
    backgroundColor: Colors.backgroundGray,
  },
  achievementInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.backgroundGray,
  },
  achievementInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  optionsContent: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: 8,
    margin: 20,
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    ...Shadow.lg,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  optionText: {
    ...Typography.body,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  optionDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 8,
  },
  sectionLabel: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  chipsContainer: {
    gap: 8,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundGray,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  }
});

export default SocialFeedScreen;
