/**
 * Authentication Service
 * Swift AuthenticationService.swift에서 마이그레이션
 *
 * OAuth 플랫폼별 로직, 유틸리티 함수, 토큰 관리를 담당
 * authentication-service.ts와 통합됨
 */

import { AuthProvider } from '../models/AuthProvider';
import { TokenDto, AuthenticationError, AUTH_PROVIDER_INFO } from '../models/auth-types';
import { authService } from '../../../services/auth/authService';

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
   * shared 별칭 (authentication-service.ts와의 호환성)
   */
  static get shared(): AuthenticationService {
    return AuthenticationService.getInstance();
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

  /**
   * OAuth 인증 코드를 사용해 JWT 토큰을 받아옵니다
   * Axios 기반 (authService 사용)
   * @param provider 인증 제공자 (GOOGLE | APPLE)
   * @param code OAuth 인증 코드
   * @returns Promise<TokenDto>
   */
  async getToken(provider: AuthProvider, code: string): Promise<TokenDto> {
    const authId = Math.random().toString(36).substr(2, 9);
    const providerName = AUTH_PROVIDER_INFO[provider].displayName;

    console.log(`🔐 [AUTH-${authId}] ${providerName} 토큰 요청 시작`);
    console.log(`   Provider: ${provider}`);
    console.log(`   Code: ${code.substring(0, 20)}...${code.substring(code.length - 10)}`);

    const startTime = Date.now();

    try {
      // authService를 사용하여 토큰 요청
      const result = await authService.getOAuthToken(provider, code);

      const duration = Date.now() - startTime;

      console.log(`✅ [AUTH-${authId}] ${providerName} 토큰 수신 성공 (${duration}ms)`);
      console.log(`   User ID: ${result.userId}`);
      console.log(`   Access Token: ${result.accessToken ? '***' : 'null'}`);
      console.log(`   Refresh Token: ${result.refreshToken ? '***' : 'null'}`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [AUTH-${authId}] ${providerName} 토큰 요청 실패 (${duration}ms):`, error);
      throw AuthenticationError.networkError(error as Error);
    }
  }

  /**
   * 리프레시 토큰을 사용해 새로운 JWT 토큰을 받아옵니다
   * Axios 기반 (authService 사용)
   * @returns Promise<TokenDto>
   */
  async refresh(): Promise<TokenDto> {
    const refreshId = Math.random().toString(36).substr(2, 9);

    console.log(`🔄 [AUTH-REFRESH-${refreshId}] 토큰 갱신 요청 시작`);

    const startTime = Date.now();

    try {
      // authService를 사용하여 토큰 갱신
      const result = await authService.refreshToken();

      const duration = Date.now() - startTime;

      console.log(`✅ [AUTH-REFRESH-${refreshId}] 토큰 갱신 성공 (${duration}ms)`);
      console.log(`   User ID: ${result.userId}`);
      console.log(`   Access Token: ${result.accessToken ? '***' : 'null'}`);
      console.log(`   Refresh Token: ${result.refreshToken ? '***' : 'null'}`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [AUTH-REFRESH-${refreshId}] 토큰 갱신 실패 (${duration}ms):`, error);
      throw AuthenticationError.networkError(error as Error);
    }
  }
}

// Singleton export
export const authenticationService = AuthenticationService.getInstance();