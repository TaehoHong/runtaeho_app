import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useUpdateStore } from '../stores/updateStore';
import { UpdateStatus } from '../models/UpdateState';
import { checkForUpdate, isUpdatesEnabled } from '../services/updateService';
import { useAppStore, RunningState } from '~/stores/app/appStore';

interface UseUpdateCheckOptions {
  /** 앱 시작 시 자동 체크 */
  checkOnLaunch?: boolean | undefined;
  /** 포그라운드 복귀 시 자동 체크 */
  checkOnForeground?: boolean | undefined;
  /** 체크 간격 최소 시간 (ms) - 기본값: 5분 */
  minCheckInterval?: number | undefined;
}

interface UseUpdateCheckResult {
  /** 업데이트 사용 가능 여부 */
  hasUpdate: boolean;
  /** 업데이트 확인 중 여부 */
  isChecking: boolean;
  /** 마지막 확인 시간 */
  lastCheckedAt: Date | null;
  /** 수동 업데이트 확인 */
  checkForUpdate: (force?: boolean) => Promise<boolean>;
}

const DEFAULT_MIN_CHECK_INTERVAL = 5 * 60 * 1000; // 5분

export function useUpdateCheck(options: UseUpdateCheckOptions = {}): UseUpdateCheckResult {
  const {
    checkOnLaunch = true,
    checkOnForeground = true,
    minCheckInterval = DEFAULT_MIN_CHECK_INTERVAL,
  } = options;

  const {
    status,
    lastCheckedAt,
    availableManifest,
    setStatus,
    setLastCheckedAt,
    setAvailableManifest,
    setError,
  } = useUpdateStore();

  // 러닝 상태 구독 - Stopped이 아닌 모든 상태에서 체크 스킵
  const runningState = useAppStore((state) => state.runningState);
  const isRunning = runningState !== RunningState.Stopped;

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const hasCheckedOnLaunch = useRef(false);

  const shouldCheck = useCallback((): boolean => {
    if (!isUpdatesEnabled()) {
      return false;
    }

    if (!lastCheckedAt) {
      return true;
    }

    const timeSinceLastCheck = Date.now() - lastCheckedAt.getTime();
    return timeSinceLastCheck >= minCheckInterval;
  }, [lastCheckedAt, minCheckInterval]);

  const performCheck = useCallback(async (force: boolean = false): Promise<boolean> => {
    if (!isUpdatesEnabled()) {
      console.log('[Updates] Skipping check - updates not enabled');
      return false;
    }

    if (!force && !shouldCheck()) {
      console.log('[Updates] Skipping check - checked recently');
      return availableManifest !== null;
    }

    try {
      setStatus(UpdateStatus.CHECKING);
      setError(null);

      const result = await checkForUpdate();
      setLastCheckedAt(new Date());

      if (result.isAvailable && result.manifest) {
        setStatus(UpdateStatus.AVAILABLE);
        setAvailableManifest(result.manifest);
        console.log('[Updates] Update available:', result.manifest.id);
        return true;
      } else {
        setStatus(UpdateStatus.NO_UPDATE);
        setAvailableManifest(null);
        console.log('[Updates] No update available');
        return false;
      }
    } catch (error) {
      console.error('[Updates] Check failed:', error);
      setError(error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }, [
    shouldCheck,
    availableManifest,
    setStatus,
    setError,
    setLastCheckedAt,
    setAvailableManifest,
  ]);

  // 앱 시작 시 체크
  useEffect(() => {
    if (checkOnLaunch && !hasCheckedOnLaunch.current) {
      hasCheckedOnLaunch.current = true;
      performCheck();
    }
  }, [checkOnLaunch, performCheck]);

  // 포그라운드 복귀 시 체크
  useEffect(() => {
    if (!checkOnForeground) return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // 러닝 중에는 체크 스킵
        if (isRunning) {
          console.log('[Updates] Skipping check - running in progress');
          appStateRef.current = nextAppState;
          return;
        }

        console.log('[Updates] App came to foreground, checking for updates');
        performCheck();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [checkOnForeground, performCheck, isRunning]);

  return {
    hasUpdate: status === UpdateStatus.AVAILABLE || availableManifest !== null,
    isChecking: status === UpdateStatus.CHECKING,
    lastCheckedAt,
    checkForUpdate: performCheck,
  };
}
