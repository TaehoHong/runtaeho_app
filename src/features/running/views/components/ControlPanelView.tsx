import React from 'react';
import { RunningState, useAppStore } from '../../../../stores/app/appStore';
import { RunningActiveView } from '../running-active';
import { RunningFinishedView } from '../running-finished';
import { RunningPausedView } from '../running-paused';
import { RunningStartView } from '../running-start';

/**
 * 러닝 컨트롤 패널
 * 러닝 상태에 따라 다른 UI 표시
 * RunningProvider는 RunningView에서 제공됨
 */
export const ControlPanelView: React.FC = () => {
  const runningState = useAppStore((state) => state.runningState);

  console.log('🎮 [ControlPanelView] 렌더링, runningState:', runningState);

  // iOS와 동일한 switch 문 로직
  switch (runningState) {
    case RunningState.Stopped:
      console.log('⏹️ [ControlPanelView] Stopped 상태 - RunningStartView 표시');
      return <RunningStartView />;

    case RunningState.Running:
      console.log('▶️ [ControlPanelView] Running 상태 - RunningActiveView 표시');
      return <RunningActiveView />;

    case RunningState.Paused:
      console.log('⏸️ [ControlPanelView] Paused 상태 - RunningPausedView 표시');
      return <RunningPausedView />;

    case RunningState.Finished:
      console.log('🏁 [ControlPanelView] Finished 상태 - RunningFinishedView 표시');
      return <RunningFinishedView />;

    default:
      console.log('⚠️ [ControlPanelView] 알 수 없는 상태 - RunningStartView 표시');
      return <RunningStartView />;
  }
};
