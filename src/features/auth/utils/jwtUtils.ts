/**
 * JWT 토큰 관련 유틸리티
 */

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

/**
 * JWT 토큰 디코딩 (payload 추출)
 *
 * @param token JWT 토큰
 * @returns JWT Payload
 */
export const decodeJWT = (token: string): JWTPayload | null => {
  try {
    // JWT는 "header.payload.signature" 형식
    const parts = token.split('.');

    if (parts.length !== 3) {
      console.error('❌ [JWT_UTILS] Invalid JWT format');
      return null;
    }

    // Payload는 두 번째 부분 (Base64 인코딩)
    const payload = parts[1];

    if (!payload) {
      console.error('❌ [JWT_UTILS] No payload found');
      return null;
    }

    // Base64 디코딩
    const decodedPayload = atob(payload);

    // JSON 파싱
    const parsed = JSON.parse(decodedPayload) as JWTPayload;

    return parsed;
  } catch (error) {
    console.error('❌ [JWT_UTILS] JWT 디코딩 실패:', error);
    return null;
  }
};

/**
 * JWT 토큰에서 약관 동의 여부 확인
 *
 * @param token JWT 토큰
 * @returns 약관 동의 여부 (boolean)
 */
export const isAgreedOnTermsFromToken = (token: string): boolean => {
  const payload = decodeJWT(token);

  if (!payload) {
    return false;
  }

  return payload.isAgreedOnTerms ?? false;
};

/**
 * JWT 토큰 만료 여부 확인
 *
 * @param token JWT 토큰
 * @returns 만료 여부 (true: 만료됨, false: 유효함)
 */
export const isTokenExpired = (token: string): boolean => {
  const payload = decodeJWT(token);

  if (!payload) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);  // 현재 시각 (Unix timestamp)

  return payload.exp < now;
};
