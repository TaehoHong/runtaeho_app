/**
 * useLeagueResultAnimation
 * 리그 결과 화면에서 Unity 캐릭터 애니메이션을 관리하는 훅
 *
 * ★ useUnityReadiness Hook 기반으로 리팩토링
 * - 기존: 로컬 useState + 개별 이벤트 구독 + 타임아웃 관리
 * - 변경: Store 기반 통합 상태 관리 + Hook의 타임아웃 기능 활용
 */

import { useCallback, useRef, useEffect } from 'react';
import type { Item } from '~/features/avatar';
import { unityService } from '~/features/unity/services/UnityService';
import { useUnityReadiness } from '~/features/unity/hooks';
import { useUnityStore } from '~/stores/unity/unityStore';
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
  handleUnityReady: (event: any) => void;
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

  // ★ 통합 Hook 사용
  // Store 액션
  const setAvatarReady = useUnityStore((state) => state.setAvatarReady);

  const { isReady, isUnityAvailable, handleUnityReady: baseHandleUnityReady } = useUnityReadiness({
    waitForAvatar: true, // ★ isGameObjectReady && isAvatarReady 모두 체크 (아바타 완성 후 표시)
    timeout: 3000, // 3초 타임아웃 (아바타 로딩 고려)
    startDelay: 0, // LeagueResult는 이미 앱이 실행 중이므로 지연 불필요
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

  /**
   * Unity 준비 완료 이벤트 핸들러
   * 기본 핸들러 + 아바타 로드 + 애니메이션 실행
   */
  const handleUnityReady = useCallback(
    (event: any) => {
      console.log('[LeagueResultAnimation] Unity View Ready:', event?.nativeEvent);

      // 이전 애니메이션 타이머 정리
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }

      // 기본 핸들러 호출
      baseHandleUnityReady(event);

      // 아바타 로드 및 애니메이션 실행
      const unsubscribe = unityService.onReady(async () => {
        console.log('[LeagueResultAnimation] GameObject Ready! Initializing...');

        try {
          // 1. 사용자 아바타 로드
          const items = Object.values(equippedItems).filter(
            (item): item is Item => !!item
          );

          if (items.length > 0) {
            await unityService.changeAvatar(items, hairColor);
            console.log(`[LeagueResultAnimation] Avatar loaded (${items.length} items)`);
            // ★ onAvatarReady 이벤트가 자동으로 setAvatarReady(true) 처리
          } else {
            // ★ 아이템이 없는 경우: changeAvatar() 호출 안 함 → onAvatarReady 이벤트 안 옴
            // 수동으로 isAvatarReady를 true로 설정
            console.log('[LeagueResultAnimation] 장착 아이템 없음 - 수동으로 ready 처리');
            setAvatarReady(true);
          }

          // 2. 결과에 맞는 애니메이션 실행 (약간의 딜레이 후)
          animationTimeoutRef.current = setTimeout(async () => {
            await playResultAnimation();
          }, 500);
        } catch (error) {
          console.error('[LeagueResultAnimation] Initialization failed:', error);
          // ★ 에러 시 강제로 ready 처리 (UX 유지)
          setAvatarReady(true);
        }
      });

      return unsubscribe;
    },
    [equippedItems, hairColor, playResultAnimation, baseHandleUnityReady, setAvatarReady]
  );

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
