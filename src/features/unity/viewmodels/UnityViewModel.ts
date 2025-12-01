/**
 * Unity ViewModel
 * Phase 2: Zustand의 비동기 로직을 ViewModel로 이동
 * UnityBridgeService를 직접 호출하고, 결과를 UnityStore에 동기화
 */

import { useCallback } from 'react';
import { useUnityStore } from '../../../stores/unity/unityStore';
import { unityService } from '../services/UnityService';
import type { CharacterMotion } from '../types/UnityTypes';
import type { Item } from '~/features/avatar';

/**
 * Unity ViewModel Hook
 * 비동기 Unity 작업을 관리하고 결과를 Store에 반영
 */
export const useUnityViewModel = () => {
  // Zustand Store (상태만 관리)
  const isConnected = useUnityStore((state) => state.isConnected);
  const isLoading = useUnityStore((state) => state.isLoading);
  const error = useUnityStore((state) => state.error);
  const characterState = useUnityStore((state) => state.characterState);
  const unityStatus = useUnityStore((state) => state.unityStatus);
  const isUnityViewVisible = useUnityStore((state) => state.isUnityViewVisible);

  // Zustand Actions
  const setLoading = useUnityStore((state) => state.setLoading);
  const setError = useUnityStore((state) => state.setError);
  const clearError = useUnityStore((state) => state.clearError);
  const updateCharacterState = useUnityStore((state) => state.updateCharacterState);
  const setUnityViewVisible = useUnityStore((state) => state.setUnityViewVisible);

  /**
   * 캐릭터 속도 설정
   * 기존 unityStore.setCharacterSpeed
   */
  const setCharacterSpeed = useCallback(async (speed: number) => {
    setLoading(true);
    setError(null);

    try {
      await unityService.setCharacterSpeed(speed);

      const timestamp = new Date().toISOString();
      if (characterState) {
        updateCharacterState({
          ...characterState,
          speed,
          timestamp,
        });
      }

      setLoading(false);
    } catch (error) {
      setLoading(false);
      setError({
        type: 'SET_SPEED_ERROR',
        message: 'Failed to set character speed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }, [characterState, setLoading, setError, updateCharacterState]);

  /**
   * 캐릭터 정지
   * 기존 unityStore.stopCharacter
   */
  const stopCharacter = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await unityService.stopCharacter();

      const timestamp = new Date().toISOString();
      if (characterState) {
        updateCharacterState({
          ...characterState,
          speed: 0,
          isMoving: false,
          motion: 'IDLE' as CharacterMotion,
          timestamp,
        });
      }

      setLoading(false);
    } catch (error) {
      setLoading(false);
      setError({
        type: 'STOP_CHARACTER_ERROR',
        message: 'Failed to stop character',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }, [characterState, setLoading, setError, updateCharacterState]);

  /**
   * 캐릭터 모션 설정
   * 기존 unityStore.setCharacterMotion
   */
  const setCharacterMotion = useCallback(async (motion: CharacterMotion) => {
    setLoading(true);
    setError(null);

    try {
      await unityService.setCharacterMotion(motion);

      const timestamp = new Date().toISOString();
      if (characterState) {
        updateCharacterState({
          ...characterState,
          motion,
          isMoving: motion === 'MOVE',
          timestamp,
        });
      }

      setLoading(false);
    } catch (error) {
      setLoading(false);
      setError({
        type: 'SET_MOTION_ERROR',
        message: 'Failed to set character motion',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }, [characterState, setLoading, setError, updateCharacterState]);

  /**
   * 아바타 변경
   * 기존 unityStore.changeAvatar
   */
  const changeAvatar = useCallback(async (items: Item[]) => {
    setLoading(true);
    setError(null);

    try {
      await unityService.changeAvatar(items);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      setError({
        type: 'CHANGE_AVATAR_ERROR',
        message: 'Failed to change avatar',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }, [setLoading, setError]);

  return {
    // State (read-only)
    isConnected,
    isLoading,
    error,
    characterState,
    unityStatus,
    isUnityViewVisible,

    // Actions (async)
    setCharacterSpeed,
    stopCharacter,
    setCharacterMotion,
    changeAvatar,

    // Utility actions
    clearError,
    setUnityViewVisible,
  };
};
