/**
 * 최적화된 콜백 관리 Hook
 * 함수들을 메모이제이션하여 불필요한 리렌더링을 방지
 */

import { useCallback, useMemo } from 'react';
import { CharacterMotion } from '../../types/UnityTypes';

// ==========================================
// 캐릭터 제어 콜백 최적화
// ==========================================

export interface CharacterControlCallbacks {
  handleSetSpeed: (speed: number) => Promise<void>;
  handleStopCharacter: () => Promise<void>;
  handleSetMotion: (motion: CharacterMotion) => Promise<void>;
}

export const useOptimizedCharacterCallbacks = (
  onSetSpeed: (speed: number) => Promise<void>,
  onStopCharacter: () => Promise<void>,
  onSetMotion: (motion: CharacterMotion) => Promise<void>,
  isLoading: boolean
): CharacterControlCallbacks => {
  const handleSetSpeed = useCallback(
    async (speed: number) => {
      if (!isLoading) {
        await onSetSpeed(speed);
      }
    },
    [onSetSpeed, isLoading]
  );

  const handleStopCharacter = useCallback(async () => {
    if (!isLoading) {
      await onStopCharacter();
    }
  }, [onStopCharacter, isLoading]);

  const handleSetMotion = useCallback(
    async (motion: CharacterMotion) => {
      if (!isLoading) {
        await onSetMotion(motion);
      }
    },
    [onSetMotion, isLoading]
  );

  return useMemo(
    () => ({
      handleSetSpeed,
      handleStopCharacter,
      handleSetMotion,
    }),
    [handleSetSpeed, handleStopCharacter, handleSetMotion]
  );
};

// ==========================================
// 스타일 최적화
// ==========================================

export const useOptimizedStyles = <T extends Record<string, any>>(
  styleFactory: () => T,
  dependencies: readonly unknown[]
): T => {
  return useMemo(styleFactory, dependencies);
};

// ==========================================
// 조건부 렌더링 최적화
// ==========================================

export const useOptimizedConditionalRender = <T>(
  condition: boolean,
  renderFn: () => T,
  dependencies: readonly unknown[]
): T | null => {
  return useMemo(() => {
    return condition ? renderFn() : null;
  }, [condition, ...dependencies]);
};