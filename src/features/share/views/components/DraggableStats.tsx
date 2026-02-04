/**
 * DraggableStats Component
 * 드래그 가능한 러닝 통계 카드 컴포넌트
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import type { ElementPosition, ShareRunningData } from '../../models/types';
import { GREY, PRIMARY } from '~/shared/styles';

interface DraggableStatsProps {
  /** 러닝 데이터 */
  runningData: ShareRunningData;
  /** 현재 위치 */
  position: ElementPosition;
  /** 위치 변경 콜백 */
  onPositionChange: (position: ElementPosition) => void;
}

export const DraggableStats: React.FC<DraggableStatsProps> = ({
  runningData,
  position,
  onPositionChange,
}) => {
  // Animated values for dragging
  const translateX = useSharedValue(position.x);
  const translateY = useSharedValue(position.y);
  const offsetX = useSharedValue(position.x);
  const offsetY = useSharedValue(position.y);
  const scale = useSharedValue(1);

  // Update shared values when position prop changes
  React.useEffect(() => {
    translateX.value = position.x;
    translateY.value = position.y;
    offsetX.value = position.x;
    offsetY.value = position.y;
  }, [position.x, position.y]);

  // Pan gesture for dragging
  const panGesture = Gesture.Pan()
    .onStart(() => {
      scale.value = withSpring(1.02);
    })
    .onUpdate((event) => {
      translateX.value = event.translationX + offsetX.value;
      translateY.value = event.translationY + offsetY.value;
    })
    .onEnd(() => {
      offsetX.value = translateX.value;
      offsetY.value = translateY.value;
      scale.value = withSpring(1);

      // Notify parent of position change
      onPositionChange({
        x: translateX.value,
        y: translateY.value,
      });
    });

  // Animated style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // 포맷팅
  const distanceKm = (runningData.distance / 1000).toFixed(2);
  const minutes = Math.floor(runningData.durationSec / 60);
  const seconds = runningData.durationSec % 60;
  const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {/* 메인 거리 */}
        <View style={styles.distanceContainer}>
          <Text style={styles.distanceValue}>{distanceKm}</Text>
          <Text style={styles.distanceUnit}>km</Text>
        </View>

        {/* 추가 통계 */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>시간</Text>
            <Text style={styles.statValue}>{durationStr}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>페이스</Text>
            <Text style={styles.statValue}>{runningData.pace}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>포인트</Text>
            <Text style={styles.statValue}>+{runningData.earnedPoints}</Text>
          </View>
        </View>

        {/* 워터마크 */}
        <Text style={styles.watermark}>RunTaeho</Text>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 16,
  },
  distanceValue: {
    fontSize: 48,
    fontWeight: '700',
    color: GREY[900],
    fontFamily: 'Pretendard-Bold',
  },
  distanceUnit: {
    fontSize: 20,
    fontWeight: '500',
    color: GREY[600],
    marginLeft: 4,
    fontFamily: 'Pretendard-Medium',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: GREY[500],
    marginBottom: 4,
    fontFamily: 'Pretendard-Regular',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: GREY[800],
    fontFamily: 'Pretendard-SemiBold',
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: GREY[200],
  },
  watermark: {
    marginTop: 12,
    fontSize: 10,
    color: PRIMARY[500],
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: 'Pretendard-Medium',
  },
});

export default DraggableStats;
