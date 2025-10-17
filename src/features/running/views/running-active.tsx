import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useAppStore, RunningState } from '~/stores/app/appStore';
import { StatsView, PauseButton, StopButton, MainDistanceCard } from '~/shared/components';
import { useRunning } from '../contexts';

const { width, height } = Dimensions.get('window');

/**
 * 러닝 진행 중 화면
 * iOS RunningActiveView 대응
 */
export const RunningActiveView: React.FC = () => {
  const setRunningState = useAppStore((state) => state.setRunningState);
  const { pauseRunning, endRunning } = useRunning();

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
    <View style={styles.container}>
      {/* 러닝 통계 - BPM, 페이스, 러닝 시간 */}
      <View style={{ marginBottom: 16 }}>
        <StatsView />
      </View>

      {/* 현재 누적 거리 - Figma 디자인 */}
      <MainDistanceCard />

      {/* 버튼들 - 일시정지, 정지 */}
      <View style={styles.buttonContainer}>
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
    width: width,
    height: height * 0.5,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 29,
    marginTop: 42,
  },
});