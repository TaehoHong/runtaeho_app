import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useDispatch } from 'react-redux';
import { setRunningState, RunningState } from '~/store/slices/appSlice';
import { StatsView, PauseButton, StopButton } from '~/shared/components';

const { width, height } = Dimensions.get('window');

/**
 * 러닝 진행 중 화면
 * iOS RunningActiveView 대응
 */
export const RunningActiveView: React.FC = () => {
  const dispatch = useDispatch();

  const handlePauseRunning = () => {
    console.log('⏸️ [RunningActiveView] 러닝 일시정지 버튼 눌러짐');

    // TODO: RunningViewModel.pauseRunning() 호출
    // TODO: GPS 추적 일시정지

    dispatch(setRunningState(RunningState.Paused));
  };

  const handleStopRunning = () => {
    console.log('⏹️ [RunningActiveView] 러닝 종료 버튼 눌러짐');

    // TODO: RunningViewModel.stopRunning() 호출
    // TODO: GPS 추적 종료 및 데이터 저장

    dispatch(setRunningState(RunningState.Finished));
  };

  return (
    <View style={styles.container}>
      {/* 러닝 통계 - iOS의 거리/시간 표시 */}
      <StatsView />

      {/* 버튼들 - iOS의 [일시정지], [종료] */}
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
    justifyContent: 'center',
    alignItems: 'center',
    gap: 25,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
});