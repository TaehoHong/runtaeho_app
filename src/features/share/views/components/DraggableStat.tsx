/**
 * DraggableStat Component
 * 드래그 및 핀치 줌이 가능한 개별 기록 항목 컴포넌트
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import type { StatType, ElementTransform } from '../../models/types';
import { GREY, PRIMARY } from '~/shared/styles';

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

// 스케일 범위 상수
const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;

export const DraggableStat: React.FC<DraggableStatProps> = ({
  type,
  value,
  label,
  transform,
  onTransformChange,
  visible,
}) => {
  // Animated values
  const translateX = useSharedValue(transform.x);
  const translateY = useSharedValue(transform.y);
  const scale = useSharedValue(transform.scale);

  // Offset values for gesture tracking
  const offsetX = useSharedValue(transform.x);
  const offsetY = useSharedValue(transform.y);
  const savedScale = useSharedValue(transform.scale);

  // 드래그 중 시각적 피드백용 스케일
  const dragScale = useSharedValue(1);

  // Update shared values when transform prop changes
  React.useEffect(() => {
    translateX.value = transform.x;
    translateY.value = transform.y;
    offsetX.value = transform.x;
    offsetY.value = transform.y;
    scale.value = transform.scale;
    savedScale.value = transform.scale;
  }, [transform.x, transform.y, transform.scale]);

  // 변환 업데이트 함수 (JS 스레드에서 실행)
  const updateTransform = (x: number, y: number, s: number) => {
    onTransformChange({ x, y, scale: s });
  };

  // Pan gesture for dragging
  const panGesture = Gesture.Pan()
    .onStart(() => {
      dragScale.value = withSpring(1.05);
    })
    .onUpdate((event) => {
      translateX.value = event.translationX + offsetX.value;
      translateY.value = event.translationY + offsetY.value;
    })
    .onEnd(() => {
      offsetX.value = translateX.value;
      offsetY.value = translateY.value;
      dragScale.value = withSpring(1);

      runOnJS(updateTransform)(translateX.value, translateY.value, scale.value);
    });

  // Pinch gesture for scaling
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const newScale = savedScale.value * event.scale;
      scale.value = Math.max(MIN_SCALE, Math.min(newScale, MAX_SCALE));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      runOnJS(updateTransform)(translateX.value, translateY.value, scale.value);
    });

  // Combine gestures
  const combinedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // Animated style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value * dragScale.value },
    ],
  }));

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
      case 'points':
        return {
          valueStyle: styles.pointsValue,
          labelStyle: styles.pointsLabel,
        };
    }
  };

  const { valueStyle, labelStyle } = getStatStyle();

  return (
    <GestureDetector gesture={combinedGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <View style={styles.contentWrapper}>
          <Text style={[styles.value, valueStyle]}>{value}</Text>
          <Text style={[styles.label, labelStyle]}>{label}</Text>
        </View>
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
  },
  // 페이스
  paceValue: {
    fontSize: 28,
    color: GREY[100],
  },
  paceLabel: {
    fontSize: 14,
    color: GREY[200],
  },
  // 포인트 - 브랜드 컬러
  pointsValue: {
    fontSize: 24,
    color: PRIMARY[500],
  },
  pointsLabel: {
    fontSize: 12,
    color: PRIMARY[400],
  },
});

export default DraggableStat;
