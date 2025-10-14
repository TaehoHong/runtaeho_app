import React, { useEffect, type ReactNode, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuthStore, useAppStore, ViewState } from '~/stores';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
 * iOS AppState.swift 대응
 */
export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
  const setViewState = useAppStore((state) => state.setViewState);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn); // ✅ AuthStore로 변경

  const isLoggedInRef = useLatestRef(isLoggedIn);
  const fgInFlight = useRef(false); // 포그라운드 재진입 가드
  const tokenSetupDone = useRef(false); // 토큰 알림 1회 설정 가드

  /**
   * 앱이 Foreground로 진입할 때 처리
   * iOS UserStateManager.handleAppWillEnterForeground() 대응
   */
  const handleAppForeground = useCallback(async () => {
    if (fgInFlight.current) {
      console.log('🛡️ [AppStateProvider] Foreground 작업이 이미 진행 중, 중복 호출 차단');
      return;
    }
    fgInFlight.current = true;
    try {
      console.log('🌅 [AppStateProvider] App entering foreground, performing comprehensive check');
      const backgroundDuration = await calculateBackgroundDuration();
      console.log('⏰ [AppStateProvider] App was in background for', Math.floor(backgroundDuration), 'seconds');

      if (backgroundDuration > BACKGROUND_SYNC_THRESHOLD_SECONDS) {
        console.log('🔍 [AppStateProvider] Long background duration, validating token');
        // TODO: 토큰 검증 로직 (SessionGuard.verifyOnForeground 등)
      }

      await performForegroundTasks(backgroundDuration);
      await AsyncStorage.removeItem('backgroundEnterTime');
    } finally {
      fgInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    console.log('🌍 [AppStateProvider] 앱 상태 관리 시작');

    // 초기화
    setViewState(ViewState.Loading);

    // 약간의 로딩 시간 후 Loaded 상태로 전환
    const initTimer = setTimeout(() => {
      console.log('✅ [AppStateProvider] 앱 초기화 완료 - Loaded 상태로 전환');
      setViewState(ViewState.Loaded);
    }, 100);

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
      clearTimeout(initTimer);
      unsubscribe();
    };
    // `isLoggedIn`으로 재구독이 발생하지 않도록 제외하고,
    // 최신 값은 isLoggedInRef.current로 참조합니다.
  }, [setViewState, handleAppForeground]);


  /**
   * 앱이 Background로 진입할 때 처리
   * iOS UserStateManager.handleAppDidEnterBackground() 대응
   */
  const handleAppBackground = async () => {
    console.log('🌙 [AppStateProvider] App entering background, saving state');
    await AsyncStorage.setItem('backgroundEnterTime', String(Date.now()));
    // TODO: 현재 상태 저장 로직
    console.log('💾 [AppStateProvider] Background 상태 저장 완료');
  };

  /**
   * 백그라운드 시간 계산
   * iOS calculateBackgroundDuration() 대응
   */
  const calculateBackgroundDuration = async (): Promise<number> => {
    try {
      const ts = await AsyncStorage.getItem('backgroundEnterTime');
      if (!ts) return 0;
      const bgMillis = Number(ts);
      if (!Number.isFinite(bgMillis)) return 0;
      return (Date.now() - bgMillis) / 1000;
    } catch (error) {
      console.error('⚠️ [AppStateProvider] 백그라운드 시간 계산 실패:', error);
      return 0;
    }
  };

  /**
   * 포그라운드 진입시 수행할 작업들
   * iOS performForegroundTasks() 대응
   */
  const performForegroundTasks = async (backgroundDuration: number) => {
    console.log('📋 [AppStateProvider] Handling pending background tasks');

    // 1. 사용자 데이터 동기화 (5분 이상 백그라운드시에만)
    if (backgroundDuration > 300) {
      await syncUserDataFromServer();
    }

    // 2. 시스템 권한 상태 재확인
    await checkSystemPermissions();

    // 3. Unity 연동 상태 확인 (필요시)
    checkUnityConnection();

    // 4. 네트워크 상태 확인 및 대기중인 작업 처리
    await handlePendingTasks();
  };

  /**
   * 서버에서 최신 사용자 데이터 동기화
   * iOS syncUserDataFromServer() 대응
   */
  const syncUserDataFromServer = async () => {
    console.log('🔄 [AppStateProvider] Syncing user data from server');
    // TODO: UserService를 통한 사용자 데이터 조회 및 업데이트
  };

  /**
   * 시스템 권한 상태 확인
   * iOS checkSystemPermissions() 대응
   */
  const checkSystemPermissions = async () => {
    console.log('🔐 [AppStateProvider] Checking system permissions');
    // TODO: 위치 권한, 알림 권한 상태 확인
  };

  /**
   * Unity 연동 상태 확인
   * iOS checkUnityConnection() 대응
   */
  const checkUnityConnection = () => {
    console.log('🎮 [AppStateProvider] Unity connection status checked');
    // TODO: Unity 관련 상태 확인 로직
  };

  /**
   * 대기중인 작업들 처리
   * iOS handlePendingTasks() 대응
   */
  const handlePendingTasks = async () => {
    console.log('📋 [AppStateProvider] Handling pending background tasks');
    // TODO: 백그라운드에서 실패한 API 호출 재시도 등
  };

  return <>{children}</>;
};
