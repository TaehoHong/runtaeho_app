/**
 * Unity Store (Zustand)
 * 기존 unitySlice.ts에서 마이그레이션
 * Redux Toolkit → Zustand
 *
 * Phase 2: 비동기 로직 제거 - 상태 관리만 담당
 * 비동기 작업은 ViewModel이나 컴포넌트에서 UnityBridgeService를 직접 호출
 */

import { create } from 'zustand';
import type {
  CharacterMotion,
  CharacterState,
  UnityError,
  UnityStatus,
} from '../../features/unity/types/UnityTypes';

/**
 * Unity State Interface
 * 순수한 상태만 관리
 */
interface UnityState {
  // Connection Status
  isConnected: boolean;
  isLoading: boolean;
  error: UnityError | null;

  // ★ Unity Ready 상태 (통합 관리)
  isGameObjectReady: boolean; // onCharactorReady 이벤트 후 true
  isAvatarReady: boolean; // onAvatarReady 이벤트 후 true

  // Character State
  characterState: CharacterState | null;

  // Unity Status
  unityStatus: UnityStatus | null;

  // UI State
  isUnityViewVisible: boolean;
  lastInteraction: string | null;

  // State Update Actions (Sync only)
  setConnected: (isConnected: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: UnityError | null) => void;
  clearError: () => void;
  updateCharacterState: (characterState: CharacterState) => void;
  updateUnityStatus: (unityStatus: UnityStatus) => void;
  setUnityViewVisible: (isVisible: boolean) => void;
  resetUnityState: () => void;

  // ★ Unity Ready 상태 액션
  setGameObjectReady: (ready: boolean) => void;
  setAvatarReady: (ready: boolean) => void;
  resetReadyStates: () => void;
}

/**
 * Initial State
 */
const initialState = {
  isConnected: false,
  isLoading: false,
  error: null,
  // ★ Unity Ready 상태 초기값
  isGameObjectReady: false,
  isAvatarReady: false,
  characterState: {
    motion: 'IDLE' as CharacterMotion,
    speed: 0,
    isMoving: false,
    timestamp: new Date().toISOString(),
  },
  unityStatus: null,
  isUnityViewVisible: false,
  lastInteraction: null,
};

/**
 * Unity Store
 * Phase 2: 비동기 로직 제거됨 - 상태 관리만 수행
 * 비동기 작업은 UnityBridgeService를 직접 호출하여 처리
 */
export const useUnityStore = create<UnityState>((set) => ({
  // Initial State
  ...initialState,

  // ==========================================
  // Sync Actions (상태 업데이트만)
  // ==========================================

  setConnected: (isConnected) =>
    set({
      isConnected,
      lastInteraction: new Date().toISOString(),
    }),

  setLoading: (isLoading) =>
    set({
      isLoading,
    }),

  setError: (error) =>
    set({
      error,
      lastInteraction: new Date().toISOString(),
    }),

  clearError: () => set({ error: null }),

  updateCharacterState: (characterState) =>
    set({
      characterState,
      lastInteraction: new Date().toISOString(),
    }),

  updateUnityStatus: (unityStatus) =>
    set({
      unityStatus,
      isConnected: unityStatus.characterManagerExists,
      lastInteraction: new Date().toISOString(),
    }),

  setUnityViewVisible: (isUnityViewVisible) =>
    set({
      isUnityViewVisible,
      lastInteraction: new Date().toISOString(),
    }),

  resetUnityState: () => set(initialState),

  // ★ Unity Ready 상태 액션
  setGameObjectReady: (isGameObjectReady) =>
    set({
      isGameObjectReady,
      lastInteraction: new Date().toISOString(),
    }),

  setAvatarReady: (isAvatarReady) =>
    set({
      isAvatarReady,
      lastInteraction: new Date().toISOString(),
    }),

  resetReadyStates: () =>
    set({
      isGameObjectReady: false,
      isAvatarReady: false,
      lastInteraction: new Date().toISOString(),
    }),
}));

/**
 * Selectors
 * Zustand에서는 hook으로 직접 선택 가능하지만,
 * 복잡한 로직이 필요한 경우 selector 함수 제공
 */
export const selectIsUnityReady = (state: UnityState) =>
  state.isConnected && !state.isLoading && !state.error;

export const selectCharacterSpeed = (state: UnityState) =>
  state.characterState?.speed ?? 0;

export const selectCharacterMotion = (state: UnityState) =>
  state.characterState?.motion ?? 'IDLE';

/**
 * ★ Unity 전체 준비 상태 Selector
 * GameObject 준비 + Avatar 적용 + 에러 없음
 * View에서 이 selector만 사용하면 됨
 */
export const selectIsFullyReady = (state: UnityState) =>
  state.isGameObjectReady && state.isAvatarReady && !state.error;

/**
 * ★ GameObject만 준비된 상태 Selector
 * 아바타 적용 전이지만 메시지 전송 가능
 */
export const selectCanSendMessage = (state: UnityState) =>
  state.isGameObjectReady && !state.error;
