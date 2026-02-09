/**
 * StatVisibilityToggle Component
 * 통계 항목 표시/숨김 토글 컴포넌트
 *
 * Figma 프로토타입 351:6944 정확 반영
 * - 섹션 제목: "표시할 정보"
 * - SVG 아이콘 (Ionicons)
 * - 72x72 카드 + 그라데이션 배경
 * - 섹션 카드 래핑
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { StatType, StatElementConfig } from '../../models/types';
import { GREY, PRIMARY } from '~/shared/styles';
import { PointIcon } from '~/shared/components/icons';

interface StatVisibilityToggleProps {
  /** 통계 요소 설정 배열 */
  statElements: StatElementConfig[];
  /** 가시성 토글 콜백 */
  onToggle: (type: StatType) => void;
}

// 통계 항목 메타데이터 - Figma 기준 Ionicons
const STAT_METADATA: Record<StatType, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  distance: { label: '거리', icon: 'location-outline' },
  time: { label: '시간', icon: 'time-outline' },
  pace: { label: '페이스', icon: 'flash-outline' },
  points: { label: '포인트', icon: 'sparkles-outline' },
  map: { label: '지도', icon: 'map-outline' },
};

export const StatVisibilityToggle: React.FC<StatVisibilityToggleProps> = ({
  statElements,
  onToggle,
}) => {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.title}>표시할 정보</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.toggleContainer}
      >
        {statElements.map((element) => {
          const metadata = STAT_METADATA[element.type];
          const isVisible = element.visible;

          return (
            <TouchableOpacity
              key={element.type}
              onPress={() => onToggle(element.type)}
              activeOpacity={0.7}
              style={styles.toggleButtonWrapper}
            >
              {isVisible ? (
                // 활성 상태: 그라데이션 배경
                <LinearGradient
                  colors={[PRIMARY[50], 'rgba(212, 251, 200, 0.8)']}
                  style={[styles.toggleButton, styles.toggleButtonActive]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.toggleIcon}>
                    {element.type === 'points' ? (
                      <PointIcon size={24} color={PRIMARY[600]} />
                    ) : (
                      <Ionicons name={metadata.icon} size={24} color={PRIMARY[600]} />
                    )}
                  </View>
                  <Text style={[styles.toggleLabel, styles.toggleLabelActive]}>
                    {metadata.label}
                  </Text>
                </LinearGradient>
              ) : (
                // 비활성 상태: 일반 배경
                <View style={styles.toggleButton}>
                  <View style={styles.toggleIcon}>
                    {element.type === 'points' ? (
                      <PointIcon size={24} color={GREY[500]} />
                    ) : (
                      <Ionicons name={metadata.icon} size={24} color={GREY[500]} />
                    )}
                  </View>
                  <Text style={styles.toggleLabel}>
                    {metadata.label}
                  </Text>
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
    paddingVertical: 20,
    paddingHorizontal: 20,
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
    fontFamily: 'Pretendard-SemiBold',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleButtonWrapper: {
    // TouchableOpacity 래퍼
  },
  toggleButton: {
    width: 72,
    height: 72,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#f9fafb',
  },
  toggleButtonActive: {
    // PRIMARY 색상 그림자
    shadowColor: '#59ec3a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  toggleIcon: {
    marginBottom: 6,
  },
  toggleLabel: {
    fontSize: 12,
    color: GREY[500],
    fontFamily: 'Pretendard-Medium',
  },
  toggleLabelActive: {
    color: '#21c427',
    fontWeight: '600',
  },
});

export default StatVisibilityToggle;
