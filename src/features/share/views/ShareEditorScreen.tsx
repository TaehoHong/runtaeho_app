/**
 * ShareEditorScreen
 * 러닝 기록 공유 편집 화면
 *
 * Figma 프로토타입 351:6944 정확 반영
 * - 섹션 배경: #f9fafb
 * - 각 섹션은 흰색 카드로 래핑 (컴포넌트 내부에서 처리)
 */

import { router } from 'expo-router';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GREY, PRIMARY } from '~/shared/styles';
import { useUserStore } from '~/stores/user';
import type { ShareRunningData } from '../models/types';
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

interface ShareEditorScreenProps {
  runningData: ShareRunningData;
}

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
    handleUnityReady,
    characterTransform,
    updateCharacterPosition,
    updateCharacterScale,
  } = useShareEditor({ runningData });

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

  // 공유 처리
  const handleShare = async () => {
    const result = await shareResult();
    if (result.success) {
      // 공유 성공 시 이전 화면으로 자동 이동
      router.back();
    } else if (result.message) {
      // 취소가 아닌 경우에만 알림 (취소/실패 시 화면 유지)
      if (!result.message.includes('취소')) {
        Alert.alert('공유 실패', result.message);
      }
    }
  };

  // 닫기 처리 - 상태 초기화 후 화면 종료
  const handleClose = async () => {
    await resetAll();
    router.back();
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <GestureHandlerRootView style={styles.container}>
          {/* 헤더 */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={GREY[600]} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>기록 공유</Text>
            <TouchableOpacity onPress={resetAll} style={styles.resetButton}>
              <Text style={styles.resetButtonText}>초기화</Text>
            </TouchableOpacity>
          </View>

          {/* 로딩 상태 */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={GREY[600]} />
              <Text style={styles.loadingText}>캐릭터 준비 중...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* 미리보기 캔버스 (Unity 뷰 + RN 오버레이) */}
              <View style={styles.previewContainer}>
                <SharePreviewCanvas
                  ref={canvasRef}
                  statElements={statElements}
                  onStatTransformChange={updateStatTransform}
                  runningData={runningData}
                  onUnityReady={handleUnityReady}
                  onCharacterPositionChange={updateCharacterPosition}
                  onCharacterScaleChange={updateCharacterScale}
                  characterTransform={characterTransform}
                  avatarVisible={avatarVisible}
                />
              </View>

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
            </ScrollView>
          )}

          {/* 취소/공유 버튼 */}
          {!isLoading && (
            <ShareActions
              onShare={handleShare}
              onCancel={handleClose}
              isLoading={isCapturing}
            />
          )}
        </GestureHandlerRootView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GREY.WHITE,
  },
  safeArea: {
    flex: 1,
  },
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
    backgroundColor: '#f9fafb', // Figma 기준 섹션 배경색
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 16,
  },
  previewContainer: {
    marginBottom: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: '#f9fafb',
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
});

export default ShareEditorScreen;
