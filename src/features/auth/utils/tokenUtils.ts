/**
 * Token Utility
 * 기존 SilentTokenRefreshService를 간소화한 RN 스타일 유틸리티
 *
 * 토큰 검증, 갱신, 파싱 기능 제공
 */


export const TokenStatus = {
  VALID: 1, 
  SOON_EXPIRING: 2,
  EXPIRED: 3,
  NO_TOKEN: 4
} as const

// 토큰 만료 전 갱신할 시간 (5분)
const TOKEN_REFRESH_THRESHOLD = 5 * 60; // seconds

function verifyToken(token: string): typeof TokenStatus[keyof typeof TokenStatus] {
  try {
    const payload = parseToken(token);
    if (!payload || !payload.exp) {
      return TokenStatus.EXPIRED;
    }
    
    const currentTime = Date.now() / 1000;
    const expirationTime = payload.exp;
    const timeUntilExpiry = expirationTime - currentTime;
    
    if (timeUntilExpiry <= 0) {
      return TokenStatus.EXPIRED;
    }
    
    if (timeUntilExpiry <= TOKEN_REFRESH_THRESHOLD) {
      return TokenStatus.SOON_EXPIRING;
    }
    
    return TokenStatus.VALID;
  } catch (error) {
    console.error('❌ [SilentTokenRefreshService] Failed to check token status:', error);
    return TokenStatus.EXPIRED;
  }
}

/**
 * JWT 토큰 페이로드 파싱
 */
function parseToken(token: string): any {
  try {
    const components = token.split('.');
    if (components.length !== 3) return null;

    const payload = components[1];

    if(payload == undefined) throw Error('payload is undefined')

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

function isTokenExpiringSoon(token: string, thresholdSeconds: number = 300): boolean {
  const remainingTime = getTokenRemainingTime(token);
  return remainingTime > 0 && remainingTime <= thresholdSeconds;
}

/**
 * 토큰 남은 시간 (초)
 */
function getTokenRemainingTime(token: string): number {

  const payload = parseToken(token);
  if (!payload || !payload.exp) return 0;

  const currentTime = Math.floor(Date.now() / 1000);
  const remainingTime = payload.exp - currentTime;

  return Math.max(0, remainingTime);
}

/**
 * Token Utils export
 */
export const tokenUtils = {
  verifyToken,
  parseToken,
  isTokenExpiringSoon,
  getTokenRemainingTime,
};
