import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { BorderRadius, Spacing } from '../theme/spacing';

export interface Mood {
  id: string;
  emoji: string;
  label: string;
  color: string;
}

export const MOODS: Mood[] = [
  { id: 'great', emoji: '😄', label: 'Great', color: '#2ECC71' },
  { id: 'good', emoji: '🙂', label: 'Good', color: '#27AE60' },
  { id: 'okay', emoji: '😐', label: 'Okay', color: '#F39C12' },
  { id: 'bad', emoji: '😔', label: 'Bad', color: '#E67E22' },
  { id: 'awful', emoji: '😢', label: 'Awful', color: '#E74C3C' },
];

interface MoodSelectorProps {
  selectedMood?: string;
  onSelectMood: (moodId: string) => void;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const MoodSelector: React.FC<MoodSelectorProps> = ({
  selectedMood,
  onSelectMood,
  showLabels = true,
  size = 'md',
}) => {
  const emojiSize = size === 'sm' ? 24 : size === 'lg' ? 40 : 32;

  return (
    <View style={styles.container}>
      {MOODS.map((mood) => {
        const isSelected = selectedMood === mood.id;
        return (
          <TouchableOpacity
            key={mood.id}
            onPress={() => onSelectMood(mood.id)}
            activeOpacity={0.7}
            style={[
              styles.moodItem,
              isSelected && { backgroundColor: mood.color + '15', borderColor: mood.color, borderWidth: 2 },
            ]}>
            <Text style={{ fontSize: emojiSize }}>{mood.emoji}</Text>
            {showLabels && (
              <Text style={[styles.label, isSelected && { color: mood.color, fontWeight: '600' }]}>
                {mood.label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moodItem: { alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 2, borderColor: 'transparent', minWidth: 56 },
  label: { ...Typography.caption, color: Colors.textSecondary, marginTop: Spacing.xs },
});

export default MoodSelector;
