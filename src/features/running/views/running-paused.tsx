import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useAppStore, RunningState } from '~/stores/app/appStore';
import { StatsView, StopButton, PlayButton } from '~/shared/components';
import { useRunning } from '../contexts';

const { width, height } = Dimensions.get('window');

/**
 * 러닝 일시정지 화면
 * iOS RunningPausedView 대응
 */
export const RunningPausedView: React.FC = () => {
  const setRunningState = useAppStore((state) => state.setRunningState);
  const { resumeRunning, endRunning } = useRunning();

  const handleStopRunning = async () => {
    console.log('⏹️ [RunningPausedView] 러닝 종료 버튼 눌러짐');

    try {
      // RunningViewModel.endRunning() 호출 (GPS 추적 종료, 데이터 저장)
      await endRunning();

      setRunningState(RunningState.Finished);
      console.log('✅ [RunningPausedView] 러닝 종료 완료');
    } catch (error) {
      console.error('❌ [RunningPausedView] 러닝 종료 실패:', error);
      // 에러가 발생해도 UI 상태는 Finished로 전환
      setRunningState(RunningState.Finished);
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
    <View style={styles.container}>
      {/* 러닝 통계 (현재 진행 상황 표시) */}
      <StatsView />

      {/* 제어 버튼들 - iOS의 [종료], [재개] */}
      <View style={styles.buttonContainer}>
        <StopButton onPress={handleStopRunning} />
        <PlayButton onPress={handleResumeRunning} />
      </View>
    </View>
  );
};

// 역호환성을 위한 export
export const RunningPaused = RunningPausedView;

const styles = StyleSheet.create({
  container: {
    width: width,
    height: height * 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 25,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
});