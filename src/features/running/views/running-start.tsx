import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useDispatch } from 'react-redux';
import { setRunningState, RunningState } from '~/store/slices/appSlice';
import { StartButton } from '~/shared/components';

/**
 * 러닝 시작 화면
 * iOS RunningStartView 대응
 */
export const RunningStartView: React.FC = () => {
  const dispatch = useDispatch();

  const handleStartRunning = () => {
    console.log('🏃 [RunningStartView] 러닝 시작 버튼 눌러짐');

    // TODO: RunningViewModel.startRunning() 호출
    // TODO: 위치 권한 확인
    // TODO: GPS 추적 시작

    // 러닝 상태로 전환
    dispatch(setRunningState(RunningState.Running));
  };

  return (
    <View style={styles.container}>
      <StartButton onPress={handleStartRunning} />
    </View>
  );
};

// 역호환성을 위한 export
export const RunningStart = RunningStartView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
});