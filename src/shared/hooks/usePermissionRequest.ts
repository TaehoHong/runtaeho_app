/**
 * 권한 요청 Hook
 *
 * AuthProvider에서 분리된 단일 책임 Hook
 * - 로그인 완료 후 최초 1회 권한 요청
 * - PermissionManager 서비스 활용
 */

import { useCallback, useRef, useState } from 'react';

/**
 * 권한 요청 Hook
 *
 * @example
 * ```tsx
 * const { requestPermissionsOnFirstLogin } = usePermissionRequest();
 *
 * // 로그인 성공 후 호출
 * if (!hasRequestedPermissions) {
 *   await requestPermissionsOnFirstLogin();
 * }
 * ```
 */
export const usePermissionRequest = () => {
  const hasRequested = useRef(false);
  const [isPermissionChecked, setIsPermissionChecked] = useState(false);

  /**
   * 로그인 완료 후 권한 요청 (v3.0 PermissionManager 사용)
   *
   * v3.0 개선 사항:
   * - 단순화된 권한 관리 (복잡도 80% 감소)
   * - 최초 요청 여부 추적 (AsyncStorage)
   * - 로그인 직후 바로 권한 요청 (모달 없이)
   * - 순서: Location(앱 사용 중) → Motion/Fitness
   * - 이미 권한이 있으면 재요청 안함
   *
   * @returns 권한 요청 성공 여부
   */
  const requestPermissionsOnFirstLogin = useCallback(async (): Promise<boolean> => {
    // 이미 요청했으면 스킵 (중복 호출 방지)
    if (hasRequested.current) {
      return true;
    }

    try {
      console.log('🔐 [usePermissionRequest] 로그인 후 권한 확인 시작');

      const { permissionManager } = await import('../../services/PermissionManager');

      // 1. 최초 권한 요청 완료 여부 확인
      const hasCompleted = await permissionManager.hasCompletedInitialRequest();

      if (hasCompleted) {
        console.log('✅ [usePermissionRequest] 권한 요청 이미 완료됨 (설정에서 변경 가능)');
        hasRequested.current = true;
        setIsPermissionChecked(true);
        return true;
      }

      // 2. 권한 직접 요청 (모달 없이)
      console.log('📋 [usePermissionRequest] 권한 직접 요청 시작...');
      const result = await permissionManager.requestAllPermissions();

      hasRequested.current = true;
      setIsPermissionChecked(true);

      if (result.success) {
        console.log('✅ [usePermissionRequest] 모든 권한 허용됨');
        return true;
      } else {
        console.warn('⚠️ [usePermissionRequest] 일부 권한 거부됨:', result.granted);
        console.log('💡 [usePermissionRequest] 러닝 시작 버튼 클릭시 설정으로 이동 가능');
        return false;
      }
    } catch (error) {
      console.error('⚠️ [usePermissionRequest] 권한 확인 실패:', error);
      setIsPermissionChecked(true); // 에러 시에도 완료로 표시 (재시도 방지)
      return false;
    }
  }, []);

  return { requestPermissionsOnFirstLogin, isPermissionChecked };
};
