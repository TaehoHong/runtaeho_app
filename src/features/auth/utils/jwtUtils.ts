/**
 * JWT 토큰 유틸리티 (통합)
 *
 * 비즈니스 로직 + 인프라 로직 통합
 * - 비즈니스: 약관 동의 확인 등
 * - 인프라: 토큰 갱신 판단, 만료 체크
 */

// ===== 타입 정의 =====

/**
 * JWT Payload 인터페이스
 */
export interface JWTPayload {
  userId: number;
  nickname: string;
  authority: string;
  isAgreedOnTerms: boolean;  // 약관 동의 여부
  exp: number;  // 만료 시각 (Unix timestamp)
  iat: number;  // 발급 시각 (Unix timestamp)
}

export const TokenStatus = {
  VALID: 1,
  SOON_EXPIRING: 2,
  EXPIRED: 3,
  NO_TOKEN: 4
} as const;

// ===== 내부 상수 =====

// 토큰 만료 전 갱신할 시간 (5분)
const TOKEN_REFRESH_THRESHOLD = 5 * 60; // seconds

// ===== 공통 파싱 =====

/**
 * JWT 토큰 페이로드 파싱 (Base64 URL-safe 지원)
 */
function parseToken(token: string): JWTPayload | null {
  try {
    const components = token.split('.');
    if (components.length !== 3) return null;

    const payload = components[1];

    if (payload == undefined) throw Error('payload is undefined');

    // Base64 URL 디코딩 (URL-safe 문자 변환 + 패딩 추가)
    let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');

    const remainder = base64.length % 4;
    if (remainder > 0) {
      base64 = base64.padEnd(base64.length + 4 - remainder, '=');
    }

    const decoded = atob(base64);
    return JSON.parse(decoded) as JWTPayload;
  } catch (error) {
    console.error('[jwtUtils] Failed to parse token payload:', error);
    return null;
  }
}

// ===== 비즈니스 로직 =====

/**
 * JWT 토큰 디코딩 (payload 추출)
 * @deprecated parseToken 사용 권장 (동일 기능)
 */
export const decodeJWT = (token: string): JWTPayload | null => {
  return parseToken(token);
};

/**
 * JWT 토큰에서 약관 동의 여부 확인
 *
 * @param token JWT 토큰
 * @returns 약관 동의 여부 (boolean)
 */
export const isAgreedOnTermsFromToken = (token: string): boolean => {
  const payload = parseToken(token);

  if (!payload) {
    return false;
  }

  return payload.isAgreedOnTerms ?? false;
};

// ===== 인프라 로직 =====

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
    console.error('❌ [jwtUtils] Failed to check token status:', error);
    return TokenStatus.EXPIRED;
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

// ===== Export =====

/**
 * Token Utils (인프라 로직용)
 */
export const tokenUtils = {
  verifyToken,
  parseToken,
  isTokenExpiringSoon,
  getTokenRemainingTime,
};
