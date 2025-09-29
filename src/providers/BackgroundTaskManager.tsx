/**
 * 백그라운드 작업 관리자
 * AppStateProvider에서 백그라운드 작업 관련 기능만 분리
 */

import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useBackgroundTaskManager = () => {
  /**
   * 백그라운드 시간 계산
   * iOS calculateBackgroundDuration() 대응
   */
  const calculateBackgroundDuration = useCallback(async (): Promise<number> => {
    try {
      const backgroundTimeStr = await AsyncStorage.getItem('backgroundEnterTime');
      if (!backgroundTimeStr) return 0;

      const backgroundTime = new Date(backgroundTimeStr);
      const currentTime = new Date();
      return (currentTime.getTime() - backgroundTime.getTime()) / 1000;
    } catch (error) {
      console.error('⚠️ [BackgroundTaskManager] 백그라운드 시간 계산 실패:', error);
      return 0;
    }
  }, []);

  /**
   * 포그라운드 진입시 수행할 작업들
   * iOS performForegroundTasks() 대응
   */
  const performForegroundTasks = useCallback(async (backgroundDuration: number) => {
    console.log('📋 [BackgroundTaskManager] Handling pending background tasks');

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
  }, []);

  /**
   * 서버에서 최신 사용자 데이터 동기화
   * iOS syncUserDataFromServer() 대응
   */
  const syncUserDataFromServer = useCallback(async () => {
    console.log('🔄 [BackgroundTaskManager] Syncing user data from server');
    // TODO: UserService를 통한 사용자 데이터 조회 및 업데이트
  }, []);

  /**
   * 시스템 권한 상태 확인
   * iOS checkSystemPermissions() 대응
   */
  const checkSystemPermissions = useCallback(async () => {
    console.log('🔐 [BackgroundTaskManager] Checking system permissions');
    // TODO: 위치 권한, 알림 권한 상태 확인
  }, []);

  /**
   * Unity 연동 상태 확인
   * iOS checkUnityConnection() 대응
   */
  const checkUnityConnection = useCallback(() => {
    console.log('🎮 [BackgroundTaskManager] Unity connection status checked');
    // TODO: Unity 관련 상태 확인 로직
  }, []);

  /**
   * 대기중인 작업들 처리
   * iOS handlePendingTasks() 대응
   */
  const handlePendingTasks = useCallback(async () => {
    console.log('📋 [BackgroundTaskManager] Handling pending background tasks');
    // TODO: 백그라운드에서 실패한 API 호출 재시도 등
  }, []);

  /**
   * 백그라운드 진입 시간 저장
   */
  const saveBackgroundEnterTime = useCallback(async () => {
    try {
      await AsyncStorage.setItem('backgroundEnterTime', new Date().toISOString());
      console.log('💾 [BackgroundTaskManager] Background enter time saved');
    } catch (error) {
      console.error('⚠️ [BackgroundTaskManager] Failed to save background time:', error);
    }
  }, []);

  /**
   * 백그라운드 진입 시간 제거
   */
  const removeBackgroundEnterTime = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('backgroundEnterTime');
      console.log('🗑️ [BackgroundTaskManager] Background enter time removed');
    } catch (error) {
      console.error('⚠️ [BackgroundTaskManager] Failed to remove background time:', error);
    }
  }, []);

  return {
    calculateBackgroundDuration,
    performForegroundTasks,
    syncUserDataFromServer,
    checkSystemPermissions,
    checkUnityConnection,
    handlePendingTasks,
    saveBackgroundEnterTime,
    removeBackgroundEnterTime,
  };
};