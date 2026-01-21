import { Platform as RNPlatform } from 'react-native';
import type { Platform } from './models/ForceUpdateState';

/**
 * 앱스토어/플레이스토어 URL
 * 실제 앱 ID로 교체 필요
 */
export const STORE_URLS = {
  IOS: 'https://apps.apple.com/app/runtaeho/id0000000000',
  ANDROID: 'https://play.google.com/store/apps/details?id=com.hongtaeho.app',
} as const;

/**
 * 강제 업데이트 설정
 */
export const FORCE_UPDATE_CONFIG = {
  /** 포그라운드 복귀 시 체크 debounce 시간 (ms) */
  DEBOUNCE_INTERVAL: 5 * 60 * 1000, // 5분
  /** API 타임아웃 (ms) */
  API_TIMEOUT: 10 * 1000, // 10초
} as const;

/**
 * 현재 플랫폼 가져오기
 */
export function getCurrentPlatform(): Platform {
  return RNPlatform.OS === 'ios' ? 'IOS' : 'ANDROID';
}

/**
 * 현재 플랫폼의 스토어 URL 가져오기
 */
export function getStoreUrl(): string {
  return STORE_URLS[getCurrentPlatform()];
}
