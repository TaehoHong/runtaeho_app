/**
 * App Store (Zustand)
 * 기존 appSlice.ts에서 마이그레이션
 * Redux Toolkit → Zustand
 */

import { create } from 'zustand';

/**
 * ViewState Enum
 * iOS의 ViewState 대응
 */
export enum ViewState {
  Loading = 'Loading',
  Loaded = 'Loaded',
}

/**
 * RunningState Enum
 * iOS의 RunningState 대응
 */
export enum RunningState {
  Stopped = 'Stopped',
  Running = 'Running',
  Paused = 'Paused',
  Finished = 'Finished',
}

/**
 * App State Interface
 */
interface AppState {
  // State
  viewState: ViewState;
  runningState: RunningState;

  // Actions
  setViewState: (viewState: ViewState) => void;
  setRunningState: (runningState: RunningState) => void;
  resetAppState: () => void;
}

/**
 * Initial State
 */
const initialState = {
  viewState: ViewState.Loading,
  runningState: RunningState.Stopped,
};

/**
 * App Store
 * 기존 appSlice의 모든 상태와 액션 포함
 */
export const useAppStore = create<AppState>((set) => ({
  // Initial State
  ...initialState,

  // Actions
  setViewState: (viewState) => set({ viewState }),

  setRunningState: (runningState) => set({ runningState }),

  resetAppState: () => set(initialState),
}));
