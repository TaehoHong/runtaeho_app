/**
 * ShareEditorScreen
 * 러닝 기록 공유 편집 화면
 *
 * Figma 프로토타입 351:6944 정확 반영
 * - 섹션 배경: #f9fafb
 * - 각 섹션은 흰색 카드로 래핑 (컴포넌트 내부에서 처리)
 */

import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  type ViewStyle,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GREY } from '~/shared/styles';
import { useUserStore } from '~/stores/user';
import type { ShareResult, ShareRunningData } from '../models/types';
import { useShareEntryTransitionStore } from '../stores/shareEntryTransitionStore';
import { useShareStore } from '../stores/shareStore';
import { generateDummyShareRunningData } from '../utils/dummyGpsData';
import { useShareEditor } from '../viewmodels/useShareEditor';
import { useShareExportSurface } from './hooks/useShareExportSurface';
import {
  BackgroundSelector,
  PoseSelector,
  ShareActions,
  SharePreviewCanvas,
  StatVisibilityToggle,
} from './components';

interface ShareEditorScreenProps {
  runningData: ShareRunningData;
}

const PREVIEW_CORNER_RADIUS = 16;
const EXPORT_CORNER_RADIUS = 0;

export const ShareEditorScreen: React.FC<ShareEditorScreenProps> = ({ runningData }) => {
  const endEntryTransition = useShareEntryTransitionStore((state) => state.endEntryTransition);
  const hasCompletedEntryTransitionRef = useRef(false);
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
  const {
    exportStageRef,
    isExportSurfaceVisible,
    syncPreviewViewport,
    syncPreviewViewportForScroll,
    handleExportStageLayout,
    prepareExportSurface,
    restorePreviewSurface,
  } = useShareExportSurface({
    previewRef: canvasRef,
    isLoading,
  });

  const currentUser = useUserStore((state) => state.currentUser);
  const setShareData = useShareStore((state) => state.setShareData);
  const isDummyDataUser = currentUser?.id === 1;

  const handleAddDummyData = useCallback(() => {
    const dummyShareData = generateDummyShareRunningData(runningData);
    setShareData(dummyShareData);
    Alert.alert('더미 데이터 추가됨', '6.52km / 38:20 / 여의도 한강공원 경로를 적용했습니다.');
  }, [runningData, setShareData]);

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

  const isShareBusy = isCapturing || isExportSurfaceVisible;

  // 공유 처리
  const handleShare = async () => {
    if (isShareBusy) {
      return;
    }

    let result: ShareResult = { success: false, message: '캡처 및 공유에 실패했습니다.' };

    try {
      const exportStageBounds = await prepareExportSurface();
      result = await shareResult(exportStageRef, exportStageBounds);
    } catch (error: any) {
      console.error('[ShareEditorScreen] Failed to prepare export surface:', error);
      result = {
        success: false,
        message: error?.message || '캡처 및 공유에 실패했습니다.',
      };
    } finally {
      await restorePreviewSurface();
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

  const handlePreviewScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    syncPreviewViewportForScroll(event.nativeEvent.contentOffset.y);
  }, [syncPreviewViewportForScroll]);

  const handleRootLayout = useCallback(() => {
    if (hasCompletedEntryTransitionRef.current) {
      return;
    }

    hasCompletedEntryTransitionRef.current = true;
    requestAnimationFrame(() => {
      endEntryTransition();
    });
  }, [endEntryTransition]);

  useEffect(() => () => {
    endEntryTransition();
  }, [endEntryTransition]);

  return (
    <SafeAreaProvider>
      <View
        style={styles.container}
        testID="share-editor-root"
        onLayout={handleRootLayout}
      >
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
                <View pointerEvents="none" style={styles.headerTitleContainer}>
                  <Text style={styles.headerTitle}>기록 공유</Text>
                </View>
                <View style={styles.headerActions}>
                  {isDummyDataUser && (
                    <TouchableOpacity
                      onPress={handleAddDummyData}
                      style={styles.dummyButton}
                      testID="share-editor-add-dummy-button"
                    >
                      <Text style={styles.dummyButtonText}>더미 추가</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
                    <Text style={styles.resetButtonText}>초기화</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>

            <View style={styles.scrollViewport}>
              <ScrollView
                testID="share-editor-scroll"
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                automaticallyAdjustContentInsets={false}
                automaticallyAdjustsScrollIndicatorInsets={false}
                contentInsetAdjustmentBehavior="never"
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
    backgroundColor: 'transparent',
  },
  editorShellHidden: {
    opacity: 0,
  },
  headerSafeArea: HEADER_SAFE_AREA_STYLE,
  header: {
    position: 'relative',
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
  headerTitleContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: GREY[900],
    fontFamily: 'Pretendard-SemiBold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  dummyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: GREY[100],
  },
  dummyButtonText: {
    fontSize: 14,
    color: GREY[700],
    fontFamily: 'Pretendard-Medium',
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
    backgroundColor: GREY.WHITE,
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
