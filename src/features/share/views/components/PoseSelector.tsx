/**
 * PoseSelector Component
 * 포즈 선택 UI 컴포넌트
 *
 * Figma 프로토타입 351:6944 정확 반영
 * - 버튼 높이: 48px
 * - pill 형태 버튼
 * - 그라데이션 활성 상태
 * - 섹션 카드 래핑
 */

import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
    <View style={styles.sectionCard}>
      <Text style={styles.title}>포즈</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {POSE_OPTIONS.map((option) => {
          const isSelected = selectedPose.id === option.id;

          return (
            <TouchableOpacity
              key={option.id}
              onPress={() => !disabled && onSelect(option)}
              activeOpacity={disabled ? 1 : 0.7}
              disabled={disabled}
              style={disabled ? styles.buttonDisabled : undefined}
            >
              {isSelected ? (
                // 활성 상태: 그라데이션 배경
                <LinearGradient
                  colors={[PRIMARY[500], PRIMARY[600]]}
                  style={[styles.poseButton, styles.poseButtonActive]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.poseEmoji}>{option.icon}</Text>
                  <Text style={[styles.poseLabel, styles.poseLabelActive]}>
                    {option.name}
                  </Text>
                </LinearGradient>
              ) : (
                // 비활성 상태: 일반 배경
                <View style={styles.poseButton}>
                  <Text style={styles.poseEmoji}>{option.icon}</Text>
                  <Text style={styles.poseLabel}>{option.name}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    marginHorizontal: 16,
    marginBottom: 14,
    paddingVertical: 16,
    // 카드 그림자
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#364153',
    marginBottom: 12,
    paddingHorizontal: 16,
    fontFamily: 'Pretendard-SemiBold',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  poseButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: 9999, // pill 형태
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: GREY[200],
  },
  poseButtonActive: {
    borderWidth: 0,
    // PRIMARY 색상 그림자
    shadowColor: PRIMARY[500],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  poseEmoji: {
    fontSize: 18,
  },
  poseLabel: {
    fontSize: 14,
    color: '#364153',
    fontFamily: 'Pretendard-Medium',
  },
  poseLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default PoseSelector;
