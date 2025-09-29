import React from 'react';
import { RunningView } from '~/features/running/views/RunningView';

/**
 * 러닝 화면
 * iOS RunningView 대응
 * 상태에 따라 Unity 컴포넌트와 컴트롤 패널 표시
 */
export default function RunningScreen() {
  console.log('🏃 [RUNNING_SCREEN] 러닝 화면 렌더링');

  return <RunningView />;
}