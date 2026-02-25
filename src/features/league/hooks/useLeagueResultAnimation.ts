/**
 * useLeagueResultAnimation
 * 리그 결과 화면에서 Unity 캐릭터 애니메이션을 관리하는 훅
 *
 * ★ useUnityBootstrap Hook 기반으로 리팩토링
 * - 초기 Ready + 첫 avatar sync는 공통 bootstrap에서 처리
 * - 이 훅은 결과 애니메이션 재생에 집중
 */

import { useCallback, useRef, useEffect } from 'react';
import type { Item } from '~/features/avatar';
import type { UnityReadyEvent } from '~/features/unity/bridge/UnityBridge';
import { unityService } from '~/features/unity/services/UnityService';
import { useUnityBootstrap } from '~/features/unity/hooks';
import { useUserStore } from '~/stores/user/userStore';
import { LeagueResultStatus } from '../models';
import type { CharacterMotion } from '~/features/unity/types/UnityTypes';

/**
 * 리그 결과 상태를 CharacterMotion으로 매핑
 */
const getMotionForResult = (status: LeagueResultStatus): CharacterMotion => {
  switch (status) {
    case LeagueResultStatus.PROMOTED:
      // 승급: ATTACK을 축하 액션으로 활용
      return 'ATTACK';
    case LeagueResultStatus.MAINTAINED:
      // 유지: 기본 상태
      return 'IDLE';
    case LeagueResultStatus.RELEGATED:
      // 강등: DAMAGED를 아쉬움 표현으로 활용
      return 'DAMAGED';
    case LeagueResultStatus.REBIRTH:
      // 재시작: MOVE를 새로운 시작으로 활용
      return 'MOVE';
    default:
      return 'IDLE';
  }
};

interface UseLeagueResultAnimationProps {
  resultStatus: LeagueResultStatus;
}

interface UseLeagueResultAnimationReturn {
  isUnityReady: boolean;
  isUnityAvailable: boolean;
  handleUnityReady: (event: UnityReadyEvent) => void;
}

/**
 * 리그 결과 애니메이션 훅
 * Unity 캐릭터의 아바타 로드 및 결과에 맞는 애니메이션 실행
 */
export const useLeagueResultAnimation = ({
  resultStatus,
}: UseLeagueResultAnimationProps): UseLeagueResultAnimationReturn => {
  const equippedItems = useUserStore((state) => state.equippedItems);
  const hairColor = useUserStore((state) => state.hairColor);

  // 애니메이션 딜레이 타이머
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getInitialAvatarPayload = useCallback(() => {
    const items = Object.values(equippedItems).filter(
      (item): item is Item => !!item
    );
    return {
      items,
      hairColor,
    };
  }, [equippedItems, hairColor]);

  const {
    isReady,
    isUnityAvailable,
    handleUnityReady,
    isInitialAvatarSynced,
  } = useUnityBootstrap({
    waitForAvatar: true, // ★ isGameObjectReady && isAvatarReady 모두 체크 (아바타 완성 후 표시)
    timeout: 3000, // 3초 타임아웃 (아바타 로딩 고려)
    startDelay: 0, // LeagueResult는 이미 앱이 실행 중이므로 지연 불필요
    getInitialAvatarPayload,
  });

  /**
   * 결과에 맞는 애니메이션 실행
   */
  const playResultAnimation = useCallback(async () => {
    if (!isUnityAvailable) return;

    try {
      const motion = getMotionForResult(resultStatus);
      await unityService.setCharacterMotion(motion);
      console.log(`[LeagueResultAnimation] Playing motion: ${motion} for status: ${resultStatus}`);
    } catch (error) {
      console.error('[LeagueResultAnimation] Failed to play animation:', error);
    }
  }, [resultStatus, isUnityAvailable]);

  useEffect(() => {
    if (!isInitialAvatarSynced || !isUnityAvailable) {
      return;
    }

    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    animationTimeoutRef.current = setTimeout(() => {
      void playResultAnimation();
    }, 500);
  }, [isInitialAvatarSynced, isUnityAvailable, playResultAnimation]);

  /**
   * 컴포넌트 언마운트 시 타이머 정리
   */
  useEffect(() => {
    return () => {
      console.log('[LeagueResultAnimation] Cleanup on unmount');
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    isUnityReady: isReady,
    isUnityAvailable,
    handleUnityReady,
  };
};
