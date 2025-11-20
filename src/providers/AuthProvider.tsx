import { router } from 'expo-router';
import React, { type ReactNode, useCallback, useEffect, useState } from 'react';
import { useAppStore, ViewState } from '../stores/app/appStore';
import { useAuthStore } from '../features/auth/stores/authStore';
import { useAuth } from '../features/auth/hooks/useAuth';
import { PermissionRequestModal } from '../features/permissions/views/PermissionRequestModal';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * 인증 상태를 관리하고 로그인 상태에 따라 네비게이션을 제어하는 Provider
 *
 * 현업 표준 패턴:
 * - UserStateManager 제거
 * - useAuth hook으로 통합 인증 관리
 * - Zustand persist 자동 복원
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const setViewState = useAppStore((state) => state.setViewState);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const { verifyAndRefreshToken } = useAuth();
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [hasRequestedPermissions, setHasRequestedPermissions] = useState(false);
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  /**
   * 앱 시작 시 저장된 인증 상태 복원 및 오프라인 데이터 동기화
   *
   * 단순화된 로직:
   * 1. Zustand persist가 자동으로 AsyncStorage 복원
   * 2. SecureStorage 토큰 동기화
   * 3. 토큰 검증 (useAuth hook 사용)
   * 4. 오프라인 러닝 데이터 자동 동기화
   */
  const initializeAuthState = useCallback(async () => {
    try {
      console.log('🔍 [AuthProvider] 저장된 인증 상태 확인 중...');

      // 1. AuthStore에 SecureStorage 토큰 동기화
      const initializeTokens = useAuthStore.getState().initializeTokens;
      await initializeTokens();

      // 2. 토큰 검증 및 자동 갱신 (useAuth hook)
      const isTokenValid = await verifyAndRefreshToken();

      // 3. 로그인 상태이고 토큰이 유효하면 오프라인 데이터 동기화
      if (isTokenValid && useAuthStore.getState().isLoggedIn) {
        await syncOfflineRunningData();
      }

      console.log('✅ [AuthProvider] 인증 상태 복원 완료');
    } catch (error) {
      console.error('⚠️ [AuthProvider] 인증 상태 초기화 실패:', error);
    }
  }, [verifyAndRefreshToken]);

  /**
   * 오프라인 러닝 데이터 동기화
   *
   * 현재: 앱 시작 시 자동 동기화 (Option 1)
   * TODO: 네트워크 상태 감지 후 즉시 동기화로 업그레이드 (Option 2)
   * - @react-native-community/netinfo 설치
   * - NetInfo.addEventListener('connectionChange', syncOfflineRunningData)
   * - 실시간 네트워크 복구 감지 및 자동 업로드
   */
  const syncOfflineRunningData = async () => {
    try {
      const { offlineStorageService } = await import('../features/running/services/OfflineStorageService');
      const { runningService } = await import('../features/running/services/runningService');

      const pendingCount = await offlineStorageService.getPendingCount();
      const pendingSegmentCount = await offlineStorageService.getPendingSegmentCount();

      if (pendingCount === 0 && pendingSegmentCount === 0) {
        console.log('⚪ [AuthProvider] 동기화할 오프라인 데이터 없음');
        return;
      }

      // 1. 러닝 메인 기록 동기화
      if (pendingCount > 0) {
        console.log(`🔄 [AuthProvider] ${pendingCount}개의 오프라인 러닝 데이터 동기화 시작...`);

        const result = await offlineStorageService.retryAllPendingUploads(
          async (record) => {
            await runningService.endRunning(record);
          }
        );

        console.log(`✅ [AuthProvider] 오프라인 동기화 완료: 성공 ${result.success}, 실패 ${result.failed}`);

        if (result.failed > 0) {
          console.warn(`⚠️ [AuthProvider] ${result.failed}개의 데이터 동기화 실패 (재시도 대기 중)`);
        }
      }

      // 2. 세그먼트 동기화
      if (pendingSegmentCount > 0) {
        console.log(`🔄 [AuthProvider] ${pendingSegmentCount}개의 오프라인 세그먼트 동기화 시작...`);

        const segmentResult = await offlineStorageService.retryAllPendingSegmentUploads(
          async (runningRecordId, segments) => {
            const itemsForServer = segments.map(segment => ({
              distance: segment.distance,
              durationSec: segment.durationSec,
              cadence: segment.cadence,
              heartRate: segment.heartRate,
              minHeartRate: segment.heartRate,
              maxHeartRate: segment.heartRate,
              orderIndex: segment.orderIndex,
              startTimeStamp: segment.startTimestamp,
              endTimeStamp: segment.startTimestamp + segment.durationSec,
            }));

            await runningService.saveRunningRecordItems({
              runningRecordId,
              items: itemsForServer,
            });
          }
        );

        console.log(`✅ [AuthProvider] 세그먼트 동기화 완료: 성공 ${segmentResult.success}, 실패 ${segmentResult.failed}`);

        if (segmentResult.failed > 0) {
          console.warn(`⚠️ [AuthProvider] ${segmentResult.failed}개의 세그먼트 동기화 실패 (재시도 대기 중)`);
        }
      }
    } catch (error) {
      console.error('❌ [AuthProvider] 오프라인 데이터 동기화 실패:', error);
    }
  };

  useEffect(() => {
    console.log('🔐 [AuthProvider] 인증 상태 초기화 시작');
    initializeAuthState();

    // 네비게이션 준비 완료 표시 (Root Layout 마운트 대기)
    const timer = setTimeout(() => {
      setIsNavigationReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [initializeAuthState]);

  useEffect(() => {
    // 네비게이션이 준비되지 않았으면 대기
    if (!isNavigationReady) {
      console.log('⏳ [AuthProvider] 네비게이션 준비 대기 중...');
      return;
    }

    console.log('🔄 [AuthProvider] 로그인 상태 변경:', isLoggedIn);

    // 로그인 상태에 따라 네비게이션 제어
    try {
      if (isLoggedIn) {
        console.log('✅ [AuthProvider] 로그인 상태 - 메인 화면으로 이동');
        // ViewState를 Loaded로 설정하여 탭바 표시 보장
        setViewState(ViewState.Loaded);

        // 네비게이션 시도
        router.replace('/(tabs)/running');
        console.log('✅ [AuthProvider] 네비게이션 성공: /(tabs)');

        // iOS와 동일한 권한 요청 (로그인 완료 후 한 번만)
        // hasRequestedPermissions는 의존성 배열에서 제외하여 무한 루프 방지
        if (!hasRequestedPermissions) {
          requestPermissionsOnFirstLogin();
          setHasRequestedPermissions(true);
        }
      } else {
        console.log('❌ [AuthProvider] 로그아웃 상태 - 로그인 화면으로 이동');
        router.replace('/auth/login');
      }
    } catch (error) {
      console.warn('⚠️ [AuthProvider] 네비게이션 실패, 재시도 예약:', error);
      // 네비게이션 실패시 잠시 후 재시도
      setTimeout(() => {
        setIsNavigationReady(false);
        setTimeout(() => setIsNavigationReady(true), 200);
      }, 500);
    }
  }, [isLoggedIn, isNavigationReady, setViewState]);

  /**
   * 로그인 완료 후 권한 요청 (v3.0 PermissionManager 사용)
   *
   * v3.0 개선 사항:
   * - 단순화된 권한 관리 (복잡도 80% 감소)
   * - 최초 요청 여부 추적 (AsyncStorage)
   * - 모달로 권한 요청 화면 표시
   * - 모든 권한이 이미 허용된 경우 모달 표시하지 않음
   */
  const requestPermissionsOnFirstLogin = async () => {
    try {
      console.log('🔐 [AuthProvider] 로그인 후 권한 확인 시작');

      // v3.0 PermissionManager 사용
      const { permissionManager } = await import('../services/PermissionManager');

      // 1. 현재 권한 상태 확인
      const permissionCheck = await permissionManager.checkRequiredPermissions();

      if (permissionCheck.hasAllPermissions) {
        console.log('✅ [AuthProvider] 모든 권한이 이미 허용됨 - 모달 표시 안함');
        // 모든 권한이 허용되어 있으면 완료로 표시하고 모달 띄우지 않음
        await permissionManager.markInitialRequestComplete();
        return;
      }

      // 2. 최초 권한 요청 완료 여부 확인
      const hasCompleted = await permissionManager.hasCompletedInitialRequest();

      if (!hasCompleted) {
        console.log('📋 [AuthProvider] 권한 미허용 - 권한 요청 모달 표시');
        // 권한 요청 모달 표시
        setTimeout(() => {
          setShowPermissionModal(true);
        }, 800);
      } else {
        console.log('✅ [AuthProvider] 권한 요청 이미 완료됨 (일부 권한은 거부됨)');
      }
    } catch (error) {
      console.error('⚠️ [AuthProvider] 권한 확인 실패:', error);
    }
  };


  return (
    <>
      {children}
      <PermissionRequestModal
        visible={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
      />
    </>
  );
};
