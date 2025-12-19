import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useAppStore, RunningState } from '~/stores/app/appStore';
import { StatsView } from './stats-view';
import { MainDistanceCard } from './components/main-distance-card';
import { StopButton } from './components/stop-button';
import { PlayButton } from './components/play-button';
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

      {/* 현재 누적 거리 - Figma 디자인 */}
      <MainDistanceCard />

      {/* 제어 버튼들 - Figma: [재개(초록)] [종료(회색)] 순서 */}
      <View style={styles.buttonContainer}>
        <PlayButton onPress={handleResumeRunning} />
        <StopButton onPress={handleStopRunning} />
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
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 43, // Figma: 812-(704+65)=43px
    gap: 16, // Figma: 480-464=16px
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 42, // Figma: 58px - container padding 16px = 42px
    marginTop: 96, // Figma: 704-592=112px (gap 16 포함하여 96)
  },
});