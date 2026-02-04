/**
 * SharePreviewCanvas Component
 * 캡처 대상 미리보기 캔버스
 *
 * Unity 뷰를 전체 화면으로 표시하고
 * RN 오버레이로 기록 항목을 표시
 */

import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, View, Text, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
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
const PREVIEW_WIDTH = SCREEN_WIDTH - 32;
const PREVIEW_HEIGHT = PREVIEW_WIDTH * (16 / 9); // 9:16 비율

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
    },
    ref
  ) => {
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
            // Unity 뷰 (전체 화면 - 배경 + 캐릭터)
            <UnityView
              style={StyleSheet.absoluteFill}
              {...(onUnityReady && { onUnityReady })}
            />
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
