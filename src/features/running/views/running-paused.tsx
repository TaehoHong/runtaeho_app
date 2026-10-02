import React from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import { useAppStore, RunningState } from '~/stores/app/appStore';
import { StatsView } from './stats-view';
import { MainDistanceCard } from './components/main-distance-card';
import { StopButton } from './components/stop-button';
import { PlayButton } from './components/play-button';
import { useBottomActionOffset } from '~/shared/hooks';
import { useRunning } from '../contexts';

/**
 * 러닝 일시정지 화면
 * iOS RunningPausedView 대응
 */
export const RunningPausedView: React.FC = () => {
  const setRunningState = useAppStore((state) => state.setRunningState);
  const { currentRecord, resumeRunning, endRunning } = useRunning();
  const buttonBottom = useBottomActionOffset(42);

  const handleStopRunning = async () => {
    console.log('⏹️ [RunningPausedView] 러닝 종료 버튼 눌러짐');

    try {
      // RunningViewModel.endRunning() 호출 (GPS 추적 종료, 데이터 저장)
      await endRunning();

      console.log('✅ [RunningPausedView] 러닝 종료 완료');
    } catch {
      console.error('❌ [RunningPausedView] 러닝 기록 저장 실패');
      Alert.alert('저장 실패', '러닝 기록을 저장하지 못했어요. 앱을 닫지 말고 종료 버튼을 눌러 다시 시도해주세요.');
    }
  };

  const handleResumeRunning = () => {
    console.log('▶️ [RunningPausedView] 러닝 재개 버튼 눌러짐');

    // RunningViewModel.resumeRunning() 호출 (GPS 추적 재개, 타이머 재개)
    resumeRunning();

    setRunningState(RunningState.Running);
    console.log('✅ [RunningPausedView] 러닝 재개 완료');
  };

  return (
    <View testID="running-paused-container" style={styles.container}>
      {/* 러닝 통계 (현재 진행 상황 표시) */}
      <View testID="running-paused-stats-section" style={styles.statsSection}>
        <StatsView />
      </View>

      {/* 현재 누적 거리 - Figma 디자인 */}
      <MainDistanceCard />

      {/* 제어 버튼들 - Figma: [재개(초록)] [종료(회색)] 순서 */}
      <View
        testID="running-paused-button-container"
        style={[styles.buttonContainer, { bottom: buttonBottom }]}
      >
        {currentRecord?.endTimestamp === undefined && <PlayButton onPress={handleResumeRunning} />}
        <StopButton onPress={handleStopRunning} />
      </View>
    </View>
  );
};

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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
