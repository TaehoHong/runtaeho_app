/**
 * DraggableAvatar Component
 * 드래그 및 핀치 줌이 가능한 아바타 이미지 컴포넌트
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { ElementTransform } from '../../models/types';

interface DraggableAvatarProps {
  /** Base64 인코딩된 아바타 이미지 */
  avatarImage: string | null;
  /** 현재 변환 상태 */
  transform: ElementTransform;
  /** 변환 변경 콜백 */
  onTransformChange: (transform: ElementTransform) => void;
  /** 아바타 기본 크기 */
  size?: number;
}

// 스케일 범위 상수
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;

export const DraggableAvatar: React.FC<DraggableAvatarProps> = ({
  avatarImage,
  transform,
  onTransformChange,
  size = 200,
}) => {
  // Animated values for position
  const translateX = useSharedValue(transform.x);
  const translateY = useSharedValue(transform.y);
  const offsetX = useSharedValue(transform.x);
  const offsetY = useSharedValue(transform.y);

  // Animated values for scale
  const scale = useSharedValue(transform.scale);
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

      scheduleOnRN(updateTransform, translateX.value, translateY.value, scale.value);
    });

  // Pinch gesture for scaling
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const newScale = savedScale.value * event.scale;
      scale.value = Math.max(MIN_SCALE, Math.min(newScale, MAX_SCALE));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      scheduleOnRN(updateTransform, translateX.value, translateY.value, scale.value);
    });

  // Combine gestures for simultaneous pan and pinch
  const combinedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // Animated style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value * dragScale.value },
    ],
  }));

  if (!avatarImage) {
    return (
      <View style={[styles.placeholder, { width: size, height: size }]}>
        {/* 로딩 중이거나 이미지 없음 */}
      </View>
    );
  }

  return (
    <GestureDetector gesture={combinedGesture}>
      <Animated.View style={[styles.container, animatedStyle, { width: size, height: size }]}>
        <Image
          source={{ uri: `data:image/png;base64,${avatarImage}` }}
          style={styles.avatar}
          contentFit="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
});

export default DraggableAvatar;
