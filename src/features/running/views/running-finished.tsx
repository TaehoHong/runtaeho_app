import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useAppStore, RunningState } from '~/stores/app/appStore';
import { MainDistanceCard, DetailedStatisticsCard, ShoeSelectionArea, CompleteButton } from '~/shared/components';
import { UnityView } from '~/features/unity/components/UnityView';

const { width } = Dimensions.get('window');

/**
 * 러닝 완료 화면
 * iOS RunningFinishedView 대응
 * 결과 데이터와 저장 버튼 표시
 */
export const RunningFinishedView: React.FC = () => {
  const setRunningState = useAppStore((state) => state.setRunningState);

  // TODO: RunningFinishedViewModel 데이터 연결
  const hasShoe = true; // 임시 데이터

  const handleComplete = () => {
    console.log('🏁 [RunningFinishedView] 러닝 완료 확인 버튼 눌러짐');

    // TODO: RunningViewModel.saveRunningData() 호출
    // TODO: 러닝 데이터 서버에 저장
    // TODO: 포인트 지급

    // 러닝 종료 후 Stopped 상태로 복귀
    setRunningState(RunningState.Stopped);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Unity 배경 영역 - Figma 디자인의 상단 캐릭터 배경 */}
        <View style={styles.unityContainer}>
          <UnityView style={styles.unityView} />
        </View>

        {/* 상세 통계 카드 - BPM, 페이스, 러닝 시간 */}
        <DetailedStatisticsCard />

        {/* 메인 거리 카드 */}
        <MainDistanceCard />

        {/* 신발 선택 영역 */}
        {hasShoe && <ShoeSelectionArea />}

        {/* 완료 버튼 - iOS의 [저장] */}
        <CompleteButton onPress={handleComplete} />
      </ScrollView>
    </View>
  );
};

// 역호환성을 위한 export
export const RunningFinished = RunningFinishedView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    backgroundColor: '#FAFAFA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: 16,
  },
  unityContainer: {
    width: '100%',
    height: 375, // Figma 디자인의 상단 Unity 배경 높이
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
  },
  unityView: {
    width: '100%',
    height: '100%',
  },
});