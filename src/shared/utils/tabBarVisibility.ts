import { RunningState, ViewState } from '~/stores/app/appStore';

/**
 * 러닝 상태와 뷰 상태 기반 탭바 표시 여부
 * 정책: 러닝이 완전히 멈춘 상태 + 로딩 완료일 때만 표시
 */
export const isTabBarVisible = (
  runningState: RunningState,
  viewState: ViewState
): boolean => {
  return runningState === RunningState.Stopped && viewState === ViewState.Loaded;
};
