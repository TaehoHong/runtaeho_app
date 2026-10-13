import React, { useEffect, type ReactNode, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAppStore, ViewState } from '~/stores';
import { useAuthStore, getSessionSnapshot, isSessionCurrent, type SessionSnapshot } from '~/features/auth/stores/authStore';
import { useUserStore } from '~/stores/user/userStore';
import { pointService } from '~/features/point/services/pointService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { unityService } from '~/features/unity/services/UnityService';
import type { Item } from '~/features/avatar';

interface AppStateProviderProps {
  children: ReactNode;
}

// 임계치 상수 (5분)
const BACKGROUND_SYNC_THRESHOLD_SECONDS = 300 as const;

// 최신 값을 참조하기 위한 ref 헬퍼
function useLatestRef<T>(value: T) {
  const ref = React.useRef(value);
  useEffect(() => { ref.current = value; }, [value]);
  return ref;
}

// AppState 구독을 캡슐화한 헬퍼 (중복 구독 방지용)
function subscribeToAppLifecycle(params: {
  onForeground: (bgSeconds: number) => void | Promise<void>;
  onBackground: () => void | Promise<void>;
  setupTokenRefreshNotificationsOnce: () => void;
}) {
  const { onForeground, onBackground, setupTokenRefreshNotificationsOnce } = params;

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    console.log('🔄 [AppStateProvider] 앱 상태 변경:', nextAppState);
    switch (nextAppState) {
      case 'active':
        onForeground(0); // 실제 bgSeconds 계산은 Provider 내부에서 수행
        break;
      case 'background':
        onBackground();
        break;
      case 'inactive':
        console.log('⏸️ [AppStateProvider] 앱 Inactive 상태');
        break;
    }
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);
  setupTokenRefreshNotificationsOnce();

  return () => {
    subscription?.remove();
  };
}

/**
 * 앱 상태를 관리하는 Provider
 */
