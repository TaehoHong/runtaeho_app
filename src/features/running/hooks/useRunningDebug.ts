import { AppState } from 'react-native';
import { useRunning } from '../contexts/RunningContext';

/**
 * 러닝 디버깅 전용 훅
 * 비즈니스 로직과 분리하여 디버깅 데이터만 수집 및 포맷
 *
 * RunningContext를 통해 실제 러닝 세션 데이터를 가져옴
 *
 * Note: 센서 데이터 소스 정보는 console.log를 통해 확인 가능
 * (RunningViewModel의 startRunning 메서드 참조)
 */
export const useRunningDebug = () => {
  const viewModel = useRunning();

  return {
    // ViewModel 데이터 (읽기 전용)
    runningState: viewModel.runningState,
    trackingData: viewModel.trackingData,
    locations: viewModel.locations,
    stats: viewModel.stats,
    elapsedTime: viewModel.elapsedTime,
    distance: viewModel.distance,
    useBackgroundMode: viewModel.useBackgroundMode,
    currentSegmentItems: viewModel.currentSegmentItems,
    isStarting: viewModel.isStarting,
    isEnding: viewModel.isEnding,

    // 디버그용 계산 필드
    appState: AppState.currentState,
    gpsConnectionStatus: viewModel.trackingData?.isTracking ? 'connected' : 'disconnected',
    segmentCount: viewModel.currentSegmentItems.length,

    // 센서 소스 정보는 런타임에 추적하지 않음 (콘솔 로그 참조)
    // 필요시 dataSourcePriorityService에 getCurrentSource() 메서드 추가 고려
  };
};
