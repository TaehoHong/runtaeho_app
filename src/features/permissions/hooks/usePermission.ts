/**
 * usePermission Hook
 *
 * 단일 권한 관리를 위한 Hook
 *
 * 사용 예시:
 * ```typescript
 * const { status, request, check, openSettings, isGranted, isDenied } =
 *   usePermission(PermissionType.LOCATION_FOREGROUND);
 *
 * // 권한 요청
 * await request();
 *
 * // 권한 상태 확인
 * if (!isGranted) {
 *   await request();
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { PermissionType, PermissionResult, PermissionStatus } from '../models/PermissionTypes';
import { PermissionManager } from '../services/PermissionManager';

export interface UsePermissionReturn {
  /**
   * 현재 권한 상태
   */
  status: PermissionStatus | null;

  /**
   * 권한 요청 중 여부
   */
  isRequesting: boolean;

  /**
   * 권한 확인 중 여부
   */
  isChecking: boolean;

  /**
   * 권한이 승인되었는지
   */
  isGranted: boolean;

  /**
   * 권한이 거부되었는지
   */
  isDenied: boolean;

  /**
   * 권한을 다시 물어볼 수 있는지
   */
  canAskAgain: boolean;

  /**
   * 마지막 업데이트 시간
   */
  timestamp: number | null;

  /**
   * 권한 요청
   */
  request: () => Promise<PermissionResult>;

  /**
   * 권한 상태 확인 (요청하지 않고)
   */
  check: () => Promise<PermissionResult>;

  /**
   * 설정 화면으로 이동
   */
  openSettings: () => Promise<void>;

  /**
   * 에러
   */
  error: Error | null;
}

/**
 * 단일 권한 관리 Hook
 */
export function usePermission(type: PermissionType): UsePermissionReturn {
  const [result, setResult] = useState<PermissionResult | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const manager = PermissionManager.getInstance();

  /**
   * 권한 요청
   */
  const request = useCallback(async (): Promise<PermissionResult> => {
    setIsRequesting(true);
    setError(null);

    try {
      const permissionResult = await manager.requestPermission(type);
      setResult(permissionResult);
      return permissionResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsRequesting(false);
    }
  }, [type, manager]);

  /**
   * 권한 상태 확인
   */
  const check = useCallback(async (): Promise<PermissionResult> => {
    setIsChecking(true);
    setError(null);

    try {
      const permissionResult = await manager.checkPermission(type);
      setResult(permissionResult);
      return permissionResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsChecking(false);
    }
  }, [type, manager]);

  /**
   * 설정 화면으로 이동
   */
  const openSettings = useCallback(async (): Promise<void> => {
    await manager.openSettings(type);
  }, [type, manager]);

  /**
   * 초기 상태 확인 (마운트 시)
   */
  useEffect(() => {
    // 캐시된 상태 먼저 확인
    const cachedStatus = manager.getPermissionStatus(type);
    if (cachedStatus) {
      setResult(cachedStatus);
    }

    // 실제 상태 확인
    check();
  }, [type, check, manager]);

  /**
   * PermissionManager 상태 구독
   */
  useEffect(() => {
    const unsubscribe = manager.subscribe((statuses) => {
      const permissionResult = statuses.get(type);
      if (permissionResult) {
        setResult(permissionResult);
      }
    });

    return unsubscribe;
  }, [type, manager]);

  return {
    status: result?.status ?? null,
    isRequesting,
    isChecking,
    isGranted: result?.status === PermissionStatus.GRANTED,
    isDenied: result?.status === PermissionStatus.DENIED,
    canAskAgain: result?.canAskAgain ?? false,
    timestamp: result?.timestamp ?? null,
    request,
    check,
    openSettings,
    error,
  };
}
