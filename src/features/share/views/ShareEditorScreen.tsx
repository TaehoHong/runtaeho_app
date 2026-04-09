/**
 * ShareEditorScreen
 * 러닝 기록 공유 편집 화면
 *
 * Figma 프로토타입 351:6944 정확 반영
 * - 섹션 배경: #f9fafb
 * - 각 섹션은 흰색 카드로 래핑 (컴포넌트 내부에서 처리)
 */

import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  type ViewStyle,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GREY, PRIMARY } from '~/shared/styles';
import { useUnityStore } from '~/stores/unity/unityStore';
import { useUserStore } from '~/stores/user';
import type { ShareRunningData } from '../models/types';
import type { ViewBounds } from '../services/shareService';
import { useShareStore } from '../stores/shareStore';
import { generateDummyLocations } from '../utils/dummyGpsData';
import { useShareEditor } from '../viewmodels/useShareEditor';
import {
  BackgroundSelector,
  PoseSelector,
  ShareActions,
  SharePreviewCanvas,
  StatVisibilityToggle,
} from './components';
import { ANDROID_SHARE_DIAGNOSTIC_MODE } from '../constants/shareDiagnostics';

interface ShareEditorScreenProps {
  runningData: ShareRunningData;
}

const PREVIEW_CORNER_RADIUS = 16;
const EXPORT_CORNER_RADIUS = 0;
const VIEWPORT_MATCH_EPSILON = 2;
const UNITY_EXPORT_VIEWPORT_TIMEOUT_MS = 1200;

const waitForAnimationFrames = async (frameCount: number = 1): Promise<void> => {
  for (let frame = 0; frame < frameCount; frame += 1) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }
};

const doViewportFramesMatch = (expected: ViewBounds, actual: ViewBounds): boolean =>
  Math.abs(expected.x - actual.x) <= VIEWPORT_MATCH_EPSILON
  && Math.abs(expected.y - actual.y) <= VIEWPORT_MATCH_EPSILON
  && Math.abs(expected.width - actual.width) <= VIEWPORT_MATCH_EPSILON
  && Math.abs(expected.height - actual.height) <= VIEWPORT_MATCH_EPSILON;

