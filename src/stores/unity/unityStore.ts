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

export interface UnityViewportFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UnityViewport {
  owner: 'running' | 'share' | 'avatar' | 'league';
  frame: UnityViewportFrame;
  borderRadius?: number;
}

export interface RenderedUnityViewport {
  owner: UnityViewport['owner'];
  frame: UnityViewportFrame;
}

export type UnitySessionStatus =
  | 'cold'
  | 'booting'
  | 'ready_hidden'
  | 'attached_visible'
  | 'backgrounded'
  | 'reattaching'
  | 'recovering';

export interface UnityReadyEventSnapshot {
  version: number;
  ready?: boolean;
  message?: string;
  type?: string;
  timestamp: string;
  target?: number;
}

export interface UnitySessionTransition {
  status: UnitySessionStatus;
  reason: string;
  timestamp: string;
  owner: UnityViewport['owner'] | null;
}

export interface UnitySessionDebugCounters {
  attachCount: number;
  hardResetCount: number;
  readyEventCount: number;
  reattachRequestCount: number;
}

const VIEWPORT_FRAME_EPSILON = 0.5;

const areViewportFramesEqual = (
  left: UnityViewportFrame,
  right: UnityViewportFrame
): boolean =>
  Math.abs(left.x - right.x) <= VIEWPORT_FRAME_EPSILON
  && Math.abs(left.y - right.y) <= VIEWPORT_FRAME_EPSILON
  && Math.abs(left.width - right.width) <= VIEWPORT_FRAME_EPSILON
  && Math.abs(left.height - right.height) <= VIEWPORT_FRAME_EPSILON;

const areActiveViewportsEqual = (
  left: UnityViewport | null,
  right: UnityViewport
): boolean =>
  !!left
  && left.owner === right.owner
  && (left.borderRadius ?? 0) === (right.borderRadius ?? 0)
  && areViewportFramesEqual(left.frame, right.frame);

