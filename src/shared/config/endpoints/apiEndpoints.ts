/**
 * API 엔드포인트 상수 정의
 * 모든 API 경로를 중앙에서 관리
 */

const API_VERSION = '/api/v1';

/**
 * 인증 관련 엔드포인트
 */
export const AUTH_ENDPOINTS = {
  // OAuth 로그인
  OAUTH_TOKEN: `${API_VERSION}/oauth/token`,

  // 토큰 관리
  REFRESH_TOKEN: `${API_VERSION}/auth/refresh`,
  LOGOUT: `${API_VERSION}/auth/logout`,

  // 사용자 인증 상태
  VERIFY_TOKEN: `${API_VERSION}/auth/verify`,
} as const;

/**
 * 사용자 관련 엔드포인트
 */
export const USER_ENDPOINTS = {
  // 기본 사용자 정보
  PROFILE: `${API_VERSION}/users/profile`,
  UPDATE_PROFILE: `${API_VERSION}/users/profile`,

  // 사용자 계정
  ACCOUNT: `${API_VERSION}/users/account`,
  DELETE_ACCOUNT: `${API_VERSION}/users/account`,

  // 사용자 설정
  SETTINGS: `${API_VERSION}/users/settings`,
} as const;

/**
 * 러닝 관련 엔드포인트
 */
export const RUNNING_ENDPOINTS = {
  // 러닝 기록 관리
  START: `${API_VERSION}/running/start`,
  END: `${API_VERSION}/running/end`,
  RECORDS: `${API_VERSION}/running/records`,
  RECORD_BY_ID: (id: number) => `${API_VERSION}/running/records/${id}`,

  // 러닝 기록 CRUD
  UPDATE_RECORD: (id: number) => `${API_VERSION}/running/records/${id}`,
  DELETE_RECORD: (id: number) => `${API_VERSION}/running/records/${id}`,

  // 러닝 통계
  STATISTICS: `${API_VERSION}/running/statistics`,
  WEEKLY_STATS: `${API_VERSION}/running/statistics/weekly`,
  MONTHLY_STATS: `${API_VERSION}/running/statistics/monthly`,
} as const;

/**
 * 아바타 관련 엔드포인트
 */
export const AVATAR_ENDPOINTS = {
  // 아바타 정보
  AVATAR: `${API_VERSION}/avatar`,
  UPDATE_AVATAR: `${API_VERSION}/avatar`,

  // 아이템 관리
  ITEMS: `${API_VERSION}/avatar/items`,
  USER_ITEMS: `${API_VERSION}/avatar/user-items`,
  PURCHASE_ITEM: `${API_VERSION}/avatar/items/purchase`,
  EQUIP_ITEM: `${API_VERSION}/avatar/items/equip`,
} as const;

/**
 * 포인트 관련 엔드포인트
 */
export const POINT_ENDPOINTS = {
  // 포인트 정보
  BALANCE: `${API_VERSION}/points/balance`,
  HISTORY: `${API_VERSION}/points/history`,

  // 포인트 적립/사용
  EARN: `${API_VERSION}/points/earn`,
  SPEND: `${API_VERSION}/points/spend`,
} as const;

/**
 * 신발 관련 엔드포인트
 */
export const SHOE_ENDPOINTS = {
  // 신발 관리
  SHOES: `${API_VERSION}/shoes`,
  SHOE_BY_ID: (id: number) => `${API_VERSION}/shoes/${id}`,

  // 신발 CRUD
  CREATE_SHOE: `${API_VERSION}/shoes`,
  UPDATE_SHOE: (id: number) => `${API_VERSION}/shoes/${id}`,
  DELETE_SHOE: (id: number) => `${API_VERSION}/shoes/${id}`,

  // 신발 통계
  SHOE_STATS: (id: number) => `${API_VERSION}/shoes/${id}/stats`,
} as const;

/**
 * 통계 관련 엔드포인트
 */
export const STATISTICS_ENDPOINTS = {
  // 전체 통계
  OVERVIEW: `${API_VERSION}/statistics/overview`,

  // 기간별 통계
  DAILY: `${API_VERSION}/statistics/daily`,
  WEEKLY: `${API_VERSION}/statistics/weekly`,
  MONTHLY: `${API_VERSION}/statistics/monthly`,
  YEARLY: `${API_VERSION}/statistics/yearly`,

  // 목표 관리
  GOALS: `${API_VERSION}/statistics/goals`,
  SET_GOAL: `${API_VERSION}/statistics/goals`,
  UPDATE_GOAL: (id: number) => `${API_VERSION}/statistics/goals/${id}`,
} as const;

/**
 * 모든 엔드포인트를 하나의 객체로 통합
 */
export const API_ENDPOINTS = {
  AUTH: AUTH_ENDPOINTS,
  USER: USER_ENDPOINTS,
  RUNNING: RUNNING_ENDPOINTS,
  AVATAR: AVATAR_ENDPOINTS,
  POINT: POINT_ENDPOINTS,
  SHOE: SHOE_ENDPOINTS,
  STATISTICS: STATISTICS_ENDPOINTS,
} as const;

/**
 * 엔드포인트 타입 정의
 */
export type ApiEndpoints = typeof API_ENDPOINTS;
export type AuthEndpoints = typeof AUTH_ENDPOINTS;
export type UserEndpoints = typeof USER_ENDPOINTS;
export type RunningEndpoints = typeof RUNNING_ENDPOINTS;
export type AvatarEndpoints = typeof AVATAR_ENDPOINTS;
export type PointEndpoints = typeof POINT_ENDPOINTS;
export type ShoeEndpoints = typeof SHOE_ENDPOINTS;
export type StatisticsEndpoints = typeof STATISTICS_ENDPOINTS;