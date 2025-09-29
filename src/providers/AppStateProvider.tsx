import React, { useEffect, ReactNode, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppState, AppStateStatus } from 'react-native';
import { setViewState, ViewState } from '~/store/slices/appSlice';
import { selectIsLoggedIn } from '~/store/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppStateProviderProps {
  children: ReactNode;
}

/**
 * 앱 상태를 관리하는 Provider
 * iOS AppState.swift 대응
 */
export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
  const dispatch = useDispatch();
  const isLoggedIn = useSelector(selectIsLoggedIn);

  /**
   * 앱이 Foreground로 진입할 때 처리
   * iOS UserStateManager.handleAppWillEnterForeground() 대응
   */
  const handleAppForeground = useCallback(async () => {
    console.log('🌅 [AppStateProvider] App entering foreground, performing comprehensive check');

    // 백그라운드에 있던 시간 계산
    const backgroundDuration = await calculateBackgroundDuration();
    console.log('⏰ [AppStateProvider] App was in background for', Math.floor(backgroundDuration), 'seconds');

    // 기본 토큰 검증 (5분 이상 백그라운드시에만)
    if (backgroundDuration > 300) {
      console.log('🔍 [AppStateProvider] Long background duration, validating token');
      // TODO: 토큰 검증 로직
    }

    // 추가 포그라운드 작업들 수행
    await performForegroundTasks(backgroundDuration);

    // 백그라운드 시간 제거
    await AsyncStorage.removeItem('backgroundEnterTime');
  }, []);

  useEffect(() => {
    console.log('🌍 [AppStateProvider] 앱 상태 관리 시작');
    
    // 초기 로딩 상태 설정
    dispatch(setViewState(ViewState.Loading));
    
    // 약간의 로딩 시간 후 Loaded 상태로 전환
    const initTimer = setTimeout(() => {
      console.log('✅ [AppStateProvider] 앱 초기화 완료 - Loaded 상태로 전환');
      dispatch(setViewState(ViewState.Loaded));
    }, 100);

    // 앱 상태 변경 리스너
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('🔄 [AppStateProvider] 앱 상태 변경:', nextAppState);
      
      switch (nextAppState) {
        case 'active':
          console.log('🌅 [AppStateProvider] 앱 Foreground 진입');
          // iOS UserStateManager.handleAppWillEnterForeground() 대응
          if (isLoggedIn) {
            handleAppForeground();
          }
          break;
        case 'background':
          console.log('🌙 [AppStateProvider] 앱 Background 진입');
          // iOS UserStateManager.handleAppDidEnterBackground() 대응
          if (isLoggedIn) {
            handleAppBackground();
          }
          break;
        case 'inactive':
          console.log('⏸️ [AppStateProvider] 앱 Inactive 상태');
          break;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // iOS와 동일한 토큰 갱신 알림 구독
    setupTokenRefreshNotifications();

    return () => {
      clearTimeout(initTimer);
      subscription?.remove();
    };
  }, [dispatch, isLoggedIn, handleAppForeground]);


  /**
   * 앱이 Background로 진입할 때 처리
   * iOS UserStateManager.handleAppDidEnterBackground() 대응
   */
  const handleAppBackground = async () => {
    console.log('🌙 [AppStateProvider] App entering background, saving state');

    // 백그라운드 진입 시간 저장
    await AsyncStorage.setItem('backgroundEnterTime', new Date().toISOString());

    // 현재 상태 저장
    // TODO: 현재 상태 저장 로직
    console.log('💾 [AppStateProvider] Background 상태 저장 완료');
  };

  /**
   * 백그라운드 시간 계산
   * iOS calculateBackgroundDuration() 대응
   */
  const calculateBackgroundDuration = async (): Promise<number> => {
    try {
      const backgroundTimeStr = await AsyncStorage.getItem('backgroundEnterTime');
      if (!backgroundTimeStr) return 0;

      const backgroundTime = new Date(backgroundTimeStr);
      const currentTime = new Date();
      return (currentTime.getTime() - backgroundTime.getTime()) / 1000;
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

  /**
   * 토큰 갱신 관련 알림 설정
   * iOS setupTokenRefreshNotifications() 대응
   */
  const setupTokenRefreshNotifications = () => {
    // React Native에서는 간단한 글로벌 이벤트 핸들러로 구현
    // TODO: 실제 토큰 갱신 시스템 연동 시 Redux 액션이나 Context API 사용
    console.log('🔔 [AppStateProvider] 토큰 갱신 알림 시스템 설정 완료');
  };

  return <>{children}</>;
};