export const ShareEditorScreen: React.FC<ShareEditorScreenProps> = ({ runningData }) => {
  const {
    canvasRef,
    selectedBackground,
    selectedPose,
    statElements,
    isLoading,
    isCapturing,
    avatarVisible,
    animationTime,
    setSelectedBackground,
    setSelectedPose,
    setAnimationTime,
    updateStatTransform,
    toggleStatVisibility,
    toggleAvatarVisibility,
    shareResult,
    resetAll,
    restoreRunningResultDefaults,
    characterTransform,
    updateCharacterPosition,
    updateCharacterScale,
  } = useShareEditor({ runningData });
  const setActiveViewport = useUnityStore((state) => state.setActiveViewport);
  const clearActiveViewport = useUnityStore((state) => state.clearActiveViewport);
  const exportStageRef = useRef<View>(null);
  const exportStageBoundsRef = useRef<ViewBounds | null>(null);
  const exportStageLayoutResolverRef = useRef<(() => void) | null>(null);
  const isExportSurfaceActiveRef = useRef(false);
  const [isExportSurfaceVisible, setIsExportSurfaceVisible] = useState(false);
  const shouldShowDiagnosticAnchors = Platform.OS === 'android'
    && ANDROID_SHARE_DIAGNOSTIC_MODE === 'crop-proof';

  // userId=1 전용 더미 데이터 기능
  const currentUser = useUserStore((state) => state.currentUser);
  const setDummyLocations = useShareStore((state) => state.setDummyLocations);
  const shareData = useShareStore((state) => state.shareData);
  const isTestUser = currentUser?.id === 1;
  const hasLocations = (shareData?.locations?.length ?? 0) > 0;

  const handleAddDummyData = useCallback(() => {
    const dummyLocations = generateDummyLocations();
    setDummyLocations(dummyLocations);
    Alert.alert('더미 데이터 추가됨', `${dummyLocations.length}개의 GPS 좌표가 추가되었습니다.`);
  }, [setDummyLocations]);

  const measureView = useCallback((
    targetRef: React.RefObject<View | null>,
    onMeasured?: (frame: ViewBounds) => void
  ) => {
    requestAnimationFrame(() => {
      const target = targetRef.current;
      if (!target || typeof target.measureInWindow !== 'function') {
        return;
      }

      target.measureInWindow((x, y, width, height) => {
        if (width <= 0 || height <= 0) {
          return;
        }

        onMeasured?.({ x, y, width, height });
      });
    });
  }, []);

  const syncViewport = useCallback((
    targetRef: React.RefObject<View | null>,
    borderRadius: number,
    onMeasured?: (frame: ViewBounds) => void
  ) => {
    measureView(targetRef, (frame) => {
      onMeasured?.(frame);
      setActiveViewport({
        owner: 'share',
        frame,
        borderRadius,
      });
    });
  }, [measureView, setActiveViewport]);

  const syncPreviewViewport = useCallback(() => {
    if (isExportSurfaceActiveRef.current) {
      return;
    }

    syncViewport(canvasRef, PREVIEW_CORNER_RADIUS);
  }, [canvasRef, syncViewport]);

  const syncExportStageViewport = useCallback(() => {
    syncViewport(exportStageRef, EXPORT_CORNER_RADIUS, (frame) => {
      exportStageBoundsRef.current = frame;
    });
  }, [syncViewport]);

  const handleExportStageLayout = useCallback(() => {
    syncExportStageViewport();
    exportStageLayoutResolverRef.current?.();
    exportStageLayoutResolverRef.current = null;
  }, [syncExportStageViewport]);

  const waitForExportViewportRender = useCallback(async () => {
    const expectedBounds = exportStageBoundsRef.current;
    if (!expectedBounds) {
      throw new Error('Export stage bounds are not ready');
    }

    const startedAt = Date.now();

    while (Date.now() - startedAt < UNITY_EXPORT_VIEWPORT_TIMEOUT_MS) {
      const renderedViewport = useUnityStore.getState().renderedViewport;
      if (
        renderedViewport?.owner === 'share'
        && doViewportFramesMatch(expectedBounds, renderedViewport.frame)
      ) {
        exportStageBoundsRef.current = renderedViewport.frame;
        return;
      }

      await waitForAnimationFrames(1);
    }

    const renderedViewport = useUnityStore.getState().renderedViewport;
    console.warn('[ShareEditorScreen] Unity export viewport did not settle before capture', {
      expectedBounds,
      renderedViewport,
    });
    throw new Error('Unity export viewport did not settle before capture');
  }, []);

  const closeEditor = useCallback(async (reason: 'close' | 'share-success') => {
    try {
      await restoreRunningResultDefaults();
      await resetAll({ syncUnity: false });
      router.back();
      return true;
    } catch (error) {
      console.warn(`[ShareEditorScreen] Failed to restore running result defaults on ${reason}:`, error);
      Alert.alert('복원 실패', '러닝 결과 화면 복원에 실패했습니다. 다시 시도해주세요.');
      return false;
    }
  }, [resetAll, restoreRunningResultDefaults]);

  const showExportSurface = useCallback(async () => {
    isExportSurfaceActiveRef.current = true;
    exportStageBoundsRef.current = null;

    const layoutReady = new Promise<void>((resolve) => {
      exportStageLayoutResolverRef.current = resolve;
    });

    setIsExportSurfaceVisible(true);
    await layoutReady;
    await waitForAnimationFrames(2);
    syncExportStageViewport();
    await waitForExportViewportRender();
  }, [syncExportStageViewport, waitForExportViewportRender]);

  const hideExportSurface = useCallback(async () => {
    exportStageLayoutResolverRef.current = null;
    setIsExportSurfaceVisible(false);
    isExportSurfaceActiveRef.current = false;
    await waitForAnimationFrames(2);
    syncPreviewViewport();
  }, [syncPreviewViewport]);

  const isShareBusy = isCapturing || isExportSurfaceVisible;

  // 공유 처리
  const handleShare = async () => {
    if (isShareBusy) {
      return;
    }

    let result = { success: false, message: '캡처 및 공유에 실패했습니다.' };

    try {
      await showExportSurface();
      result = await shareResult(
        exportStageRef,
        exportStageBoundsRef.current ?? undefined
      );
    } catch (error: any) {
      console.error('[ShareEditorScreen] Failed to prepare export surface:', error);
      result = {
        success: false,
        message: error?.message || '캡처 및 공유에 실패했습니다.',
      };
    } finally {
      await hideExportSurface();
    }

    if (result.success) {
      await closeEditor('share-success');
    } else if (result.message) {
      // 취소가 아닌 경우에만 알림 (취소/실패 시 화면 유지)
      if (!result.message.includes('취소')) {
        Alert.alert('공유 실패', result.message);
      }
    }
  };

  // 닫기 처리 - 상태 초기화 후 화면 종료
  const handleClose = async () => {
    await closeEditor('close');
  };

  const handleReset = () => {
    void resetAll();
  };

  useFocusEffect(
    useCallback(() => {
      syncPreviewViewport();

      return () => {
        clearActiveViewport('share');
      };
    }, [clearActiveViewport, syncPreviewViewport])
  );

  useEffect(() => {
    syncPreviewViewport();
  }, [isLoading, syncPreviewViewport]);

  const handlePreviewScroll = useCallback(() => {
    syncPreviewViewport();
  }, [syncPreviewViewport]);

  return (
    <SafeAreaProvider>
      <View style={styles.container} testID="share-editor-root">
        <GestureHandlerRootView style={styles.container}>
          <View
            pointerEvents={isExportSurfaceVisible ? 'none' : 'auto'}
            style={[styles.editorShell, isExportSurfaceVisible && styles.editorShellHidden]}
            testID="share-editor-shell"
          >
            <SafeAreaView
              edges={['top']}
              style={styles.headerSafeArea}
              testID="share-editor-header-safe-area"
            >
              {/* 헤더 */}
              <View style={styles.header}>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                  testID="share-editor-close-button"
                >
                  <Ionicons name="close" size={24} color={GREY[600]} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>기록 공유</Text>
                <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
                  <Text style={styles.resetButtonText}>초기화</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>

            <View style={styles.scrollViewport}>
              <ScrollView
                testID="share-editor-scroll"
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                onScroll={handlePreviewScroll}
                scrollEventThrottle={16}
              >
                {/* 미리보기 캔버스 (전역 Unity host + RN 오버레이) */}
                <View style={styles.previewContainer} onLayout={syncPreviewViewport}>
                  <SharePreviewCanvas
                    ref={canvasRef}
                    statElements={statElements}
                    onStatTransformChange={updateStatTransform}
                    runningData={runningData}
                    onCharacterPositionChange={updateCharacterPosition}
                    onCharacterScaleChange={updateCharacterScale}
                    characterTransform={characterTransform}
                    avatarVisible={avatarVisible}
                    cornerRadius={PREVIEW_CORNER_RADIUS}
                  />
                  {isLoading && (
                    <View style={styles.previewLoadingOverlay}>
                      <ActivityIndicator size="large" color={GREY[600]} />
                      <Text style={styles.loadingText}>캐릭터 준비 중...</Text>
                    </View>
                  )}
                </View>

                {!isLoading && (
                  <>
                    {/* 포즈 선택 - 카드 래핑 포함 + 타임라인 슬라이더 */}
                    <PoseSelector
                      selectedPose={selectedPose}
                      onSelect={setSelectedPose}
                      disabled={isCapturing}
                      sliderValue={animationTime}
                      onSliderChange={setAnimationTime}
                    />

                    {/* 기록 항목 표시/숨김 토글 - 카드 래핑 포함 */}
                    <StatVisibilityToggle
                      statElements={statElements}
                      onToggle={toggleStatVisibility}
                      avatarVisible={avatarVisible}
                      onAvatarToggle={toggleAvatarVisibility}
                    />

                    {/* 더미 GPS 데이터 추가 버튼 (userId=1 전용) */}
                    {isTestUser && !hasLocations && (
                      <View style={styles.dummyButtonContainer}>
                        <TouchableOpacity
                          style={styles.dummyButton}
                          onPress={handleAddDummyData}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="map-outline" size={18} color={GREY.WHITE} />
                          <Text style={styles.dummyButtonText}>더미 GPS 데이터 추가</Text>
                        </TouchableOpacity>
                        <Text style={styles.dummyButtonHint}>
                          * 지도 테스트용 (userId=1 전용)
                        </Text>
                      </View>
                    )}

                    {/* 배경 선택 - 카드 래핑 포함 */}
                    <BackgroundSelector
                      selectedBackground={selectedBackground}
                      onSelect={setSelectedBackground}
                    />
                  </>
                )}
              </ScrollView>
            </View>

            {/* 취소/공유 버튼 */}
            {!isLoading && (
              <SafeAreaView
                edges={['bottom']}
                style={styles.actionsSafeArea}
                testID="share-editor-actions-safe-area"
              >
                <ShareActions
                  onShare={handleShare}
                  onCancel={handleClose}
                  isLoading={isShareBusy}
                />
              </SafeAreaView>
            )}
          </View>
          {isExportSurfaceVisible && (
            <View
              pointerEvents="auto"
              style={styles.exportSurface}
              testID="share-export-surface"
            >
              <View style={styles.exportTopMask} testID="share-export-top-mask" />
              <View style={styles.exportCenterRow}>
                <View style={styles.exportSideMask} />
                <View
                  onLayout={handleExportStageLayout}
                  style={styles.exportStageContainer}
                  testID="share-export-stage-container"
                >
                  <SharePreviewCanvas
                    ref={exportStageRef}
                    statElements={statElements}
                    onStatTransformChange={updateStatTransform}
                    runningData={runningData}
                    onCharacterPositionChange={updateCharacterPosition}
                    onCharacterScaleChange={updateCharacterScale}
                    characterTransform={characterTransform}
                    avatarVisible={avatarVisible}
                    interactive={false}
                    containerPadding={false}
                    cornerRadius={EXPORT_CORNER_RADIUS}
                    diagnosticAnchors={shouldShowDiagnosticAnchors}
                  />
                </View>
                <View style={styles.exportSideMask} />
              </View>
              <View style={styles.exportBottomMask}>
                <View style={styles.exportLoadingContainer} testID="share-export-loader">
                  <ActivityIndicator size="small" color={GREY[600]} />
                  <Text style={styles.exportLoadingText}>이미지 준비 중...</Text>
                </View>
              </View>
            </View>
          )}
        </GestureHandlerRootView>
      </View>
    </SafeAreaProvider>
  );
};

