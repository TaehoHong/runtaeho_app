/**
 * 앱 플랫폼 타입
 */
export type Platform = 'IOS' | 'ANDROID';

/**
 * 강제 업데이트 체크 상태
 */
export enum ForceUpdateStatus {
  /** 초기 상태 */
  IDLE = 'idle',
  /** 버전 체크 중 */
  CHECKING = 'checking',
  /** 업데이트 필요 */
  UPDATE_REQUIRED = 'update_required',
  /** 업데이트 불필요 (최신 버전) */
  UP_TO_DATE = 'up_to_date',
  /** 네트워크 에러 */
  ERROR = 'error',
}

/**
 * 서버 응답 타입
 */
export interface VersionCheckResponse {
  forceUpdate: boolean;
  minimumVersion: string | null;
  message: string | null;
}

/**
 * 강제 업데이트 스토어 상태
 */
export interface ForceUpdateState {
  status: ForceUpdateStatus;
  minimumVersion: string | null;
  message: string | null;
  error: Error | null;
  lastCheckedAt: number | null;
}

/**
 * 강제 업데이트 스토어 액션
 */
export interface ForceUpdateActions {
  setChecking: () => void;
  setUpdateRequired: (minimumVersion: string, message: string | null) => void;
  setUpToDate: () => void;
  setError: (error: Error) => void;
  reset: () => void;
}
