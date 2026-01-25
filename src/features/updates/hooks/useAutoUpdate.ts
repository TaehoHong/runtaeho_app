import { useCallback, useEffect, useRef, useState } from 'react';
import { useUpdateStore } from '../stores/updateStore';
import { UpdateStatus } from '../models/UpdateState';
import {
  checkForUpdate,
  downloadUpdate as downloadUpdateService,
  applyUpdate as applyUpdateService,
  isUpdatesEnabled,
} from '../services/updateService';

/**
 * 자동 업데이트 상태
 */
export type AutoUpdateStatus =
  | 'idle'        // 초기 상태
  | 'checking'    // 업데이트 확인 중
  | 'downloading' // 다운로드 중
  | 'applying'    // 적용 중 (재시작 직전)
  | 'error'       // 에러
  | 'done'        // 완료 (업데이트 없음 또는 적용 완료)
  | 'skipped';    // 건너뜀 (사용자가 건너뛰기 선택)

interface UseAutoUpdateOptions {
  /** 자동으로 업데이트 확인 시작 (기본값: true) */
  autoStart?: boolean;
  /** 최대 재시도 횟수 (기본값: 3) */
  maxRetries?: number;
  /** 업데이트가 활성화되지 않은 경우 바로 done 처리 (기본값: true) */
  skipIfDisabled?: boolean;
}

interface UseAutoUpdateResult {
  /** 현재 상태 */
  status: AutoUpdateStatus;
  /** 다운로드 진행률 (0-100) */
  progress: number;
  /** 에러 정보 */
  error: Error | null;
  /** 현재 재시도 횟수 */
  retryCount: number;
  /** 최대 재시도 횟수 */
  maxRetries: number;
  /** 수동 재시도 */
  retry: () => void;
  /** 건너뛰기 */
  skip: () => void;
  /** 수동 시작 (autoStart가 false인 경우 사용) */
  start: () => void;
}

const DEFAULT_MAX_RETRIES = 3;

/**
 * 앱 시작 시 자동 OTA 업데이트를 처리하는 훅
 *
 * 플로우:
 * 1. 앱 시작 → checkForUpdate()
 * 2. 업데이트 있음 → downloadUpdate()
 * 3. 다운로드 성공 → applyUpdate() (앱 재시작)
 * 4. 실패 시 최대 3회 자동 재시도
 * 5. 3회 실패 후 에러 상태 → 사용자가 재시도 또는 건너뛰기 선택
 */
export function useAutoUpdate(options: UseAutoUpdateOptions = {}): UseAutoUpdateResult {
  const {
    autoStart = true,
    maxRetries = DEFAULT_MAX_RETRIES,
    skipIfDisabled = true,
  } = options;

  const [status, setStatus] = useState<AutoUpdateStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // 중복 실행 방지를 위한 ref
  const isRunningRef = useRef(false);
  const hasStartedRef = useRef(false);

  const {
    setStatus: setStoreStatus,
    setProgress: setStoreProgress,
    setAutoUpdateCompleted,
  } = useUpdateStore();

  /**
   * 업데이트 확인 및 다운로드 플로우 실행
   */
  const runUpdateFlow = useCallback(async () => {
    // 이미 실행 중이면 무시
    if (isRunningRef.current) {
      console.log('[AutoUpdate] Already running, skipping');
      return;
    }

    // Updates가 비활성화되어 있으면 바로 done
    if (!isUpdatesEnabled()) {
      console.log('[AutoUpdate] Updates not enabled, marking as done');
      if (skipIfDisabled) {
        setStatus('done');
        setAutoUpdateCompleted(true);
        return;
      }
    }

    isRunningRef.current = true;

    try {
      // 1. 업데이트 확인
      console.log('[AutoUpdate] Checking for updates...');
      setStatus('checking');
      setStoreStatus(UpdateStatus.CHECKING);
      setError(null);

      const result = await checkForUpdate();

      if (!result.isAvailable) {
        console.log('[AutoUpdate] No update available');
        setStatus('done');
        setStoreStatus(UpdateStatus.NO_UPDATE);
        setAutoUpdateCompleted(true);
        isRunningRef.current = false;
        return;
      }

      console.log('[AutoUpdate] Update available, downloading...');

      // 2. 업데이트 다운로드
      setStatus('downloading');
      setStoreStatus(UpdateStatus.DOWNLOADING);
      setProgress(0);
      setStoreProgress(0);

      await downloadUpdateService((progressInfo) => {
        setProgress(progressInfo.percentage);
        setStoreProgress(progressInfo.percentage);
      });

      console.log('[AutoUpdate] Download complete, applying...');

      // 3. 업데이트 적용 (앱 재시작)
      setStatus('applying');
      setProgress(100);
      setStoreProgress(100);

      // 잠시 대기 후 재시작 (UI 업데이트 반영)
      await new Promise((resolve) => setTimeout(resolve, 500));

      await applyUpdateService();
      // reloadAsync가 성공하면 앱이 재시작되므로 여기까지 오지 않음

    } catch (err) {
      console.error('[AutoUpdate] Error:', err);
      const updateError = err instanceof Error ? err : new Error(String(err));
      setError(updateError);
      setStoreStatus(UpdateStatus.ERROR);

      // 재시도 로직
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);

      if (newRetryCount < maxRetries) {
        console.log(`[AutoUpdate] Retrying (${newRetryCount}/${maxRetries})...`);
        isRunningRef.current = false;
        // 1초 후 자동 재시도
        setTimeout(() => {
          runUpdateFlow();
        }, 1000);
        return;
      }

      console.log('[AutoUpdate] Max retries reached, showing error');
      setStatus('error');
      isRunningRef.current = false;
    }
  }, [retryCount, maxRetries, skipIfDisabled, setStoreStatus, setStoreProgress, setAutoUpdateCompleted]);

  /**
   * 수동 재시도
   */
  const retry = useCallback(() => {
    console.log('[AutoUpdate] Manual retry requested');
    setRetryCount(0);
    setError(null);
    isRunningRef.current = false;
    runUpdateFlow();
  }, [runUpdateFlow]);

  /**
   * 건너뛰기
   */
  const skip = useCallback(() => {
    console.log('[AutoUpdate] Skipped by user');
    setStatus('skipped');
    setError(null);
    setAutoUpdateCompleted(true);
    isRunningRef.current = false;
  }, [setAutoUpdateCompleted]);

  /**
   * 수동 시작
   */
  const start = useCallback(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      runUpdateFlow();
    }
  }, [runUpdateFlow]);

  // 자동 시작
  useEffect(() => {
    if (autoStart && !hasStartedRef.current) {
      hasStartedRef.current = true;
      runUpdateFlow();
    }
  }, [autoStart, runUpdateFlow]);

  return {
    status,
    progress,
    error,
    retryCount,
    maxRetries,
    retry,
    skip,
    start,
  };
}
