/**
 * SharePreviewCanvas Component
 * 캡처 대상 미리보기 캔버스
 *
 * Unity 뷰를 전체 화면으로 표시하고
 * RN 오버레이로 기록 항목을 표시
 *
 * Sprint 2: 드래그/핀치 줌으로 캐릭터 위치/스케일 조작
 */

import React, { forwardRef, useMemo, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import type {
  BackgroundOption,
  ElementTransform,
  ShareRunningData,
  StatElementConfig,
  StatType,
} from '../../models/types';
import { DraggableStat } from './DraggableStat';
import { PRIMARY } from '~/shared/styles';
import { UnityView } from '~/features/unity/components/UnityView';
import type { UnityReadyEvent } from '~/features/unity/bridge/UnityBridge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_WIDTH = SCREEN_WIDTH - 64;
const PREVIEW_HEIGHT = PREVIEW_WIDTH * (16 / 9); // 9:16 비율

// 캐릭터 스케일 범위
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;

// 캐릭터 영역 크기 (정규화 좌표 기준) - Single Source of Truth
// ★ 실제 Unity 캐릭터 크기에 맞게 조정됨
const CHARACTER_WIDTH = 0.25; // 화면 너비의 30%
const CHARACTER_HEIGHT = 0.2; // 화면 높이의 35%

// Unity 스케일 팩터는 useShareEditor.ts로 이동 (Unity 전달 시점에 적용)

/** 캐릭터 위치/스케일 변환 정보 */
export interface CharacterTransform {
  /** X 좌표 (0~1 정규화, 0=좌측, 1=우측) */
  x: number;
  /** Y 좌표 (0~1 정규화, 0=상단, 1=하단) */
  y: number;
  /** 스케일 (0.5~2.5) */
  scale: number;
}

// 드래그/핀치 중 Unity 호출 간격 (ms)
const POSITION_UPDATE_INTERVAL = 10; // 10ms = 100fps (더 부드러운 움직임)

interface SharePreviewCanvasProps {
  /** 선택된 배경 */
  background: BackgroundOption;
  /** 통계 요소 설정 배열 */
  statElements: StatElementConfig[];
  /** 통계 요소 변환 변경 콜백 */
  onStatTransformChange: (type: StatType, transform: ElementTransform) => void;
  /** 러닝 데이터 */
  runningData: ShareRunningData;
  /** Unity 사용 여부 (iOS만 지원) */
  useUnity?: boolean;
  /** Unity Ready 콜백 (useUnityReadiness의 handleUnityReady 전달) */
  onUnityReady?: (event: UnityReadyEvent) => void;
  /** 캐릭터 위치 변경 콜백 */
  onCharacterPositionChange?: (x: number, y: number) => void;
  /** 캐릭터 스케일 변경 콜백 */
  onCharacterScaleChange?: (scale: number) => void;
  /** 현재 캐릭터 변환 정보 (제어용) */
  characterTransform?: CharacterTransform;
}

export const SharePreviewCanvas = forwardRef<View, SharePreviewCanvasProps>(
  (
    {
      background,
      statElements,
      onStatTransformChange,
      runningData,
      useUnity = Platform.OS === 'ios',
      onUnityReady,
      onCharacterPositionChange,
      onCharacterScaleChange,
      characterTransform,
    },
    ref
  ) => {
    // 상수를 SharedValue로 래핑 (worklet에서 접근 가능하도록)
    const characterWidth = useSharedValue(CHARACTER_WIDTH);
    const characterHeight = useSharedValue(CHARACTER_HEIGHT);

    // 제스처 상태 (Shared Values - worklet에서 사용)
    const positionX = useSharedValue(characterTransform?.x ?? 0.5);
    const positionY = useSharedValue(characterTransform?.y ?? 0.5);
    const scale = useSharedValue(characterTransform?.scale ?? 1);
    const savedScale = useSharedValue(characterTransform?.scale ?? 1);

    // 드래그 시작 시 초기 위치 저장
    const startPositionX = useSharedValue(characterTransform?.x ?? 0.5);
    const startPositionY = useSharedValue(characterTransform?.y ?? 0.5);

    // Throttle용 마지막 업데이트 시간 (ref로 관리)
    const lastPositionUpdateTime = useRef(0);
    const lastScaleUpdateTime = useRef(0);

    // 캐릭터 드래그 활성화 상태 (Shared Value - worklet에서 동기적으로 접근)
    const isDraggingCharacter = useSharedValue(false);

    /**
     * 터치 포인트가 캐릭터 영역 내에 있는지 확인 (worklet)
     * SharedValue를 통해 모듈 레벨 상수 참조 (SPOT 원칙 준수)
     */
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
        const halfHeight = scaledHeight / 2;

        return (
          normalizedX >= transformX - halfWidth &&
          normalizedX <= transformX + halfWidth &&
          normalizedY >= transformY - halfHeight &&
          normalizedY <= transformY + halfHeight
        );
      },
      [characterWidth, characterHeight]
    );

    // 위치 변경 콜백 (JS 스레드에서 실행 - 드래그 종료 시)
    const handlePositionChange = useCallback(
      (x: number, y: number) => {
        onCharacterPositionChange?.(x, y);
      },
      [onCharacterPositionChange]
    );

    // 스케일 변경 콜백 (JS 스레드에서 실행 - 핀치 종료 시)
    const handleScaleChange = useCallback(
      (newScale: number) => {
        onCharacterScaleChange?.(newScale);
      },
      [onCharacterScaleChange]
    );

    // Throttled 위치 업데이트 (드래그 중 실시간 호출)
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

    // Throttled 스케일 업데이트 (핀치 줌 중 실시간 호출)
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


    // 드래그 제스처 (manualActivation으로 캐릭터 영역 외 터치 시 ScrollView로 전파)
    const panGesture = Gesture.Pan()
      .manualActivation(true)
      .onTouchesDown((event, stateManager) => {
        'worklet';
        const touch = event.changedTouches[0];
        if (!touch) return;

        // 터치 시작 위치를 정규화 좌표로 변환
        const touchX = touch.x / PREVIEW_WIDTH;
        const touchY = touch.y / PREVIEW_HEIGHT;

        // 캐릭터 영역 내 터치인지 확인
        const isInArea = isPointInCharacterArea(
          touchX,
          touchY,
          positionX.value,
          positionY.value,
          scale.value
        );

        if (isInArea) {
          // 캐릭터 영역 → 제스처 활성화
          stateManager.activate();
          isDraggingCharacter.value = true;
        } else {
          // 캐릭터 영역 외 → 제스처 실패 → ScrollView로 전파
          stateManager.fail();
        }
      })
      .onStart(() => {
        'worklet';
        // 시작 위치 저장만 (점프 제거 - 현재 위치에서 드래그 시작)
        startPositionX.value = positionX.value;
        startPositionY.value = positionY.value;
      })
      .onUpdate((event) => {
        'worklet';
        if (!isDraggingCharacter.value) return;

        // 정규화된 이동량 계산 (스케일 팩터는 useShareEditor에서 Unity 전달 시 적용)
        const deltaX = event.translationX / PREVIEW_WIDTH;
        const deltaY = event.translationY / PREVIEW_HEIGHT;

        // 0~1 범위로 클램프
        const newX = Math.max(0, Math.min(1, startPositionX.value + deltaX));
        const newY = Math.max(0, Math.min(1, startPositionY.value + deltaY));

        positionX.value = newX;
        positionY.value = newY;

        // 드래그 중 실시간 Unity 호출 (throttled)
        runOnJS(throttledPositionUpdate)(newX, newY);
      })
      .onEnd(() => {
        'worklet';
        if (!isDraggingCharacter.value) return;

        // 최종 위치 보정 (정확도 보장)
        runOnJS(handlePositionChange)(positionX.value, positionY.value);
        isDraggingCharacter.value = false;
      })
      .onTouchesUp(() => {
        'worklet';
        // 터치 종료 시 드래그 상태 초기화 (예외 상황 대비)
        isDraggingCharacter.value = false;
      });

    // 핀치 줌 제스처
    const pinchGesture = Gesture.Pinch()
      .onStart(() => {
        savedScale.value = scale.value;
      })
      .onUpdate((event) => {
        const newScale = savedScale.value * event.scale;
        const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
        scale.value = clampedScale;

        // 🔥 핀치 줌 중 실시간 Unity 호출 (throttled)
        runOnJS(throttledScaleUpdate)(clampedScale);
      })
      .onEnd(() => {
        savedScale.value = scale.value;
        // 최종 스케일 보정 (기존 로직 유지 - 정확도 보장)
        runOnJS(handleScaleChange)(scale.value);
      });

    // 드래그 + 핀치 동시 제스처
    const combinedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

    // 통계 데이터를 타입별로 포맷팅
    const formattedStats = useMemo(() => {
      const distanceKm = (runningData.distance / 1000).toFixed(2);
      const minutes = Math.floor(runningData.durationSec / 60);
      const seconds = runningData.durationSec % 60;
      const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      return {
        distance: { value: distanceKm, label: 'km' },
        time: { value: durationStr, label: '분' },
        pace: { value: runningData.pace, label: '/km' },
        points: { value: `+${runningData.earnedPoints}`, label: 'P' },
      };
    }, [runningData]);

    // Fallback 배경 렌더링 (Android 또는 Unity 사용 안함)
    const renderFallbackBackground = () => {
      // 사용자 사진 배경
      if (background.type === 'photo' && background.photoUri) {
        return (
          <Image
            source={{ uri: background.photoUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        );
      }

      // 그라데이션 배경
      if (background.type === 'gradient' && background.colors) {
        return (
          <LinearGradient
            colors={background.colors as [string, string, ...string[]]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        );
      }

      // 단색 배경 또는 Unity 배경 미리보기 색상
      const bgColor =
        background.type === 'unity'
          ? background.source // Unity 배경의 previewColor
          : typeof background.source === 'string'
            ? background.source
            : '#FFFFFF';

      return (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: bgColor as string },
          ]}
        />
      );
    };

    // 통계 요소 변환 핸들러 생성
    const createStatTransformHandler = (type: StatType) => (transform: ElementTransform) => {
      onStatTransformChange(type, transform);
    };

    return (
      <View style={styles.container}>
        <View ref={ref} style={styles.canvas} collapsable={false}>
          {/* 배경: Unity 또는 Fallback */}
          {useUnity ? (
            <>
              {/* Unity 뷰 (전체 화면 - 배경 + 캐릭터) */}
              <UnityView
                style={StyleSheet.absoluteFill}
                {...(onUnityReady && { onUnityReady })}
              />
              {/* 투명 제스처 레이어 (캐릭터 조작용) */}
              {(onCharacterPositionChange || onCharacterScaleChange) && (
                <GestureDetector gesture={combinedGesture}>
                  <Animated.View style={styles.gestureLayer} />
                </GestureDetector>
              )}
              {/* 디버그: 캐릭터 영역 표시 (빨간색 테두리) */}
              {(onCharacterPositionChange || onCharacterScaleChange) && (
                <View
                  style={{
                    position: 'absolute',
                    left:
                      (characterTransform?.x ?? 0.5) * PREVIEW_WIDTH -
                      (CHARACTER_WIDTH * (characterTransform?.scale ?? 1) * PREVIEW_WIDTH) / 2,
                    top:
                      (characterTransform?.y ?? 0.5) * PREVIEW_HEIGHT -
                      (CHARACTER_HEIGHT * (characterTransform?.scale ?? 1) * PREVIEW_HEIGHT) / 2,
                    width: CHARACTER_WIDTH * (characterTransform?.scale ?? 1) * PREVIEW_WIDTH,
                    height: CHARACTER_HEIGHT * (characterTransform?.scale ?? 1) * PREVIEW_HEIGHT,
                    borderWidth: 2,
                    borderColor: 'red',
                    backgroundColor: 'rgba(255, 0, 0, 0.1)',
                  }}
                  pointerEvents="none"
                />
              )}
            </>
          ) : (
            // Fallback: RN 배경 (Android 또는 Unity 미사용)
            renderFallbackBackground()
          )}

          {/* RN 오버레이 영역 */}
          <View style={styles.overlay} pointerEvents="box-none">
            {/* 개별 통계 요소들 */}
            {statElements.map((element) => {
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

            {/* 워터마크 */}
            <View style={styles.watermarkContainer}>
              <Text style={styles.watermark}>RunTaeho</Text>
            </View>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  canvas: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
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
});

export default SharePreviewCanvas;
