import { router } from 'expo-router';
import React, { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useAuthStore } from '../features/auth/stores/authStore';
import { ViewState, useAppStore } from '../stores/app/appStore';
import { isAgreedOnTermsFromToken } from '~/features/auth/utils/jwtUtils';
import { leagueService } from '../features/league/services/leagueService';
import type { LeagueResult } from '../features/league/models';

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
  const accessToken = useAuthStore((state) => state.accessToken);
  const { verifyAndRefreshToken } = useAuth();
  const [hasRequestedPermissions, setHasRequestedPermissions] = useState(false);
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [hasCheckedLeagueResult, setHasCheckedLeagueResult] = useState(false);
  const [pendingLeagueResult, setPendingLeagueResult] = useState<LeagueResult | null>(null);

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

      // 3. 로그인 상태이고 토큰이 유효하면 오프라인 데이터 동기화 및 리그 결과 확인
      if (isTokenValid && useAuthStore.getState().isLoggedIn) {
        await syncOfflineRunningData();

        // 4. 미확인 리그 결과 확인 (앱 첫 진입 시 결과 화면 표시용)
        await checkUncheckedLeagueResult();
      } else {
        // 로그인 안 된 상태면 리그 결과 확인 스킵
        setHasCheckedLeagueResult(true);
      }

      console.log('✅ [AuthProvider] 인증 상태 복원 완료');
    } catch (error) {
      console.error('⚠️ [AuthProvider] 인증 상태 초기화 실패:', error);
    }
  }, [verifyAndRefreshToken]);

  /**
   * 미확인 리그 결과 확인
   *
   * 앱 첫 진입 시 리그 결과가 있으면 결과 화면으로 바로 이동하기 위해
   * 미리 확인하여 상태에 저장해둠
   */
  const checkUncheckedLeagueResult = async () => {
    try {
      console.log('🏆 [AuthProvider] 미확인 리그 결과 확인 중...');
      const uncheckedResult = await leagueService.getUncheckedResult();

      if (uncheckedResult) {
        console.log('🏆 [AuthProvider] 미확인 리그 결과 발견:', uncheckedResult.resultStatus);
        setPendingLeagueResult(uncheckedResult);
      } else {
        console.log('🏆 [AuthProvider] 미확인 리그 결과 없음');
      }

      setHasCheckedLeagueResult(true);
    } catch (error) {
      console.log('⚠️ [AuthProvider] 리그 결과 확인 실패 (무시):', error);
      // 리그 미참가 또는 네트워크 오류 시 무시하고 계속 진행
      setHasCheckedLeagueResult(true);
    }
  };

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

  /**
   * 로그인 상태 변경 시 리그 결과 확인
   * - 새로 로그인한 경우에도 리그 결과를 확인해야 함
   */
  useEffect(() => {
    const checkLeagueResultOnLogin = async () => {
      // 로그인 상태이고 아직 리그 결과를 확인하지 않았으면 확인
      if (isLoggedIn && !hasCheckedLeagueResult) {
        console.log('🏆 [AuthProvider] 로그인 상태 변경 감지 → 리그 결과 확인');
        await checkUncheckedLeagueResult();
      }
    };

    checkLeagueResultOnLogin();
  }, [isLoggedIn, hasCheckedLeagueResult]);

  /**
   * 인증 상태에 따른 네비게이션 제어
   *
   * 의존성:
   * - isLoggedIn: 로그인 여부
   * - accessToken: 토큰 변경 감지 (약관 동의 후 토큰 재발행 시 필수)
   * - isNavigationReady: 네비게이션 준비 완료 여부
   * - hasCheckedLeagueResult: 리그 결과 확인 완료 여부
   * - pendingLeagueResult: 미확인 리그 결과
   *
   * 플로우:
   * 1. 로그인 → isLoggedIn=true, 약관 미동의 토큰 → /auth/terms-agreement
   * 2. 약관 동의 완료 → 토큰 재발행 (isAgreedOnTerms=true) → accessToken 변경 → useEffect 재실행
   * 3. 새 토큰 확인 → isAgreedOnTerms=true
   * 4. 미확인 리그 결과 있으면 → /league/result
   * 5. 미확인 리그 결과 없으면 → /(tabs)/running
   */
  useEffect(() => {
    console.log('🔄 [AuthProvider] useEffect 실행 - isLoggedIn:', isLoggedIn, 'hasToken:', !!accessToken, 'isNavigationReady:', isNavigationReady, 'hasCheckedLeagueResult:', hasCheckedLeagueResult);

    // 네비게이션이 준비되지 않았으면 대기
    if (!isNavigationReady) {
      console.log('⏳ [AuthProvider] 네비게이션 준비 대기 중...');
      return;
    }

    console.log('🔄 [AuthProvider] 인증 상태 확인 - isLoggedIn:', isLoggedIn, 'hasToken:', !!accessToken);

    // 로그인 상태에 따라 네비게이션 제어
    try {
      if (isLoggedIn) {
        // 토큰에서 약관 동의 여부 확인
        const accessToken = useAuthStore.getState().accessToken;

        if (accessToken) {
          const isAgreedOnTerms = isAgreedOnTermsFromToken(accessToken);

          if (!isAgreedOnTerms) {
            // 약관 미동의 → 약관 동의 화면으로
            console.log('📄 [AuthProvider] 약관 미동의 → 약관 동의 화면으로 이동');
            router.replace('/auth/terms-agreement');
            return;
          }
        }

        // 리그 결과 확인이 완료될 때까지 대기
        if (!hasCheckedLeagueResult) {
          console.log('⏳ [AuthProvider] 리그 결과 확인 대기 중...');
          return;
        }

        // ViewState를 Loaded로 설정하여 탭바 표시 보장
        setViewState(ViewState.Loaded);

        // 미확인 리그 결과가 있으면 결과 화면으로 먼저 이동
        if (pendingLeagueResult) {
          console.log('🏆 [AuthProvider] 미확인 리그 결과 있음 → 결과 화면으로 이동');
          router.replace({
            pathname: '/league/result' as const,
            params: { resultData: JSON.stringify(pendingLeagueResult) },
          } as any);
          // 한 번 이동 후 상태 초기화 (중복 이동 방지)
          setPendingLeagueResult(null);
        } else {
          console.log('✅ [AuthProvider] 로그인 상태 - 메인 화면으로 이동');
          router.replace('/(tabs)/running');
          console.log('✅ [AuthProvider] 네비게이션 성공: /(tabs)');
        }

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
  }, [isLoggedIn, accessToken, isNavigationReady, hasCheckedLeagueResult, pendingLeagueResult, setViewState]);

  /**
   * 로그인 완료 후 권한 요청 (v3.0 PermissionManager 사용)
   *
   * v3.0 개선 사항:
   * - 단순화된 권한 관리 (복잡도 80% 감소)
   * - 최초 요청 여부 추적 (AsyncStorage)
   * - 로그인 직후 바로 권한 요청 (모달 없이)
   * - 순서: Location(Foreground) → Location(Background) → Motion/Fitness
   * - 이미 권한이 있으면 재요청 안함
   */
  const requestPermissionsOnFirstLogin = async () => {
    try {
      console.log('🔐 [AuthProvider] 로그인 후 권한 확인 시작');

      // v3.0 PermissionManager 사용
      const { permissionManager } = await import('../services/PermissionManager');

      // 1. 최초 권한 요청 완료 여부 확인
      const hasCompleted = await permissionManager.hasCompletedInitialRequest();

      if (hasCompleted) {
        console.log('✅ [AuthProvider] 권한 요청 이미 완료됨 (설정에서 변경 가능)');
        return;
      }

      // 2. 권한 직접 요청 (모달 없이)
      console.log('📋 [AuthProvider] 권한 직접 요청 시작...');
      const result = await permissionManager.requestAllPermissions();

      if (result.success) {
        console.log('✅ [AuthProvider] 모든 권한 허용됨');
      } else {
        console.warn('⚠️ [AuthProvider] 일부 권한 거부됨:', result.granted);
        console.log('💡 [AuthProvider] 러닝 시작 버튼 클릭시 설정으로 이동 가능');
      }
    } catch (error) {
      console.error('⚠️ [AuthProvider] 권한 확인 실패:', error);
    }
  };


  return <>{children}</>;
};
