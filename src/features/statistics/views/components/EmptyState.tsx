/**
 * Empty State Component
 * Figma: 38:5436 (101, 610, 172x16)
 *
 * 데이터가 없을 때 표시되는 메시지
 * "러닝을 시작하면 기록이 생겨요!"
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GREY } from '~/shared/styles';

interface EmptyStateProps {
  message?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  message = '러닝을 시작하면 기록이 생겨요!',
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  message: {
    fontSize: 16,
    color: GREY[400],
    textAlign: 'center',
  },
});
