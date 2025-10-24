/**
 * Authentication Service
 *
 * OAuth 플랫폼별 로직, 유틸리티 함수, 토큰 관리를 담당
 */

import { tokenStorage } from '~/utils/storage';
import { authApiService } from './authApiService';
import { useAuthStore } from '../stores/authStore';
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
    console.log(`   Code: ${code.substring(0, 20)}...${code.substring(code.length - 10)}`);

    const startTime = Date.now();

    try {
      // authApiService를 사용하여 토큰 요청
      const result = await authApiService.getOAuthToken(provider, code);

      const duration = Date.now() - startTime;

      useAuthStore.getState().setAccessToken(result.accessToken);
      useAuthStore.getState().setAccessToken(result.refreshToken);
      tokenStorage.saveTokens(result.accessToken, result.refreshToken)


      console.log(`✅ [AUTH-${authId}] ${provider} 토큰 수신 성공 (${duration}ms)`);
      console.log(`   User ID: ${result.userId}`);
      console.log(`   Access Token: ${result.accessToken ? '***' : 'null'}`);
      console.log(`   Refresh Token: ${result.refreshToken ? '***' : 'null'}`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [AUTH-${authId}] ${provider} 토큰 요청 실패 (${duration}ms):`, error);
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
      const result = await authApiService.refreshToken();

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