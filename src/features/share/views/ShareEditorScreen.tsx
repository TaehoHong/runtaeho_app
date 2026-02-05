/**
 * ShareEditorScreen
 * 러닝 기록 공유 편집 화면
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import type { ShareRunningData } from '../models/types';
import { useShareEditor } from '../viewmodels/useShareEditor';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  SharePreviewCanvas,
  BackgroundSelector,
  PoseSelector,
  ShareActions,
  StatVisibilityToggle,
} from './components';
import { GREY } from '~/shared/styles';

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
    setSelectedBackground,
    setSelectedPose,
    updateStatTransform,
    toggleStatVisibility,
    shareResult,
    saveToGallery,
    resetAll,
    handleUnityReady,
    characterTransform,
    updateCharacterPosition,
    updateCharacterScale,
  } = useShareEditor({ runningData });

  // 공유 처리
  const handleShare = async () => {
    const result = await shareResult();
    if (result.success) {
      Alert.alert('공유 완료', '러닝 기록이 공유되었습니다!');
    } else if (result.message) {
      // 취소가 아닌 경우에만 알림
      if (!result.message.includes('취소')) {
        Alert.alert('공유 실패', result.message);
      }
    }
  };

  // 저장 처리
  const handleSave = async () => {
    const success = await saveToGallery();
    if (success) {
      Alert.alert('저장 완료', '이미지가 갤러리에 저장되었습니다!');
    } else {
      Alert.alert('저장 실패', '이미지 저장에 실패했습니다.');
    }
  };

  // 닫기 처리
  const handleClose = () => {
    router.back();
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider style={styles.safeArea}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
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
            <SharePreviewCanvas
              ref={canvasRef}
              background={selectedBackground}
              statElements={statElements}
              onStatTransformChange={updateStatTransform}
              runningData={runningData}
              onUnityReady={handleUnityReady}
              onCharacterPositionChange={updateCharacterPosition}
              onCharacterScaleChange={updateCharacterScale}
              characterTransform={characterTransform}
            />

            {/* 기록 항목 표시/숨김 토글 */}
            <StatVisibilityToggle
              statElements={statElements}
              onToggle={toggleStatVisibility}
            />

            {/* 배경 선택 */}
            <BackgroundSelector
              selectedBackground={selectedBackground}
              onSelect={setSelectedBackground}
            />

            {/* 포즈 선택 */}
            <PoseSelector
              selectedPose={selectedPose}
              onSelect={setSelectedPose}
              disabled={isCapturing}
            />
          </ScrollView>
        )}

        {/* 공유/저장 버튼 */}
        {!isLoading && (
          <ShareActions
            onShare={handleShare}
            onSave={handleSave}
            isLoading={isCapturing}
          />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: GREY[600],
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
  },
  scrollContent: {
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: GREY[500],
    fontFamily: 'Pretendard-Regular',
  },
});

export default ShareEditorScreen;
