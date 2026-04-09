/**
 * SharePreviewCanvas Component
 * 캡처 대상 미리보기 캔버스
 *
 * 전역 Unity host가 이 캔버스 위치에 라이브 scene을 표시하고,
 * RN 오버레이로 기록 항목을 합성한다.
 */

import React, { forwardRef, useMemo, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type {
  ElementTransform,
  ShareRunningData,
  StatElementConfig,
  StatType,
  CharacterTransform,
} from '../../models/types';
import { SCALE_RANGES } from '../../constants/shareOptions';
import {
  SHARE_DIAGNOSTIC_MARKERS,
  SHARE_DIAGNOSTIC_MARKER_INSET,
  SHARE_DIAGNOSTIC_MARKER_SIZE,
  type ShareDiagnosticMarker,
} from '../../constants/shareDiagnostics';
import { DraggableStat } from './DraggableStat';
import { DraggableRouteMap } from './DraggableRouteMap';
import { PRIMARY } from '~/shared/styles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_PADDING = 16;
const PREVIEW_WIDTH = SCREEN_WIDTH - CANVAS_PADDING * 2;
const PREVIEW_HEIGHT = PREVIEW_WIDTH * 1.25;
const DEFAULT_CANVAS_CORNER_RADIUS = 16;
const CHARACTER_WIDTH = 0.25;
const CHARACTER_HEIGHT = 0.2;
const POSITION_UPDATE_INTERVAL = 10;
const DEFAULT_CHARACTER_TRANSFORM: CharacterTransform = {
  x: 0.5,
  y: 0.5,
  scale: 1,
};

interface SharePreviewCanvasProps {
  statElements: StatElementConfig[];
  onStatTransformChange: (type: StatType, transform: ElementTransform) => void;
  runningData: ShareRunningData;
  onCharacterPositionChange?: (x: number, y: number) => void;
  onCharacterScaleChange?: (scale: number) => void;
  characterTransform?: CharacterTransform;
  avatarVisible?: boolean;
  interactive?: boolean;
  containerPadding?: boolean;
  cornerRadius?: number;
  diagnosticAnchors?: boolean;
}

export const SharePreviewCanvas = forwardRef<View, SharePreviewCanvasProps>(
  (
    {
      statElements,
      onStatTransformChange,
      runningData,
      onCharacterPositionChange,
      onCharacterScaleChange,
      characterTransform,
      avatarVisible = true,
      interactive = true,
      containerPadding = true,
      cornerRadius = DEFAULT_CANVAS_CORNER_RADIUS,
      diagnosticAnchors = false,
    },
    ref
  ) => {
    const characterWidth = useSharedValue(CHARACTER_WIDTH);
    const characterHeight = useSharedValue(CHARACTER_HEIGHT);
    const initialTransform = {
      x: characterTransform?.x ?? DEFAULT_CHARACTER_TRANSFORM.x,
      y: characterTransform?.y ?? DEFAULT_CHARACTER_TRANSFORM.y,
      scale: characterTransform?.scale ?? DEFAULT_CHARACTER_TRANSFORM.scale,
    };
    const positionX = useSharedValue(initialTransform.x);
    const positionY = useSharedValue(initialTransform.y);
    const scale = useSharedValue(initialTransform.scale);
    const savedScale = useSharedValue(initialTransform.scale);
    const startPositionX = useSharedValue(initialTransform.x);
    const startPositionY = useSharedValue(initialTransform.y);
    const lastPositionUpdateTime = useRef(0);
    const lastScaleUpdateTime = useRef(0);
    const isDraggingCharacter = useSharedValue(false);
    const dragActiveRef = useRef(false);
    const pinchActiveRef = useRef(false);
    const pendingExternalSyncRef = useRef(false);
    const latestExternalTransformRef = useRef<CharacterTransform>(initialTransform);

    const normalizeCharacterTransform = useCallback(
      (transform?: CharacterTransform): CharacterTransform => ({
        x: transform?.x ?? DEFAULT_CHARACTER_TRANSFORM.x,
        y: transform?.y ?? DEFAULT_CHARACTER_TRANSFORM.y,
        scale: transform?.scale ?? DEFAULT_CHARACTER_TRANSFORM.scale,
      }),
      []
    );

    const applyExternalTransform = useCallback(
      (transform: CharacterTransform) => {
        positionX.value = transform.x;
        positionY.value = transform.y;
        scale.value = transform.scale;

        if (!pinchActiveRef.current) {
          savedScale.value = transform.scale;
        }
      },
      [positionX, positionY, savedScale, scale]
    );

    const flushDeferredExternalSync = useCallback(() => {
      if (dragActiveRef.current || pinchActiveRef.current || !pendingExternalSyncRef.current) {
        return;
      }

      pendingExternalSyncRef.current = false;
      applyExternalTransform(latestExternalTransformRef.current);
    }, [applyExternalTransform]);

    const setDragInteractionActive = useCallback(
      (active: boolean) => {
        dragActiveRef.current = active;

        if (!active) {
          flushDeferredExternalSync();
        }
      },
      [flushDeferredExternalSync]
    );

    const setPinchInteractionActive = useCallback(
      (active: boolean) => {
        pinchActiveRef.current = active;

        if (!active) {
          flushDeferredExternalSync();
        }
      },
      [flushDeferredExternalSync]
    );

    const commitExternalPosition = useCallback(
      (x: number, y: number) => {
        latestExternalTransformRef.current = {
          ...latestExternalTransformRef.current,
          x,
          y,
        };
        onCharacterPositionChange?.(x, y);
      },
      [onCharacterPositionChange]
    );

    const commitExternalScale = useCallback(
      (newScale: number) => {
        latestExternalTransformRef.current = {
          ...latestExternalTransformRef.current,
          scale: newScale,
        };
        onCharacterScaleChange?.(newScale);
      },
      [onCharacterScaleChange]
    );

    useEffect(() => {
      const nextTransform = normalizeCharacterTransform(characterTransform);
      latestExternalTransformRef.current = nextTransform;

      if (dragActiveRef.current || pinchActiveRef.current) {
        pendingExternalSyncRef.current = true;
        return;
      }

      applyExternalTransform(nextTransform);
    }, [
      applyExternalTransform,
      characterTransform,
      normalizeCharacterTransform,
    ]);

    const isPointInCharacterArea = useCallback(
      (
        normalizedX: number,
        normalizedY: number,
        transformX: number,
        transformY: number,
        transformScale: number
      ): boolean => {
        'worklet';
        const scaledWidth = characterWidth.value * transformScale;
        const scaledHeight = characterHeight.value * transformScale;
        const halfWidth = scaledWidth / 2;

        return (
          normalizedX >= transformX - halfWidth &&
          normalizedX <= transformX + halfWidth &&
          normalizedY >= transformY - scaledHeight &&
          normalizedY <= transformY
        );
      },
      [characterWidth, characterHeight]
    );

    const throttledPositionUpdate = useCallback(
      (x: number, y: number) => {
        const now = Date.now();
        if (now - lastPositionUpdateTime.current >= POSITION_UPDATE_INTERVAL) {
          lastPositionUpdateTime.current = now;
          onCharacterPositionChange?.(x, y);
        }
      },
      [onCharacterPositionChange]
    );

    const throttledScaleUpdate = useCallback(
      (newScale: number) => {
        const now = Date.now();
        if (now - lastScaleUpdateTime.current >= POSITION_UPDATE_INTERVAL) {
          lastScaleUpdateTime.current = now;
          onCharacterScaleChange?.(newScale);
        }
      },
      [onCharacterScaleChange]
    );

    const panGesture = Gesture.Pan()
      .manualActivation(true)
      .onTouchesDown((event, stateManager) => {
        'worklet';
        const touch = event.changedTouches[0];
        if (!touch) {
          return;
        }

        const touchX = touch.x / PREVIEW_WIDTH;
        const touchY = touch.y / PREVIEW_HEIGHT;
        const isInArea = isPointInCharacterArea(
          touchX,
          touchY,
          positionX.value,
          positionY.value,
          scale.value
        );

        if (isInArea) {
          stateManager.activate();
          isDraggingCharacter.value = true;
          return;
        }

        stateManager.fail();
      })
      .onStart(() => {
        'worklet';
        scheduleOnRN(setDragInteractionActive, true);
        startPositionX.value = positionX.value;
        startPositionY.value = positionY.value;
      })
      .onUpdate((event) => {
        'worklet';
        if (!isDraggingCharacter.value) {
          return;
        }

        const deltaX = event.translationX / PREVIEW_WIDTH;
        const deltaY = event.translationY / PREVIEW_HEIGHT;
        const newX = Math.max(0, Math.min(1, startPositionX.value + deltaX));
        const newY = Math.max(0, Math.min(1, startPositionY.value + deltaY));

        positionX.value = newX;
        positionY.value = newY;
        scheduleOnRN(throttledPositionUpdate, newX, newY);
      })
      .onEnd(() => {
        'worklet';
        if (!isDraggingCharacter.value) {
          return;
        }

        scheduleOnRN(commitExternalPosition, positionX.value, positionY.value);
      })
      .onFinalize(() => {
        'worklet';
        isDraggingCharacter.value = false;
        scheduleOnRN(setDragInteractionActive, false);
      });

    const pinchGesture = Gesture.Pinch()
      .onStart(() => {
        scheduleOnRN(setPinchInteractionActive, true);
        savedScale.value = scale.value;
      })
      .onUpdate((event) => {
        const newScale = savedScale.value * event.scale;
        const clampedScale = Math.max(
          SCALE_RANGES.character.min,
          Math.min(SCALE_RANGES.character.max, newScale)
        );
        scale.value = clampedScale;
        scheduleOnRN(throttledScaleUpdate, clampedScale);
      })
      .onEnd(() => {
        savedScale.value = scale.value;
        scheduleOnRN(commitExternalScale, scale.value);
      })
      .onFinalize(() => {
        scheduleOnRN(setPinchInteractionActive, false);
      });

    const combinedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

    const formattedStats = useMemo(() => {
      const distanceKm = (runningData.distance / 1000).toFixed(2);
      const minutes = Math.floor(runningData.durationSec / 60);
      const seconds = runningData.durationSec % 60;
      const durationStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      const paceFormatted = runningData.pace.replace(':', "'") + '"';

      return {
        distance: { value: distanceKm, label: 'km' },
        time: { value: durationStr, label: '시간' },
        pace: { value: paceFormatted, label: '평균 페이스' },
        points: { value: `+${runningData.earnedPoints}`, label: 'P' },
        map: { value: '', label: '' },
      };
    }, [runningData]);

    const createStatTransformHandler = (type: StatType) => (transform: ElementTransform) => {
      onStatTransformChange(type, transform);
    };

    const getDiagnosticMarkerStyle = useCallback((marker: ShareDiagnosticMarker) => {
      const halfSize = SHARE_DIAGNOSTIC_MARKER_SIZE / 2;

      switch (marker.placement) {
        case 'topLeft':
          return {
            left: SHARE_DIAGNOSTIC_MARKER_INSET,
            top: SHARE_DIAGNOSTIC_MARKER_INSET,
          };
        case 'topRight':
          return {
            left: PREVIEW_WIDTH - SHARE_DIAGNOSTIC_MARKER_INSET - SHARE_DIAGNOSTIC_MARKER_SIZE,
            top: SHARE_DIAGNOSTIC_MARKER_INSET,
          };
        case 'bottomLeft':
          return {
            left: SHARE_DIAGNOSTIC_MARKER_INSET,
            top: PREVIEW_HEIGHT - SHARE_DIAGNOSTIC_MARKER_INSET - SHARE_DIAGNOSTIC_MARKER_SIZE,
          };
        case 'bottomRight':
          return {
            left: PREVIEW_WIDTH - SHARE_DIAGNOSTIC_MARKER_INSET - SHARE_DIAGNOSTIC_MARKER_SIZE,
            top: PREVIEW_HEIGHT - SHARE_DIAGNOSTIC_MARKER_INSET - SHARE_DIAGNOSTIC_MARKER_SIZE,
          };
        case 'center':
          return {
            left: PREVIEW_WIDTH / 2 - halfSize,
            top: PREVIEW_HEIGHT / 2 - halfSize,
          };
        default:
          return {
            left: SHARE_DIAGNOSTIC_MARKER_INSET,
            top: SHARE_DIAGNOSTIC_MARKER_INSET,
          };
      }
    }, []);

    return (
      <View style={[styles.container, containerPadding && styles.containerPadded]}>
        <View
          ref={ref}
          style={[styles.canvas, { borderRadius: cornerRadius }]}
          collapsable={false}
        >
          <View pointerEvents="none" style={styles.unityViewport} />

          {interactive && avatarVisible && (onCharacterPositionChange || onCharacterScaleChange) && (
            <GestureDetector gesture={combinedGesture}>
              <Animated.View style={styles.gestureLayer} />
            </GestureDetector>
          )}

          <View style={styles.overlay} pointerEvents={interactive ? 'box-none' : 'none'}>
            {statElements.map((element) => {
              if (element.type === 'map') {
                return (
                  <DraggableRouteMap
                    key="map"
                    locations={runningData.locations ?? []}
                    transform={element.transform}
                    onTransformChange={createStatTransformHandler('map')}
                    visible={element.visible}
                  />
                );
              }

              const statData = formattedStats[element.type];
              return (
                <DraggableStat
                  key={element.type}
                  type={element.type}
                  value={statData.value}
                  label={statData.label}
                  transform={element.transform}
                  onTransformChange={createStatTransformHandler(element.type)}
                  visible={element.visible}
                />
              );
            })}

            <View style={styles.watermarkContainer}>
              <Text style={styles.watermark}>달려라 태호군</Text>
            </View>

            {diagnosticAnchors && (
              <View pointerEvents="none" style={styles.diagnosticAnchorLayer}>
                {SHARE_DIAGNOSTIC_MARKERS.map((marker) => (
                  <View
                    key={marker.id}
                    style={[
                      styles.diagnosticAnchor,
                      getDiagnosticMarkerStyle(marker),
                      { backgroundColor: marker.colorHex },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }
);

SharePreviewCanvas.displayName = 'SharePreviewCanvas';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  containerPadded: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  canvas: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  unityViewport: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gestureLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  watermarkContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  watermark: {
    fontSize: 12,
    color: PRIMARY[500],
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  diagnosticAnchorLayer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  diagnosticAnchor: {
    position: 'absolute',
    width: SHARE_DIAGNOSTIC_MARKER_SIZE,
    height: SHARE_DIAGNOSTIC_MARKER_SIZE,
  },
});

export default SharePreviewCanvas;