const HEADER_SAFE_AREA_STYLE: ViewStyle = {
  backgroundColor: GREY.WHITE,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  editorShell: {
    flex: 1,
  },
  editorShellHidden: {
    display: 'none',
  },
  headerSafeArea: HEADER_SAFE_AREA_STYLE,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: GREY[100],
    backgroundColor: GREY.WHITE,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: GREY[900],
    fontFamily: 'Pretendard-SemiBold',
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resetButtonText: {
    fontSize: 14,
    color: GREY[500],
    fontFamily: 'Pretendard-Regular',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 16,
  },
  scrollViewport: {
    flex: 1,
  },
  actionsSafeArea: {
    backgroundColor: 'transparent',
  },
  previewContainer: {
    marginBottom: 14,
  },
  previewLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: 'rgba(249, 250, 251, 0.92)',
  },
  loadingText: {
    fontSize: 14,
    color: GREY[500],
    fontFamily: 'Pretendard-Regular',
  },
  dummyButtonContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  dummyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY[600],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  dummyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: GREY.WHITE,
    fontFamily: 'Pretendard-SemiBold',
  },
  dummyButtonHint: {
    fontSize: 11,
    color: GREY[400],
    fontFamily: 'Pretendard-Regular',
    marginTop: 4,
  },
  exportSurface: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  exportTopMask: {
    flex: 1,
    backgroundColor: GREY.WHITE,
  },
  exportCenterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exportStageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportSideMask: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: GREY.WHITE,
  },
  exportBottomMask: {
    flex: 1,
    backgroundColor: GREY.WHITE,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 20,
    paddingBottom: 24,
  },
  exportLoadingContainer: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: GREY[100],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportLoadingText: {
    fontSize: 13,
    color: GREY[600],
    fontFamily: 'Pretendard-Medium',
  },
});

export default ShareEditorScreen;
