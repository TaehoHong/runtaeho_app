/**
 * useUnityCharacterControl Hook
 *
 * Unity 캐릭터 속도 제어를 담당하는 hook
 * iOS UnityService 연동
 *
 * 책임:
 * - 러닝 상태에 따른 캐릭터 속도 제어
 * - Unity Ready 상태 처리
 */

import { useEffect } from 'react';
import { unityService } from '../../../unity/services/UnityService';
import { RunningState } from '~/stores/app/appStore';
import type { UseUnityCharacterControlProps, UseUnityCharacterControlReturn } from './types';

export const useUnityCharacterControl = ({
  isUnityReady,
  runningState,
  speed,
}: UseUnityCharacterControlProps): UseUnityCharacterControlReturn => {
  /**
   * 러닝 상태에 따라 Unity 캐릭터 속도 제어
   */
  useEffect(() => {
    console.log('[useUnityCharacterControl] isUnityReady:', isUnityReady);

    if (!isUnityReady) return;
    if (runningState === RunningState.Running) {
      void unityService.setCharacterSpeed(speed);
      return;
    }

    void unityService.stopCharacter();
  }, [isUnityReady, runningState, speed]);

  // 이 hook은 순수하게 reactive하며, 외부로 노출하는 action이 없음
  return {};
};
