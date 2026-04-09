import { useEffect } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { ElementTransform } from '../../models/types';

interface ScaleRange {
  min: number;
  max: number;
}

interface UseDraggableTransformGestureOptions {
  transform: ElementTransform;
  scaleRange: ScaleRange;
  onTransformChange: (transform: ElementTransform) => void;
}

interface UseDraggableTransformGestureValue {
  combinedGesture: ReturnType<typeof Gesture.Simultaneous>;
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
}

export const useDraggableTransformGesture = ({
  transform,
  scaleRange,
  onTransformChange,
}: UseDraggableTransformGestureOptions): UseDraggableTransformGestureValue => {
  const translateX = useSharedValue(transform.x);
  const translateY = useSharedValue(transform.y);
  const scale = useSharedValue(transform.scale);
  const offsetX = useSharedValue(transform.x);
  const offsetY = useSharedValue(transform.y);
  const savedScale = useSharedValue(transform.scale);
  const dragScale = useSharedValue(1);

  useEffect(() => {
    translateX.value = transform.x;
    translateY.value = transform.y;
    offsetX.value = transform.x;
    offsetY.value = transform.y;
    scale.value = transform.scale;
    savedScale.value = transform.scale;
  }, [
    offsetX,
    offsetY,
    savedScale,
    scale,
    transform.scale,
    transform.x,
    transform.y,
    translateX,
    translateY,
  ]);

  const updateTransform = (x: number, y: number, nextScale: number) => {
    onTransformChange({ x, y, scale: nextScale });
  };

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

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const nextScale = savedScale.value * event.scale;
      scale.value = Math.max(scaleRange.min, Math.min(nextScale, scaleRange.max));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      scheduleOnRN(updateTransform, translateX.value, translateY.value, scale.value);
    });

  return {
    combinedGesture: Gesture.Simultaneous(panGesture, pinchGesture),
    animatedStyle: useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value * dragScale.value },
      ],
    })),
  };
};
