/**
 * Authentication Service
 *
 * OAuth 로그인 (초기 토큰 획득) 담당
 *
 * 역할 분리:
 * - AuthenticationService: OAuth 로그인
 * - SilentTokenRefreshService: 토큰 갱신 + 재시도
 * - TokenRefreshInterceptor: 401 자동 처리 + 요청 큐
 */

import { authApiService } from './authApiService';
import { AuthProviderType } from '../models/AuthType';
import { type TokenDto, AuthenticationError } from '../models/UserAuthData';

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
   * OAuth 인증 코드를 사용해 JWT 토큰을 받아옵니다
   * Axios 기반 (authService 사용)
   * @param provider 인증 제공자 (GOOGLE | APPLE)
   * @param code OAuth 인증 코드
   * @returns Promise<TokenDto>
   */
  async getToken(provider: AuthProviderType, code: string): Promise<TokenDto> {
    const authId = Math.random().toString(36).substr(2, 9);

    console.log(`🔐 [AUTH-${authId}] ${provider} 토큰 요청 시작`);
    console.log(`   Provider: ${provider}`);


    const startTime = Date.now();

    try {
      // authApiService를 사용하여 토큰 요청
      const result = await authApiService.getOAuthToken(provider, code);

      const duration = Date.now() - startTime;

      console.log(`✅ [AUTH-${authId}] ${provider} 토큰 수신 성공 (${duration}ms)`);

      console.log(`   Access Token: ${result.accessToken ? '***' : 'null'}`);
      console.log(`   Refresh Token: ${result.refreshToken ? '***' : 'null'}`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Auth] OAuth request failed`, { provider, duration });
      throw AuthenticationError.networkError(error as Error);
    }
  }
}

// Singleton export
export const authenticationService = AuthenticationService.getInstance();