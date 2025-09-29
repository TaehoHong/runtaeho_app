import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useDispatch } from 'react-redux';
import { setRunningState, RunningState } from '~/store/slices/appSlice';
import { StatsView, StopButton, PlayButton } from '~/shared/components';

const { width, height } = Dimensions.get('window');

/**
 * 러닝 일시정지 화면
 * iOS RunningPausedView 대응
 */
export const RunningPausedView: React.FC = () => {
  const dispatch = useDispatch();

  const handleStopRunning = () => {
    console.log('⏹️ [RunningPausedView] 러닝 종료 버튼 눌러짐');

    // TODO: RunningViewModel.stopRunning() 호출
    // TODO: GPS 추적 종료 및 데이터 저장

    dispatch(setRunningState(RunningState.Finished));
  };

  const handleResumeRunning = () => {
    console.log('▶️ [RunningPausedView] 러닝 재개 버튼 눌러짐');

    // TODO: RunningViewModel.resumeRunning() 호출
    // TODO: GPS 추적 재개

    dispatch(setRunningState(RunningState.Running));
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