/**
 * DraggableStat Component
 * 드래그 및 핀치 줌이 가능한 개별 기록 항목 컴포넌트
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import type { StatType, ElementTransform } from '../../models/types';
import { SCALE_RANGES } from '../../constants/shareOptions';
import { useDraggableTransformGesture } from './useDraggableTransformGesture';
import { GREY } from '~/shared/styles';

interface DraggableStatProps {
  /** 통계 항목 타입 */
  type: StatType;
  /** 표시할 값 */
  value: string;
  /** 라벨 (예: km, 분, '/km', P) */
  label: string;
  /** 현재 변환 상태 */
  transform: ElementTransform;
  /** 변환 변경 콜백 */
  onTransformChange: (transform: ElementTransform) => void;
  /** 표시 여부 */
  visible: boolean;
}

export const DraggableStat: React.FC<DraggableStatProps> = ({
  type,
  value,
  label,
  transform,
  onTransformChange,
  visible,
}) => {
  const { combinedGesture, animatedStyle } = useDraggableTransformGesture({
    transform,
    scaleRange: SCALE_RANGES.stat,
    onTransformChange,
  });

  // 숨김 처리
  if (!visible) {
    return null;
  }

  // 타입별 스타일 및 아이콘 결정
  const getStatStyle = () => {
    switch (type) {
      case 'distance':
        return {
          valueStyle: styles.distanceValue,
          labelStyle: styles.distanceLabel,
        };
      case 'time':
        return {
          valueStyle: styles.timeValue,
          labelStyle: styles.timeLabel,
        };
      case 'pace':
        return {
          valueStyle: styles.paceValue,
          labelStyle: styles.paceLabel,
        };
      case 'map':
        // 'map' 타입은 DraggableRouteMap으로 별도 렌더링됨
        // DraggableStat에서는 렌더링하지 않음
        return {
          valueStyle: { fontSize: 0 },
          labelStyle: { fontSize: 0 },
        };
    }
  };

  const { valueStyle, labelStyle } = getStatStyle();

  return (
    <GestureDetector gesture={combinedGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {/* time, pace: 세로 레이아웃 (라벨 위, 값 아래) */}
        {(type === 'time' || type === 'pace') ? (
          <View style={styles.verticalWrapper}>
            <Text style={[styles.label, labelStyle]}>{label}</Text>
            <Text style={[styles.value, valueStyle]}>{value}</Text>
          </View>
        ) : (
          <View style={styles.contentWrapper}>
            <Text style={[styles.value, valueStyle]}>{value}</Text>
            <Text style={[styles.label, labelStyle]}>{label}</Text>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
    // 텍스트 그림자로 가독성 확보
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  verticalWrapper: {
    flexDirection: 'column',
    alignItems: 'center',
    // 텍스트 그림자로 가독성 확보
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  value: {
    fontFamily: 'Pretendard-Bold',
    color: '#FFFFFF',
    // 텍스트 그림자
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  label: {
    fontFamily: 'Pretendard-Medium',
    color: '#FFFFFF',
    marginLeft: 4,
    // 텍스트 그림자
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  // 거리 - 가장 큰 폰트
  distanceValue: {
    fontSize: 56,
  },
  distanceLabel: {
    fontSize: 24,
  },
  // 시간
  timeValue: {
    fontSize: 28,
    color: GREY[100],
  },
  timeLabel: {
    fontSize: 14,
    color: GREY[200],
    marginBottom: 2,
    marginLeft: 0,
  },
  // 페이스
  paceValue: {
    fontSize: 28,
    color: GREY[100],
  },
  paceLabel: {
    fontSize: 14,
    color: GREY[200],
    marginBottom: 2,
    marginLeft: 0,
  },
});

export default DraggableStat;
