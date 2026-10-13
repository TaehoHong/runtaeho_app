import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useForceUpdateStore } from '../stores/forceUpdateStore';
import { checkVersionFromServer } from '../services/forceUpdateService';
import { FORCE_UPDATE_CONFIG } from '../constants';
import { ForceUpdateStatus, type ForceUpdateCheckSource } from '../models/ForceUpdateState';
import { useAppStore, RunningState } from '~/stores/app/appStore';

interface UseForceUpdateCheckOptions {
  /** 앱 시작 시 체크 여부 */
  checkOnLaunch?: boolean;
  /** 포그라운드 복귀 시 체크 여부 */
  checkOnForeground?: boolean;
}

/**
 * 강제 업데이트 체크 훅
 */
export function useForceUpdateCheck(options: UseForceUpdateCheckOptions = {}) {
  const { checkOnLaunch = true, checkOnForeground = true } = options;

  const {
    status,
    checkSource,
    minimumVersion,
    message,
    error,
    lastCheckedAt,
    setChecking,
    setUpdateRequired,
    setUpToDate,
    setError,
  } = useForceUpdateStore();

  // 러닝 상태 구독 - Stopped이 아닌 모든 상태에서 체크 스킵
  const runningState = useAppStore((state) => state.runningState);
  const isRunning = runningState !== RunningState.Stopped;

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isCheckingRef = useRef(false);
  const requestIdRef = useRef(0);
  const activeSourceRef = useRef<ForceUpdateCheckSource | null>(null);
  const recheckAfterRunningRef = useRef(false);
  const previousRunningRef = useRef(isRunning);
  const performVersionCheckRef = useRef<(
    (force: boolean, source: ForceUpdateCheckSource) => Promise<void>
  ) | null>(null);

  /**
   * 버전 체크 실행
   */
  const performVersionCheck = useCallback(
    async (force: boolean, source: ForceUpdateCheckSource) => {
      // 이미 체크 중이면 스킵
      if (isCheckingRef.current) {
        if (__DEV__) console.log('[ForceUpdate] Already checking, skipping...');
        return;
      }

      // Debounce 체크 (force가 아닌 경우)
      if (!force && lastCheckedAt) {
        const elapsed = Date.now() - lastCheckedAt;
        if (elapsed < FORCE_UPDATE_CONFIG.DEBOUNCE_INTERVAL) {
          if (__DEV__) {
            console.log(
              `[ForceUpdate] Debounce: ${Math.round(elapsed / 1000)}s elapsed, skipping...`
            );
          }
          return;
        }
      }

      const requestId = ++requestIdRef.current;
      activeSourceRef.current = source;
      recheckAfterRunningRef.current = false;
      const isCurrent = () => requestIdRef.current === requestId;
      const deferForegroundResult = () => {
        if (source === 'foreground' && useAppStore.getState().runningState !== RunningState.Stopped) {
          recheckAfterRunningRef.current = true;
          return true;
        }
        return false;
      };
      try {
        isCheckingRef.current = true;
        setChecking(source);

        if (__DEV__) console.log('[ForceUpdate] Checking version...');

        const response = await checkVersionFromServer();
        if (!isCurrent() || deferForegroundResult()) return;

        if (response.forceUpdate && response.minimumVersion) {
          if (__DEV__) {
            console.log(
              `[ForceUpdate] Update required: ${response.minimumVersion}`
            );
          }
          setUpdateRequired(response.minimumVersion, response.message);
        } else {
          if (__DEV__) console.log('[ForceUpdate] App is up to date');
          setUpToDate();
        }
      } catch (err) {
        if (!isCurrent() || deferForegroundResult()) return;
        const error =
          err instanceof Error ? err : new Error('Unknown error occurred');
        if (__DEV__) console.error('[ForceUpdate] Check failed:', error);
        setError(error);
      } finally {
        if (isCurrent()) {
          isCheckingRef.current = false;
          activeSourceRef.current = null;
        }
      }
    },
    [lastCheckedAt, setChecking, setUpdateRequired, setUpToDate, setError]
  );

  const checkForUpdate = useCallback(
    async (force = false) => {
      await performVersionCheck(force, 'manual');
    },
    [performVersionCheck]
  );

  useEffect(() => {
    performVersionCheckRef.current = performVersionCheck;
  }, [performVersionCheck]);

  useEffect(() => {
    const wasRunning = previousRunningRef.current;
    previousRunningRef.current = isRunning;
    if (isRunning && !wasRunning && (activeSourceRef.current === 'foreground' || (checkSource === 'foreground' && status !== ForceUpdateStatus.IDLE))) {
      requestIdRef.current += 1;
      isCheckingRef.current = false;
      activeSourceRef.current = null;
      recheckAfterRunningRef.current = true;
      setChecking('foreground');
    }
    if (!isRunning && wasRunning && recheckAfterRunningRef.current) {
      recheckAfterRunningRef.current = false;
      void performVersionCheckRef.current?.(true, 'foreground');
    }
  }, [checkSource, isRunning, setChecking, status]);

  useEffect(() => () => {
    requestIdRef.current += 1;
    isCheckingRef.current = false;
    activeSourceRef.current = null;
  }, []);

  /**
   * 앱 상태 변경 핸들러 (포그라운드 복귀 감지)
   */
  const handleAppStateChange = useCallback(
    (nextAppState: AppStateStatus) => {
      // 백그라운드/inactive → active 전환 감지
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        checkOnForeground
      ) {
        // 러닝 중에는 체크 스킵
        if (isRunning) {
          if (__DEV__) {
            console.log('[ForceUpdate] Skipping check - running in progress');
          }
          appStateRef.current = nextAppState;
          return;
        }

        if (__DEV__) {
          console.log('[ForceUpdate] App came to foreground, checking...');
        }
        performVersionCheck(false, 'foreground'); // debounce 적용
      }

      appStateRef.current = nextAppState;
    },
    [checkOnForeground, performVersionCheck, isRunning]
  );

  // 앱 시작 시 체크
  useEffect(() => {
    if (checkOnLaunch) {
      performVersionCheckRef.current?.(true, 'launch'); // force 체크 (debounce 무시)
    }
  }, [checkOnLaunch]);

  // 포그라운드 복귀 감지
  useEffect(() => {
    if (!checkOnForeground) return;

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    return () => {
      subscription.remove();
    };
  }, [checkOnForeground, handleAppStateChange]);

  return {
    status,
    checkSource,
    minimumVersion,
    message,
    error,
    isChecking: status === ForceUpdateStatus.CHECKING,
    isUpdateRequired: status === ForceUpdateStatus.UPDATE_REQUIRED,
    isError: status === ForceUpdateStatus.ERROR,
    checkForUpdate,
  };
}
