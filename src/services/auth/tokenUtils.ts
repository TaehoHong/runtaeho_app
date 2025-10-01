/**
 * Token Utility
 * 기존 SilentTokenRefreshService를 간소화한 RN 스타일 유틸리티
 *
 * 토큰 검증, 갱신, 파싱 기능 제공
 */

import { authService } from './authService';
import { keychain } from '~/utils/keychain';
import { useUserStore } from '~/stores/user/userStore';

export type TokenStatus = 'valid' | 'expiringSoon' | 'expired' | 'noToken';

// 토큰 만료 전 갱신할 시간 (5분)
const TOKEN_REFRESH_THRESHOLD = 5 * 60; // seconds

/**
 * JWT 토큰 페이로드 파싱
 */
function parseToken(token: string): any {
  try {
    const components = token.split('.');
    if (components.length !== 3) return null;

    const payload = components[1];

    // Base64 URL 디코딩
    let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');

    const remainder = base64.length % 4;
    if (remainder > 0) {
      base64 = base64.padEnd(base64.length + 4 - remainder, '=');
    }

    const decoded = atob(base64);
    return JSON.parse(decoded);
  } catch (error) {
    console.error('[TokenUtils] Failed to parse token payload:', error);
    return null;
  }
}

/**
 * 토큰 상태 확인
 */
function checkTokenStatus(token: string | null): TokenStatus {
  if (!token) {
    return 'noToken';
  }

  const payload = parseToken(token);
  if (!payload || !payload.exp) {
    return 'expired';
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const expirationTime = payload.exp;
  const timeUntilExpiry = expirationTime - currentTime;

  if (timeUntilExpiry <= 0) {
    return 'expired';
  }

  if (timeUntilExpiry <= TOKEN_REFRESH_THRESHOLD) {
    return 'expiringSoon';
  }

  return 'valid';
}

/**
 * 토큰 남은 시간 (초)
 */
function getTokenRemainingTime(token: string | null): number | null {
  if (!token) return null;

  const payload = parseToken(token);
  if (!payload || !payload.exp) return null;

  const currentTime = Math.floor(Date.now() / 1000);
  const remainingTime = payload.exp - currentTime;

  return Math.max(0, remainingTime);
}

/**
 * 토큰 검증 및 필요시 갱신
 */
async function verifyAndRefreshTokens(): Promise<void> {
  const tokens = await keychain.loadTokens();
  const status = checkTokenStatus(tokens.accessToken);

  switch (status) {
    case 'valid':
      console.log('🟢 [TokenUtils] Token is valid');
      break;

    case 'expiringSoon':
      console.log('🟡 [TokenUtils] Token expiring soon, refreshing...');
      await refreshTokens();
      break;

    case 'expired':
      console.log('🔴 [TokenUtils] Token expired, refreshing...');
      await refreshTokens();
      break;

    case 'noToken':
      console.log('⚪ [TokenUtils] No token found, logging out');
      await useUserStore.getState().logout();
      await keychain.clearTokens();
      break;
  }
}

/**
 * 토큰 갱신
 */
async function refreshTokens(): Promise<void> {
  try {
    console.log('🔄 [TokenUtils] Starting token refresh');

    const newTokens = await authService.refreshToken();

    // Keychain에 저장
    await keychain.saveTokens(newTokens.accessToken, newTokens.refreshToken);

    // Zustand store 업데이트
    useUserStore.getState().setTokens({
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    });

    console.log('✅ [TokenUtils] Token refresh successful');
  } catch (error: any) {
    console.error('❌ [TokenUtils] Token refresh failed:', error);

    // 401/403 에러면 로그아웃 처리
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      console.log('🚪 [TokenUtils] Refresh token expired, logging out');
      await useUserStore.getState().logout();
      await keychain.clearTokens();
    }

    throw error;
  }
}

/**
 * Token Utils export
 */
export const tokenUtils = {
  parseToken,
  checkTokenStatus,
  getTokenRemainingTime,
  verifyAndRefreshTokens,
  refreshTokens,
};
