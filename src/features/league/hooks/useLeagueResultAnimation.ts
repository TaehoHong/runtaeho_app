/**
 * useLeagueResultAnimation
 * 리그 결과 화면에서 Unity 캐릭터 애니메이션을 관리하는 훅
 *
 * Push + Pull 패턴으로 Race Condition 없이 안정적으로 Unity 통신
 */

import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import type { Item } from '~/features/avatar';
import { unityService } from '~/features/unity/services/UnityService';
import { useUserStore } from '~/stores/user/userStore';
import { LeagueResultStatus } from '../models';
import type { CharacterMotion } from '~/features/unity/types/UnityTypes';

/**
 * 리그 결과 상태를 CharacterMotion으로 매핑
 * 현재 Unity는 IDLE, MOVE, ATTACK, DAMAGED만 지원
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
  const [isUnityReady, setIsUnityReady] = useState(false);
  const equippedItems = useUserStore((state) => state.equippedItems);
  const hairColor = useUserStore((state) => state.hairColor);

  // Unity는 iOS에서만 지원
  const isUnityAvailable = Platform.OS === 'ios';

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
   * Push + Pull 패턴으로 Race Condition 방지
   * + Timeout fallback: Unity 재사용 시 onCharactorReady가 다시 발생하지 않는 경우 처리
   */
  const handleUnityReady = useCallback(
    (event: any) => {
      console.log('[LeagueResultAnimation] Unity View Ready:', event?.nativeEvent);

      // Timeout fallback: 2초 후에도 ready 아니면 강제로 true 설정
      // Unity가 재사용될 때 onCharactorReady 이벤트가 다시 발생하지 않는 경우를 처리
      const timeoutId = setTimeout(() => {
        console.log('[LeagueResultAnimation] ⏰ Timeout - forcing ready state');
        setIsUnityReady(true);
        playResultAnimation();
      }, 2000);

      const unsubscribe = unityService.onReady(async () => {
        clearTimeout(timeoutId); // 정상 콜백 시 timeout 취소
        console.log('[LeagueResultAnimation] GameObject Ready! Initializing...');

        try {
          // 1. 사용자 아바타 로드
          const items = Object.values(equippedItems).filter(
            (item): item is Item => !!item
          );

          if (items.length > 0) {
            await unityService.changeAvatar(items, hairColor);
            console.log(`[LeagueResultAnimation] Avatar loaded (${items.length} items)`);
          }

          // 2. 결과에 맞는 애니메이션 실행 (약간의 딜레이 후)
          setTimeout(async () => {
            await playResultAnimation();
          }, 500);

          setIsUnityReady(true);
        } catch (error) {
          console.error('[LeagueResultAnimation] Initialization failed:', error);
          setIsUnityReady(true); // 에러가 발생해도 계속 진행
        }
      });

      return () => {
        clearTimeout(timeoutId);
        unsubscribe();
      };
    },
    [equippedItems, hairColor, playResultAnimation]
  );

  return {
    isUnityReady,
    isUnityAvailable,
    handleUnityReady,
  };
};
