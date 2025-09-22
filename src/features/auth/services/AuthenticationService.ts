/**
 * Authentication Service
 * Swift AuthenticationService.swift에서 마이그레이션
 *
 * 주의: React Native에서는 주로 RTK Query를 통해 API 호출을 하므로
 * 이 서비스는 OAuth 플랫폼별 특별한 로직이나 유틸리티 함수들을 위해 사용
 */

import { AuthProvider } from '../models/AuthProvider';

export class AuthenticationService {
  private static instance: AuthenticationService;

  private constructor() {}

  static getInstance(): AuthenticationService {
    if (!AuthenticationService.instance) {
      AuthenticationService.instance = new AuthenticationService();
    }
    return AuthenticationService.instance;
  }

  /**
   * OAuth 경로 매핑
   * Swift getOAuthPath(for:) 메서드와 동일한 로직
   */
  getOAuthPath(provider: AuthProvider): string {
    switch (provider) {
      case AuthProvider.GOOGLE:
        return '/auth/oauth/google';
      case AuthProvider.APPLE:
        return '/auth/oauth/apple';
      default:
        throw new Error(`Unsupported auth provider: ${provider}`);
    }
  }

  /**
   * 에러 메시지 매핑
   */
  getAuthErrorMessage(error: any): string {
    if (error?.status === 401) {
      return '인증이 만료되었습니다. 다시 로그인해주세요.';
    }
    if (error?.status === 403) {
      return '접근 권한이 없습니다.';
    }
    if (error?.status >= 500) {
      return '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
    if (error?.message) {
      return error.message;
    }
    return '로그인 중 오류가 발생했습니다.';
  }

  /**
   * 토큰 유효성 검사 (기본적인 형식 체크)
   */
  isValidToken(token: string): boolean {
    if (!token || token.trim().length === 0) {
      return false;
    }

    // JWT 토큰 기본 형식 검사 (3개 부분으로 구성)
    const parts = token.split('.');
    return parts.length === 3;
  }

  /**
   * 토큰 만료 시간 체크 (JWT 디코딩)
   */
  isTokenExpired(token: string): boolean {
    try {
      if (!this.isValidToken(token)) {
        return true;
      }

      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp;

      if (!exp) {
        return true;
      }

      // 현재 시간과 비교 (5분 버퍼 추가)
      const currentTime = Math.floor(Date.now() / 1000);
      const bufferTime = 5 * 60; // 5분

      return (exp - bufferTime) <= currentTime;
    } catch (error) {
      console.warn('Failed to parse token:', error);
      return true;
    }
  }
}

// Singleton export
export const authenticationService = AuthenticationService.getInstance();