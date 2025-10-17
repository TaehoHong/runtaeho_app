import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppStore, RunningState } from '~/stores/app/appStore';
import { StartButton } from '~/shared/components';
import { useRunning } from '../contexts';

/**
 * 러닝 시작 화면
 */
export const RunningStartView: React.FC = () => {
  const setRunningState = useAppStore((state) => state.setRunningState);
  const { startRunning } = useRunning();

  const handleStartRunning = async () => {
    console.log('🏃 [RunningStartView] 러닝 시작 버튼 눌러짐');

    try {
      // RunningViewModel.startRunning() 호출 (GPS 추적, 타이머 시작)
      await startRunning();

      // 러닝 상태로 전환
      setRunningState(RunningState.Running);
      console.log('✅ [RunningStartView] 러닝 시작 완료');
    } catch (error) {
      console.error('❌ [RunningStartView] 러닝 시작 실패:', error);
      // 에러가 발생해도 UI 상태는 Running으로 전환 (ViewModel에서 더미 데이터 생성)
      setRunningState(RunningState.Running);
    }
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