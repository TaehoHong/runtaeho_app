import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppStore, RunningState } from '~/stores/app/appStore';
import { StatsView } from './stats-view';
import { PauseButton } from './components/pause-button';
import { StopButton } from './components/stop-button';
import { MainDistanceCard } from './components/main-distance-card';
import { useBottomActionOffset } from '~/shared/hooks';
import { useRunning } from '../contexts';

/**
 * 러닝 진행 중 화면
 * iOS RunningActiveView 대응
 */
export const RunningActiveView: React.FC = () => {
  const setRunningState = useAppStore((state) => state.setRunningState);
  const { pauseRunning, endRunning } = useRunning();
  const buttonBottom = useBottomActionOffset(42);

  const handlePauseRunning = () => {
    console.log('⏸️ [RunningActiveView] 러닝 일시정지 버튼 눌러짐');

    // RunningViewModel.pauseRunning() 호출 (GPS 추적 일시정지, 타이머 일시정지)
    pauseRunning();

    setRunningState(RunningState.Paused);
    console.log('✅ [RunningActiveView] 러닝 일시정지 완료');
  };

  const handleStopRunning = async () => {
    console.log('⏹️ [RunningActiveView] 러닝 종료 버튼 눌러짐');

    try {
      // RunningViewModel.endRunning() 호출 (GPS 추적 종료, 데이터 저장)
      await endRunning();

      setRunningState(RunningState.Finished);
      console.log('✅ [RunningActiveView] 러닝 종료 완료');
    } catch (error) {
      console.error('❌ [RunningActiveView] 러닝 종료 실패:', error);
      // 에러가 발생해도 UI 상태는 Finished로 전환
      setRunningState(RunningState.Finished);
    }
  };

  return (
    <View testID="running-active-container" style={styles.container}>
      {/* 러닝 통계 - BPM, 순간 페이스, 러닝 시간 */}
      <View testID="running-active-stats-section" style={styles.statsSection}>
        <StatsView paceType="instant" />
      </View>

      {/* 현재 누적 거리 - Figma 디자인 */}
      <MainDistanceCard />

      {/* 버튼들 - 일시정지, 정지 */}
      <View
        testID="running-active-button-container"
        style={[styles.buttonContainer, { bottom: buttonBottom }]}
      >
        <PauseButton onPress={handlePauseRunning} />
        <StopButton onPress={handleStopRunning} />
      </View>
    </View>
  );
};

// 역호환성을 위한 export
export const RunningActive = RunningActiveView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  statsSection: {
    marginBottom: 16,
  },
  buttonContainer: {
    position: 'absolute',
    left: 58,
    right: 58,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
