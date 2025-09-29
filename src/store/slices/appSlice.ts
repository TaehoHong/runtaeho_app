import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * App State Slice
 * iOS AppState.swift에서 마이그레이션
 */

// iOS의 ViewState 대응
export enum ViewState {
  Loading = 'Loading',
  Loaded = 'Loaded'
}

// iOS의 RunningState 대응
export enum RunningState {
  Stopped = 'Stopped',
  Running = 'Running',
  Paused = 'Paused',
  Finished = 'Finished'
}

interface AppState {
  viewState: ViewState;
  runningState: RunningState;
}

const initialState: AppState = {
  viewState: ViewState.Loading,
  runningState: RunningState.Stopped
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setViewState: (state, action: PayloadAction<ViewState>) => {
      state.viewState = action.payload;
    },
    setRunningState: (state, action: PayloadAction<RunningState>) => {
      state.runningState = action.payload;
    },
    resetAppState: (state) => {
      state.viewState = ViewState.Loading;
      state.runningState = RunningState.Stopped;
    }
  }
});

export const {
  setViewState,
  setRunningState,
  resetAppState
} = appSlice.actions;

export default appSlice.reducer;

// Selectors
export const selectViewState = (state: { app: AppState }) => state.app.viewState;
export const selectRunningState = (state: { app: AppState }) => state.app.runningState;
export const selectAppState = (state: { app: AppState }) => state.app;
