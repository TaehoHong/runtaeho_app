import { useEffect } from 'react';
import type { ViewStyle } from 'react-native';
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
  animatedStyle: ReturnType<typeof useAnimatedStyle<ViewStyle>>;
}

export const useDraggableTransformGesture = ({
  transform,
  scaleRange,
  onTransformChange,
}: UseDraggableTransformGestureOptions): UseDraggableTransformGestureValue => {
  const translateX = useSharedValue(transform.x);
  const translateY = useSharedValue(transform.y);
  const scale = useSharedValue(transform.scale);
  const rotation = useSharedValue(transform.rotation ?? 0);
  const offsetX = useSharedValue(transform.x);
  const offsetY = useSharedValue(transform.y);
  const savedScale = useSharedValue(transform.scale);
  const savedRotation = useSharedValue(transform.rotation ?? 0);
  const dragScale = useSharedValue(1);

  useEffect(() => {
    translateX.value = transform.x;
    translateY.value = transform.y;
    offsetX.value = transform.x;
    offsetY.value = transform.y;
    scale.value = transform.scale;
    rotation.value = transform.rotation ?? 0;
    savedScale.value = transform.scale;
    savedRotation.value = transform.rotation ?? 0;
  }, [
    offsetX,
    offsetY,
    rotation,
    savedRotation,
    savedScale,
    scale,
    transform.rotation,
    transform.scale,
    transform.x,
    transform.y,
    translateX,
    translateY,
  ]);

  const updateTransform = (x: number, y: number, nextScale: number, nextRotation: number) => {
    onTransformChange({ x, y, scale: nextScale, rotation: nextRotation });
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

      scheduleOnRN(updateTransform, translateX.value, translateY.value, scale.value, rotation.value);
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const nextScale = savedScale.value * event.scale;
      scale.value = Math.max(scaleRange.min, Math.min(nextScale, scaleRange.max));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      scheduleOnRN(updateTransform, translateX.value, translateY.value, scale.value, rotation.value);
    });

  const rotationGesture = Gesture.Rotation()
    .onStart(() => {
      savedRotation.value = rotation.value;
    })
    .onUpdate((event) => {
      rotation.value = savedRotation.value + (event.rotation * 180) / Math.PI;
    })
    .onEnd(() => {
      savedRotation.value = rotation.value;
      scheduleOnRN(updateTransform, translateX.value, translateY.value, scale.value, rotation.value);
    });

  return {
    combinedGesture: Gesture.Simultaneous(panGesture, pinchGesture, rotationGesture),
    animatedStyle: useAnimatedStyle<ViewStyle>(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value * dragScale.value },
        { rotate: `${rotation.value}deg` },
      ],
    })),
  };
};
