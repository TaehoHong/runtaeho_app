/**
 * PoseSelector Component
 * 포즈 선택 UI 컴포넌트
 */

import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import type { PoseOption } from '../../models/types';
import { POSE_OPTIONS } from '../../constants/shareOptions';
import { GREY, PRIMARY } from '~/shared/styles';

interface PoseSelectorProps {
  /** 선택된 포즈 */
  selectedPose: PoseOption;
  /** 포즈 선택 콜백 */
  onSelect: (pose: PoseOption) => void;
  /** 비활성화 상태 */
  disabled?: boolean;
}

export const PoseSelector: React.FC<PoseSelectorProps> = ({
  selectedPose,
  onSelect,
  disabled = false,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>포즈</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {POSE_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionButton,
              selectedPose.id === option.id && styles.optionButtonSelected,
              disabled && styles.optionButtonDisabled,
            ]}
            onPress={() => !disabled && onSelect(option)}
            activeOpacity={disabled ? 1 : 0.7}
            disabled={disabled}
          >
            <Text style={[
              styles.optionName,
              selectedPose.id === option.id && styles.optionNameSelected,
            ]}>
              {option.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: GREY[800],
    marginBottom: 12,
    paddingHorizontal: 16,
    fontFamily: 'Pretendard-SemiBold',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: GREY[100],
    borderWidth: 1,
    borderColor: GREY[200],
  },
  optionButtonSelected: {
    backgroundColor: PRIMARY[500],
    borderColor: PRIMARY[500],
  },
  optionButtonDisabled: {
    opacity: 0.5,
  },
  optionName: {
    fontSize: 14,
    fontWeight: '500',
    color: GREY[700],
    fontFamily: 'Pretendard-Medium',
  },
  optionNameSelected: {
    color: '#FFFFFF',
  },
});

export default PoseSelector;
