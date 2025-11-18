/**
 * Permission Strategy Interface
 *
 * Strategy Pattern 구현
 * 각 권한 타입별 요청/체크 로직을 캡슐화
 */

import {
  PermissionType,
  PermissionResult,
  PermissionStatus,
} from '../models/PermissionTypes';

/**
 * 모든 권한 전략이 구현해야 하는 인터페이스
 */
export interface IPermissionStrategy {
  /**
   * 권한 타입
   */
  readonly type: PermissionType;

  /**
   * 플랫폼 지원 여부 확인
   */
  isSupported(): boolean;

  /**
   * 현재 권한 상태 확인
   */
  checkPermission(): Promise<PermissionResult>;

  /**
   * 권한 요청
   */
  requestPermission(): Promise<PermissionResult>;

  /**
   * 설정 화면으로 이동
   * (권한 거부 시 사용자가 수동으로 변경할 수 있도록)
   */
  openSettings(): Promise<void>;

  /**
   * 권한 요청 전 rationale 표시 필요 여부
   * (Android의 shouldShowRequestPermissionRationale 개념)
   */
  shouldShowRationale(): Promise<boolean>;
}

/**
 * Abstract Base Class (공통 로직 추출)
 */
export abstract class BasePermissionStrategy implements IPermissionStrategy {
  abstract readonly type: PermissionType;

  abstract isSupported(): boolean;
  abstract checkPermission(): Promise<PermissionResult>;
  abstract requestPermission(): Promise<PermissionResult>;

  /**
   * 기본 설정 화면 열기 구현
   */
  async openSettings(): Promise<void> {
    const { Linking } = await import('react-native');
    await Linking.openSettings();
  }

  /**
   * 기본 rationale 표시 필요 여부 (false)
   */
  async shouldShowRationale(): Promise<boolean> {
    return false;
  }

  /**
   * Expo PermissionResponse를 PermissionResult로 변환
   */
  protected convertStatus(
    status: string,
    canAskAgain: boolean
  ): PermissionResult {
    let permissionStatus: PermissionStatus;

    switch (status) {
      case 'granted':
        permissionStatus = PermissionStatus.GRANTED;
        break;
      case 'denied':
        permissionStatus = PermissionStatus.DENIED;
        break;
      case 'undetermined':
        permissionStatus = PermissionStatus.UNDETERMINED;
        break;
      default:
        permissionStatus = PermissionStatus.DENIED;
    }

    return {
      type: this.type,
      status: permissionStatus,
      canAskAgain,
      timestamp: Date.now(),
    };
  }
}
