/**
 * Permission Flow Configurations
 *
 * 선언적 권한 플로우 설정
 * 확장성: 새로운 플로우 추가 시 이 파일에 설정만 추가하면 됨
 */

import {
  PermissionType,
  PermissionFlow,
  PermissionConfig,
} from '../models/PermissionTypes';

/**
 * 권한별 메타데이터 (UI 표시용)
 */
export const PERMISSION_CONFIGS: Record<PermissionType, PermissionConfig> = {
  [PermissionType.LOCATION_FOREGROUND]: {
    type: PermissionType.LOCATION_FOREGROUND,
    title: '위치 권한',
    description: '러닝 기록을 위한 현재 위치 정보',
    rationale:
      '러닝 경로를 기록하고 거리를 측정하기 위해 위치 권한이 필요합니다.',
    isRequired: true,
    platform: 'both',
  },

  [PermissionType.LOCATION_BACKGROUND]: {
    type: PermissionType.LOCATION_BACKGROUND,
    title: '백그라운드 위치 권한',
    description: '앱이 백그라운드에서도 위치 추적',
    rationale:
      '화면이 꺼진 상태에서도 러닝을 계속 기록하기 위해 백그라운드 위치 권한이 필요합니다. 이 권한은 러닝 중에만 사용되며, 개인정보는 안전하게 보호됩니다.',
    isRequired: true,
    platform: 'both',
  },

  [PermissionType.NOTIFICATION]: {
    type: PermissionType.NOTIFICATION,
    title: '알림 권한',
    description: '러닝 알림 및 목표 달성 알림',
    rationale:
      '러닝 중 알림과 목표 달성 알림을 받기 위해 알림 권한이 필요합니다.',
    isRequired: false,
    platform: 'both',
  },

  [PermissionType.MOTION]: {
    type: PermissionType.MOTION,
    title: '모션 권한',
    description: '걸음 수 및 활동 감지',
    rationale: '더 정확한 러닝 데이터를 위해 모션 센서 접근이 필요합니다.',
    isRequired: false,
    platform: 'ios',
  },

  [PermissionType.HEALTH_KIT]: {
    type: PermissionType.HEALTH_KIT,
    title: 'HealthKit 권한',
    description: '심박수 및 건강 데이터',
    rationale:
      '심박수, 칼로리 등 건강 데이터를 기록하기 위해 HealthKit 접근이 필요합니다.',
    isRequired: false,
    platform: 'ios',
  },

  [PermissionType.GOOGLE_FIT]: {
    type: PermissionType.GOOGLE_FIT,
    title: 'Google Fit 권한',
    description: '심박수 및 건강 데이터',
    rationale:
      '심박수, 칼로리 등 건강 데이터를 기록하기 위해 Google Fit 접근이 필요합니다.',
    isRequired: false,
    platform: 'android',
  },
};

/**
 * 로그인 플로우: 필수 권한만 요청
 */
export const LOGIN_PERMISSION_FLOW: PermissionFlow = {
  id: 'login_flow',
  name: '로그인 권한 플로우',
  description: '로그인 시 필수 권한 요청 (Foreground Location)',
  steps: [
    {
      permission: PermissionType.LOCATION_FOREGROUND,
      onDenied: 'abort', // 거부 시 로그인 중단
      retryable: true,
    },
  ],
};

/**
 * 러닝 시작 플로우: Background Location + Notification
 */
export const RUNNING_START_PERMISSION_FLOW: PermissionFlow = {
  id: 'running_start_flow',
  name: '러닝 시작 권한 플로우',
  description: '러닝 시작 시 백그라운드 권한 요청',
  steps: [
    {
      permission: PermissionType.LOCATION_FOREGROUND,
      onDenied: 'abort', // Foreground 없으면 중단
      retryable: true,
    },
    {
      permission: PermissionType.LOCATION_BACKGROUND,
      onDenied: 'continue', // Background 거부해도 계속 (Foreground만으로 진행)
      retryable: true,
    },
    {
      permission: PermissionType.NOTIFICATION,
      onDenied: 'continue', // 알림 거부해도 계속
      retryable: false,
    },
  ],
};

/**
 * 전체 권한 요청 플로우: 모든 권한 요청 (설정 화면)
 */
export const FULL_PERMISSION_FLOW: PermissionFlow = {
  id: 'full_permission_flow',
  name: '전체 권한 플로우',
  description: '모든 권한 요청 (설정 화면)',
  steps: [
    {
      permission: PermissionType.LOCATION_FOREGROUND,
      onDenied: 'continue',
      retryable: true,
    },
    {
      permission: PermissionType.LOCATION_BACKGROUND,
      onDenied: 'continue',
      retryable: true,
    },
    {
      permission: PermissionType.NOTIFICATION,
      onDenied: 'continue',
      retryable: true,
    },
    {
      permission: PermissionType.MOTION,
      onDenied: 'continue',
      retryable: false,
    },
    {
      permission: PermissionType.HEALTH_KIT,
      onDenied: 'continue',
      retryable: false,
    },
    {
      permission: PermissionType.GOOGLE_FIT,
      onDenied: 'continue',
      retryable: false,
    },
  ],
};

/**
 * 권한 플로우 조회
 */
export const PERMISSION_FLOWS: Record<string, PermissionFlow> = {
  login: LOGIN_PERMISSION_FLOW,
  running_start: RUNNING_START_PERMISSION_FLOW,
  full: FULL_PERMISSION_FLOW,
};
