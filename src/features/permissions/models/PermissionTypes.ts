/**
 * Permission Types & Status Models
 *
 * 확장성: 새로운 권한 추가 시 이 파일만 수정
 */

export enum PermissionType {
  LOCATION_FOREGROUND = 'LOCATION_FOREGROUND',
  LOCATION_BACKGROUND = 'LOCATION_BACKGROUND',
  NOTIFICATION = 'NOTIFICATION',
  MOTION = 'MOTION',
  HEALTH_KIT = 'HEALTH_KIT', // iOS HealthKit
  GOOGLE_FIT = 'GOOGLE_FIT', // Android Google Fit
}

export enum PermissionStatus {
  UNDETERMINED = 'undetermined',
  DENIED = 'denied',
  GRANTED = 'granted',
  RESTRICTED = 'restricted', // iOS only
}

/**
 * Permission Request Result
 */
export interface PermissionResult {
  type: PermissionType;
  status: PermissionStatus;
  canAskAgain: boolean;
  timestamp: number;
}

/**
 * Permission Error
 */
export class PermissionError extends Error {
  constructor(
    public type: PermissionType,
    public status: PermissionStatus,
    message: string
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * Permission Configuration
 * 각 권한의 메타데이터 (UI 표시용)
 */
export interface PermissionConfig {
  type: PermissionType;
  title: string;
  description: string;
  rationale: string; // 사용자에게 보여줄 권한 필요 이유
  isRequired: boolean; // 필수 권한 여부
  platform: 'ios' | 'android' | 'both';
}

/**
 * Permission Flow Configuration
 * 순차적 권한 요청 플로우 설정
 */
export interface PermissionFlowStep {
  permission: PermissionType;
  onDenied?: 'continue' | 'abort' | 'skip'; // 거부 시 동작
  retryable?: boolean; // 재시도 가능 여부
}

export interface PermissionFlow {
  id: string;
  name: string;
  steps: PermissionFlowStep[];
  description: string;
}
