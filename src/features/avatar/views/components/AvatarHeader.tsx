/**
 * 아바타 헤더 컴포넌트
 * SRP: 헤더 UI만 담당
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AVATAR_COLORS } from '~/features/avatar';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onClose: (() => void)
  points: number;
}

export const AvatarHeader: React.FC<Props> = ({ onClose, points }) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onClose} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color="#2B2B2B" />
      </TouchableOpacity>

      {/* Title */}
      <Text style={styles.title}>아바타</Text>

      {/* Points */}
      <View style={styles.pointsContainer}>
        <View style={styles.pointIcon} />
        <Text style={styles.pointsText}>{points.toLocaleString()}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: AVATAR_COLORS.CARD_BACKGROUND,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: AVATAR_COLORS.PRIMARY_TEXT,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: AVATAR_COLORS.PRIMARY_TEXT,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pointIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: AVATAR_COLORS.POINT_ICON,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: '600',
    color: AVATAR_COLORS.PRIMARY_TEXT,
  },
});
