/**
 * 아바타 헤더 컴포넌트
 * SRP: 헤더 UI만 담당
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '~/shared/components/ui';
import { GREY } from '~/shared/styles';

interface Props {
  onClose: (() => void)
  points: number;
}

export const AvatarHeader: React.FC<Props> = ({ onClose, points }) => {

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onClose} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={GREY[900]} />
      </TouchableOpacity>

      {/* Title */}
      <Text style={styles.title}>아바타</Text>

      {/* Points */}
      <View style={styles.pointsContainer}>
        <Icon name = "point" size={20} />
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
    paddingHorizontal: 16,
    backgroundColor: GREY[50],
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: GREY[900],
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: GREY[900],
  },
});
