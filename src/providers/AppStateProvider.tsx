import React, { useEffect, type ReactNode, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import { useAppStore, ViewState } from '~/stores';
import { useAuthStore } from '~/features';
import { useUserStore } from '~/stores/user/userStore';
import { useUnityStore } from '~/stores/unity/unityStore';
import { pointService } from '~/features/point/services/pointService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UnityBridge } from '~/features/unity/bridge/UnityBridge';
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
   * 앱이 Foreground로 진입할 때 처리
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
    // ✅ 의존성 배열 정리 - 초기화는 1회만 실행
  }, []);


  /**
   * 앱이 Background로 진입할 때 처리
   */
  const handleAppBackground = async () => {
    console.log('🌙 [AppStateProvider] App entering background, saving state');
    await AsyncStorage.setItem('backgroundEnterTime', String(Date.now()));
    // TODO: 현재 상태 저장 로직
    console.log('💾 [AppStateProvider] Background 상태 저장 완료');
  };

  /**
   * 백그라운드 시간 계산
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
  const performForegroundTasks = async (backgroundDuration: number) => {
    console.log('📋 [AppStateProvider] Handling pending background tasks');

    // ★ 5분 이상 백그라운드 시 Unity 상태 강제 리셋 + 아바타 재적용
    if (backgroundDuration > BACKGROUND_SYNC_THRESHOLD_SECONDS) {
      console.log('🎮 [AppStateProvider] 5분 이상 백그라운드 - Unity 상태 리셋');

      // 1. Store 상태 리셋 + Native 동기화 (isGameObjectReady, isAvatarReady 모두 false로)
      // ★ 핵심 수정: Store만 리셋하는 대신 Native와 동기화하는 메서드 사용
      await UnityBridge.resetGameObjectReady();

      // 2. 사용자 데이터 동기화
      await syncUserDataFromServer();

      // 3. ★ Unity 재초기화 완료 후 아바타 재적용
      const unsubscribe = unityService.onReady(async () => {
        try {
          const currentState = useUserStore.getState();
          const items = Object.values(currentState.equippedItems).filter(
            (item): item is Item => !!item
          );
          if (items.length > 0) {
            await unityService.changeAvatar(items, currentState.hairColor);
            console.log(`✅ [AppStateProvider] 아바타 재적용 완료 (${items.length}개)`);
          }
        } catch (error) {
          console.error('❌ [AppStateProvider] 아바타 재적용 실패:', error);
        }
        // 1회성 콜백이므로 구독 해제
        unsubscribe();
      });
    }

    // 2. 시스템 권한 상태 재확인
    await checkSystemPermissions();

    // 3. Unity 연동 상태 확인 (앱 업데이트 후 stale 상태 감지/복구)
    await checkUnityConnection();

    // 4. 네트워크 상태 확인 및 대기중인 작업 처리
    await handlePendingTasks();
  };

  /**
   * 서버에서 최신 사용자 데이터 동기화
   * 포인트 동기화: 다른 디바이스에서의 변경사항이나
   * 서버 측 보정을 반영하기 위해 서버 포인트로 동기화
   */
  const syncUserDataFromServer = async () => {
    console.log('🔄 [AppStateProvider] Syncing user data from server');

    // 포인트 동기화
    try {
      const { point } = await pointService.getUserPoint();
      useUserStore.getState().setTotalPoint(point);
      console.log(`💰 [AppStateProvider] 포인트 동기화 완료: ${point}`);
    } catch (error) {
      console.error('❌ [AppStateProvider] 포인트 동기화 실패:', error);
    }

    // TODO: 기타 사용자 데이터 동기화 (필요시 추가)
  };

  /**
   * 시스템 권한 상태 확인
   */
  const checkSystemPermissions = async () => {
    console.log('🔐 [AppStateProvider] Checking system permissions');
    // TODO: 위치 권한, 알림 권한 상태 확인
  };

  /**
   * Unity 연동 상태 확인
   * 앱 업데이트 후 stale Unity 상태 감지 및 복구
   */
  const checkUnityConnection = async () => {
    // iOS에서만 Unity 상태 확인
    if (Platform.OS !== 'ios') {
      console.log('🎮 [AppStateProvider] Unity check skipped (non-iOS)');
      return;
    }

    console.log('🎮 [AppStateProvider] Checking Unity connection...');

    try {
      // Unity 상태 유효성 검사
      const isValid = await UnityBridge.validateUnityState();

      if (!isValid) {
        console.warn('⚠️ [AppStateProvider] Stale Unity state detected, resetting...');
        await UnityBridge.forceResetUnity();
        console.log('✅ [AppStateProvider] Unity reset completed');
      } else {
        console.log('✅ [AppStateProvider] Unity state is valid');
      }

      // ★ 핵심 수정: Unity valid 여부와 관계없이 Store 동기화
      // 포그라운드 복귀 시 Native와 JS Store 상태를 항상 동기화
      await UnityBridge.syncReadyState();
      console.log('✅ [AppStateProvider] Unity state synced');
    } catch (error) {
      console.error('❌ [AppStateProvider] Unity check failed:', error);
    }
  };

  /**
   * 대기중인 작업들 처리
   */
  const handlePendingTasks = async () => {
    console.log('📋 [AppStateProvider] Handling pending background tasks');
    // TODO: 백그라운드에서 실패한 API 호출 재시도 등
  };

  return <>{children}</>;
};
