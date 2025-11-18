/**
 * usePermissionStatus Hook
 *
 * 여러 권한 상태를 구독하는 Hook
 *
 * 사용 예시:
 * ```typescript
 * const statuses = usePermissionStatus([
 *   PermissionType.LOCATION_FOREGROUND,
 *   PermissionType.LOCATION_BACKGROUND,
 * ]);
 *
 * const foregroundGranted = statuses.get(PermissionType.LOCATION_FOREGROUND)?.status === PermissionStatus.GRANTED;
 * ```
 */

import { useState, useEffect } from 'react';
import { PermissionType, PermissionResult } from '../models/PermissionTypes';
import { PermissionManager } from '../services/PermissionManager';

/**
 * 여러 권한 상태 구독 Hook
 */
export function usePermissionStatus(
  types?: PermissionType[]
): Map<PermissionType, PermissionResult> {
  const [statuses, setStatuses] = useState<
    Map<PermissionType, PermissionResult>
  >(new Map());

  const manager = PermissionManager.getInstance();

  useEffect(() => {
    // PermissionManager 상태 구독
    const unsubscribe = manager.subscribe((allStatuses) => {
      if (types) {
        // 특정 권한들만 필터링
        const filteredStatuses = new Map<PermissionType, PermissionResult>();
        types.forEach((type) => {
          const status = allStatuses.get(type);
          if (status) {
            filteredStatuses.set(type, status);
          }
        });
        setStatuses(filteredStatuses);
      } else {
        // 모든 권한 상태 반환
        setStatuses(allStatuses);
      }
    });

    return unsubscribe;
  }, [types, manager]);

  return statuses;
}

/**
 * 단일 권한 상태만 구독하는 간단한 Hook
 */
export function useSinglePermissionStatus(
  type: PermissionType
): PermissionResult | null {
  const [status, setStatus] = useState<PermissionResult | null>(null);

  const manager = PermissionManager.getInstance();

  useEffect(() => {
    // 초기 상태
    const initialStatus = manager.getPermissionStatus(type);
    if (initialStatus) {
      setStatus(initialStatus);
    }

    // 상태 구독
    const unsubscribe = manager.subscribe((allStatuses) => {
      const permissionStatus = allStatuses.get(type);
      if (permissionStatus) {
        setStatus(permissionStatus);
      }
    });

    return unsubscribe;
  }, [type, manager]);

  return status;
}
