/**
 * StatVisibilityToggle Component
 * 통계 항목 표시/숨김 토글 컴포넌트
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import type { StatType, StatElementConfig } from '../../models/types';
import { GREY, PRIMARY } from '~/shared/styles';

interface StatVisibilityToggleProps {
  /** 통계 요소 설정 배열 */
  statElements: StatElementConfig[];
  /** 가시성 토글 콜백 */
  onToggle: (type: StatType) => void;
}

// 통계 항목 메타데이터
const STAT_METADATA: Record<StatType, { label: string; icon: string }> = {
  distance: { label: '거리', icon: '📏' },
  time: { label: '시간', icon: '⏱️' },
  pace: { label: '페이스', icon: '🏃' },
  points: { label: '포인트', icon: '⭐' },
};

export const StatVisibilityToggle: React.FC<StatVisibilityToggleProps> = ({
  statElements,
  onToggle,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>기록 항목</Text>
      <View style={styles.toggleContainer}>
        {statElements.map((element) => {
          const metadata = STAT_METADATA[element.type];
          const isVisible = element.visible;

          return (
            <TouchableOpacity
              key={element.type}
              style={[styles.toggleButton, isVisible && styles.toggleButtonActive]}
              onPress={() => onToggle(element.type)}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleIcon}>{metadata.icon}</Text>
              <Text style={[styles.toggleLabel, isVisible && styles.toggleLabelActive]}>
                {metadata.label}
              </Text>
              {isVisible && (
                <View style={styles.checkIndicator}>
                  <Text style={styles.checkIcon}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
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
  toggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: GREY[100],
    borderWidth: 1,
    borderColor: GREY[200],
    position: 'relative',
  },
  toggleButtonActive: {
    backgroundColor: PRIMARY[50],
    borderColor: PRIMARY[500],
  },
  toggleIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  toggleLabel: {
    fontSize: 11,
    color: GREY[500],
    fontFamily: 'Pretendard-Medium',
  },
  toggleLabelActive: {
    color: PRIMARY[700],
    fontWeight: '600',
  },
  checkIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: PRIMARY[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
  },
});

export default StatVisibilityToggle;