export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
  const setViewState = useAppStore((state) => state.setViewState);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn); // ✅ AuthStore로 변경

  const isLoggedInRef = useLatestRef(isLoggedIn);
  const fgInFlight = useRef(false); // 포그라운드 재진입 가드
  const tokenSetupDone = useRef(false); // 토큰 알림 1회 설정 가드
  const hasInitialized = useRef(false); // ✅ 초기화 중복 방지 가드

  /**
   * 앱이 Background로 진입할 때 처리
   */
  const handleAppBackground = useCallback(async () => {
    console.log('🌙 [AppStateProvider] App entering background, saving state');
    await AsyncStorage.setItem('backgroundEnterTime', String(Date.now()));
    // TODO: 현재 상태 저장 로직
    console.log('💾 [AppStateProvider] Background 상태 저장 완료');
  }, []);

  /**
   * 백그라운드 시간 계산
   */
  const calculateBackgroundDuration = useCallback(async (): Promise<number> => {
    try {
      const ts = await AsyncStorage.getItem('backgroundEnterTime');
      if (!ts) return 0;
      const bgMillis = Number(ts);
      if (!Number.isFinite(bgMillis)) return 0;
      return (Date.now() - bgMillis) / 1000;
    } catch {
      console.error('⚠️ [AppStateProvider] 백그라운드 시간 계산 실패:');
      return 0;
    }
  }, []);

  /**
   * 서버에서 최신 사용자 데이터 동기화
   * 포인트 동기화: 다른 디바이스에서의 변경사항이나
   * 서버 측 보정을 반영하기 위해 서버 포인트로 동기화
   */
  const syncUserDataFromServer = useCallback(async (snapshot: SessionSnapshot) => {
    console.log('🔄 [AppStateProvider] Syncing user data from server');

    // 포인트 동기화
    try {
      const { point } = await pointService.getUserPoint();
      if (!isSessionCurrent(snapshot)) return;
      useUserStore.getState().setTotalPoint(point);
      console.log('[AppStateProvider] point sync completed');
    } catch {
      console.error('❌ [AppStateProvider] 포인트 동기화 실패:');
    }

    // TODO: 기타 사용자 데이터 동기화 (필요시 추가)
  }, []);

  /**
   * 시스템 권한 상태 확인
   */
  const checkSystemPermissions = useCallback(async () => {
    console.log('🔐 [AppStateProvider] Checking system permissions');
    // TODO: 위치 권한, 알림 권한 상태 확인
  }, []);

  /**
   * Unity 연동 상태 확인
   * 앱 업데이트 후 stale Unity 상태 감지 및 복구
   */
  const checkUnityConnection = useCallback(async () => {
    console.log('🎮 [AppStateProvider] Checking Unity connection...');

    try {
      const result = await unityService.recoverConnection();
      console.log('✅ [AppStateProvider] Unity connection checked:', result);
    } catch {
      console.error('❌ [AppStateProvider] Unity check failed:');
    }
  }, []);

  /**
   * 대기중인 작업들 처리
   */
  const handlePendingTasks = useCallback(async () => {
    console.log('📋 [AppStateProvider] Handling pending background tasks');
    // TODO: 백그라운드에서 실패한 API 호출 재시도 등
  }, []);

  const performForegroundTasks = useCallback(async (backgroundDuration: number, snapshot: SessionSnapshot) => {
    if (!isSessionCurrent(snapshot)) return;
    console.log('📋 [AppStateProvider] Handling pending background tasks');

    // ★ 5분 이상 백그라운드 시 Unity 상태 강제 리셋 + 아바타 재적용
    if (backgroundDuration > BACKGROUND_SYNC_THRESHOLD_SECONDS) {
      console.log('🎮 [AppStateProvider] 5분 이상 백그라운드 - Unity 상태 리셋');

      // 1. Store 상태 리셋 + Native 동기화
      await unityService.resetReadyAndResync();

      // 2. 사용자 데이터 동기화
      if (!isSessionCurrent(snapshot)) return;
      await syncUserDataFromServer(snapshot);
      if (!isSessionCurrent(snapshot)) return;

      // 3. Unity 재초기화 완료 후 아바타 재적용
      await unityService.runWhenReady(async () => {
        try {
          if (!isSessionCurrent(snapshot)) return;
          const currentState = useUserStore.getState();
          const items = Object.values(currentState.equippedItems).filter(
            (item): item is Item => !!item
          );
          const syncResult = await unityService.syncAvatar(items, currentState.hairColor, {
            waitForReady: false,
          });
          console.log(
            `✅ [AppStateProvider] 아바타 재적용 완료 (${items.length}개, result=${syncResult})`
          );
        } catch {
          console.error('❌ [AppStateProvider] 아바타 재적용 실패:');
        }
      }, { waitForAvatar: false, timeoutMs: 3000, forceReadyOnTimeout: true });
    }

    if (!isSessionCurrent(snapshot)) return;
    // 2. 시스템 권한 상태 재확인
    await checkSystemPermissions();

    // 3. Unity 연동 상태 확인 (앱 업데이트 후 stale 상태 감지/복구)
    await checkUnityConnection();

    // 4. 네트워크 상태 확인 및 대기중인 작업 처리
    await handlePendingTasks();
  }, [checkSystemPermissions, checkUnityConnection, handlePendingTasks, syncUserDataFromServer]);

  /**
   * 앱이 Foreground로 진입할 때 처리
   */
  const handleAppForeground = useCallback(async () => {
    if (!useAuthStore.getState().isLoggedIn) return;
    if (fgInFlight.current) {
      console.log('🛡️ [AppStateProvider] Foreground 작업이 이미 진행 중, 중복 호출 차단');
      return;
    }
    const snapshot = getSessionSnapshot();
    fgInFlight.current = true;
    try {
      console.log('🌅 [AppStateProvider] App entering foreground, performing comprehensive check');
      const backgroundDuration = await calculateBackgroundDuration();
      console.log('⏰ [AppStateProvider] App was in background for', Math.floor(backgroundDuration), 'seconds');

      if (backgroundDuration > BACKGROUND_SYNC_THRESHOLD_SECONDS) {
        console.log('🔍 [AppStateProvider] Long background duration, validating token');
        // TODO: 토큰 검증 로직 (SessionGuard.verifyOnForeground 등)
      }

      await performForegroundTasks(backgroundDuration, snapshot);
      if (!isSessionCurrent(snapshot)) return;
      await AsyncStorage.removeItem('backgroundEnterTime');
    } finally {
      fgInFlight.current = false;
    }
  }, [calculateBackgroundDuration, performForegroundTasks]);

  useEffect(() => {
    // ✅ 이미 초기화 완료 시 스킵 - 이중 상태 변경으로 인한 빠른 마운트/언마운트 방지
    if (hasInitialized.current) {
      console.log('🌍 [AppStateProvider] 이미 초기화됨, 스킵');
      return;
    }
    hasInitialized.current = true;

    console.log('🌍 [AppStateProvider] 앱 상태 관리 시작');

    // 초기화 - Loading 상태만 설정 (Loaded 전환은 AuthProvider에서 담당)
    setViewState(ViewState.Loading);

    // AppState 구독(단일 진입점)
    const unsubscribe = subscribeToAppLifecycle({
      onForeground: async () => {
        if (isLoggedInRef.current) {
          await handleAppForeground();
        }
      },
      onBackground: async () => {
        if (isLoggedInRef.current) {
          await handleAppBackground();
        }
      },
      setupTokenRefreshNotificationsOnce: () => {
        if (tokenSetupDone.current) return;
        tokenSetupDone.current = true;
        console.log('🔔 [AppStateProvider] 토큰 갱신 알림 시스템 설정 완료');
        // TODO: 실제 토큰 갱신 시스템 연동 시 Redux 액션이나 Context API 사용
      }
    });

    return () => {
      unsubscribe();
    };
  }, [handleAppBackground, handleAppForeground, isLoggedInRef, setViewState]);

  return <>{children}</>;
};
