import { create } from 'zustand';
import { UpdateStatus, UpdateManifest } from '../models/UpdateState';

interface UpdateState {
  /** 현재 업데이트 상태 */
  status: UpdateStatus;
  /** 다운로드 진행률 (0-100) */
  progress: number;
  /** 오류 정보 */
  error: Error | null;
  /** 업데이트 적용 준비 완료 여부 */
  isUpdateReady: boolean;
  /** 마지막 확인 시간 */
  lastCheckedAt: Date | null;
  /** 사용 가능한 업데이트 매니페스트 */
  availableManifest: UpdateManifest | null;
  /** 자동 업데이트 완료 여부 (done/skipped/idle) - AuthProvider 네비게이션 제어용 */
  isAutoUpdateCompleted: boolean;

  // Actions
  setStatus: (status: UpdateStatus) => void;
  setProgress: (progress: number) => void;
  setError: (error: Error | null) => void;
  setUpdateReady: (isReady: boolean) => void;
  setLastCheckedAt: (date: Date | null) => void;
  setAvailableManifest: (manifest: UpdateManifest | null) => void;
  setAutoUpdateCompleted: (completed: boolean) => void;
  reset: () => void;
}

const initialState = {
  status: UpdateStatus.IDLE,
  progress: 0,
  error: null,
  isUpdateReady: false,
  lastCheckedAt: null,
  availableManifest: null,
  isAutoUpdateCompleted: false,
};

export const useUpdateStore = create<UpdateState>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),

  setProgress: (progress) => set({ progress }),

  setError: (error) => set({
    error,
    status: error ? UpdateStatus.ERROR : UpdateStatus.IDLE
  }),

  setUpdateReady: (isReady) => set({
    isUpdateReady: isReady,
    status: isReady ? UpdateStatus.READY : UpdateStatus.IDLE
  }),

  setLastCheckedAt: (date) => set({ lastCheckedAt: date }),

  setAvailableManifest: (manifest) => set({ availableManifest: manifest }),

  setAutoUpdateCompleted: (completed) => set({ isAutoUpdateCompleted: completed }),

  reset: () => set(initialState),
}));
