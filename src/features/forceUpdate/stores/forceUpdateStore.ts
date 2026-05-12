import { create } from 'zustand';
import {
  ForceUpdateStatus,
  type ForceUpdateState,
  type ForceUpdateActions,
} from '../models/ForceUpdateState';

type ForceUpdateStore = ForceUpdateState & ForceUpdateActions;

const initialState: ForceUpdateState = {
  status: ForceUpdateStatus.IDLE,
  checkSource: null,
  minimumVersion: null,
  message: null,
  error: null,
  lastCheckedAt: null,
};

export const useForceUpdateStore = create<ForceUpdateStore>((set) => ({
  ...initialState,

  setChecking: (source = 'manual') =>
    set({
      status: ForceUpdateStatus.CHECKING,
      checkSource: source,
      error: null,
    }),

  setUpdateRequired: (minimumVersion, message) =>
    set({
      status: ForceUpdateStatus.UPDATE_REQUIRED,
      minimumVersion,
      message,
      lastCheckedAt: Date.now(),
    }),

  setUpToDate: () =>
    set({
      status: ForceUpdateStatus.UP_TO_DATE,
      minimumVersion: null,
      message: null,
      lastCheckedAt: Date.now(),
    }),

  setError: (error) =>
    set({
      status: ForceUpdateStatus.ERROR,
      error,
      lastCheckedAt: Date.now(),
    }),

  reset: () => set(initialState),
}));