const areRenderedViewportsEqual = (
  left: RenderedUnityViewport | null,
  right: RenderedUnityViewport
): boolean =>
  !!left
  && left.owner === right.owner
  && areViewportFramesEqual(left.frame, right.frame);

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
  activeViewport: UnityViewport | null;
  renderedViewport: RenderedUnityViewport | null;
  sessionStatus: UnitySessionStatus;
  reattachToken: number;
  lastUnityReadyEvent: UnityReadyEventSnapshot | null;
  sessionTransitions: UnitySessionTransition[];
  currentAvatarPayloadHash: string | null;
  lastAppliedAvatarHash: string | null;
  debugCounters: UnitySessionDebugCounters;

  // State Update Actions (Sync only)
  setConnected: (isConnected: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: UnityError | null) => void;
  clearError: () => void;
  updateCharacterState: (characterState: CharacterState) => void;
  updateUnityStatus: (unityStatus: UnityStatus) => void;
  setUnityViewVisible: (isVisible: boolean) => void;
  setActiveViewport: (viewport: UnityViewport) => void;
  clearActiveViewport: (owner?: UnityViewport['owner']) => void;
  setRenderedViewport: (viewport: RenderedUnityViewport | null) => void;
  resetUnityState: () => void;

  // ★ Unity Ready 상태 액션
  setGameObjectReady: (ready: boolean) => void;
  setAvatarReady: (ready: boolean) => void;
  resetReadyStates: () => void;
  setSessionStatus: (
    status: UnitySessionStatus,
    reason: string,
    owner?: UnityViewport['owner'] | null
  ) => void;
  bumpReattachToken: () => void;
  publishUnityReadyEvent: (event: Omit<UnityReadyEventSnapshot, 'version' | 'timestamp'>) => void;
  setCurrentAvatarPayloadHash: (hash: string | null) => void;
  markAvatarPayloadApplied: (hash: string | null) => void;
  invalidateAvatarPayloadApplication: () => void;
  bumpDebugCounter: (counter: keyof UnitySessionDebugCounters) => void;
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
  activeViewport: null,
  renderedViewport: null,
  sessionStatus: 'cold' as UnitySessionStatus,
  reattachToken: 0,
  lastUnityReadyEvent: null,
  sessionTransitions: [] as UnitySessionTransition[],
  currentAvatarPayloadHash: null,
  lastAppliedAvatarHash: null,
  debugCounters: {
    attachCount: 0,
    hardResetCount: 0,
    readyEventCount: 0,
    reattachRequestCount: 0,
  } as UnitySessionDebugCounters,
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

  setActiveViewport: (activeViewport) =>
    set((state) => {
      if (
        state.isUnityViewVisible
        && areActiveViewportsEqual(state.activeViewport, activeViewport)
      ) {
        return state;
      }

      return {
        activeViewport,
        isUnityViewVisible: true,
        lastInteraction: new Date().toISOString(),
      };
    }),

  clearActiveViewport: (owner) =>
    set((state) => {
      if (!state.activeViewport) {
        return state;
      }

      if (owner && state.activeViewport.owner !== owner) {
        return state;
      }

      return {
        activeViewport: null,
        renderedViewport: null,
        isUnityViewVisible: false,
        lastInteraction: new Date().toISOString(),
      };
    }),

  setRenderedViewport: (renderedViewport) =>
    set((state) => {
      if (renderedViewport && areRenderedViewportsEqual(state.renderedViewport, renderedViewport)) {
        return state;
      }

      if (!renderedViewport && !state.renderedViewport) {
        return state;
      }

      return {
        renderedViewport,
        lastInteraction: new Date().toISOString(),
      };
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

  setSessionStatus: (sessionStatus, reason, owner) =>
    set((state) => {
      const resolvedOwner = owner ?? state.activeViewport?.owner ?? null;
      const lastTransition = state.sessionTransitions[state.sessionTransitions.length - 1];
      const timestamp = new Date().toISOString();

      const nextState: Partial<UnityState> = {
        sessionStatus,
        lastInteraction: timestamp,
      };

      if (
        lastTransition
        && lastTransition.status === sessionStatus
        && lastTransition.reason === reason
        && lastTransition.owner === resolvedOwner
      ) {
        return state;
      }

      const nextTransition: UnitySessionTransition = {
        status: sessionStatus,
        reason,
        timestamp,
        owner: resolvedOwner,
      };

      return {
        ...nextState,
        sessionTransitions: [...state.sessionTransitions, nextTransition].slice(-50),
      } as UnityState;
    }),

  bumpReattachToken: () =>
    set((state) => ({
      reattachToken: state.reattachToken + 1,
      lastInteraction: new Date().toISOString(),
    })),

  publishUnityReadyEvent: (event) =>
    set((state) => ({
      lastUnityReadyEvent: {
        ...event,
        version: (state.lastUnityReadyEvent?.version ?? 0) + 1,
        timestamp: new Date().toISOString(),
      },
      lastInteraction: new Date().toISOString(),
    })),

  setCurrentAvatarPayloadHash: (currentAvatarPayloadHash) =>
    set({
      currentAvatarPayloadHash,
      lastInteraction: new Date().toISOString(),
    }),

  markAvatarPayloadApplied: (hash) =>
    set({
      currentAvatarPayloadHash: hash,
      lastAppliedAvatarHash: hash,
      lastInteraction: new Date().toISOString(),
    }),

  invalidateAvatarPayloadApplication: () =>
    set({
      lastAppliedAvatarHash: null,
      lastInteraction: new Date().toISOString(),
    }),

  bumpDebugCounter: (counter) =>
    set((state) => ({
      debugCounters: {
        ...state.debugCounters,
        [counter]: state.debugCounters[counter] + 1,
      },
      lastInteraction: new Date().toISOString(),
    })),
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
