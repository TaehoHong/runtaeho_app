import React from 'react';
import { Alert, View, StyleSheet } from 'react-native';
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

      console.log('✅ [RunningActiveView] 러닝 종료 완료');
    } catch {
      console.error('❌ [RunningActiveView] 러닝 기록 저장 실패');
      Alert.alert('저장 실패', '러닝 기록을 저장하지 못했어요. 앱을 닫지 말고 종료 버튼을 눌러 다시 시도해주세요.');
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
