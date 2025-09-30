/**
 * Token Refresh Interceptor
 * Spring AOP/Interceptor 패턴을 모방한 토큰 갱신 관리 서비스
 * 모든 API 호출에서 자동으로 토큰 갱신 처리
 */

import { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { UserStateManager } from './userStateManager';
import { authenticationService } from '../../features/auth/services/AuthenticationService';

export interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

export class TokenRefreshInterceptor {
  private static instance: TokenRefreshInterceptor;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];

  private constructor() {}

  static getInstance(): TokenRefreshInterceptor {
    if (!TokenRefreshInterceptor.instance) {
      TokenRefreshInterceptor.instance = new TokenRefreshInterceptor();
    }
    return TokenRefreshInterceptor.instance;
  }

  /**
   * RTK Query baseQuery wrapper
   * 모든 API 호출을 가로채서 토큰 갱신 처리
   */
  createBaseQueryWithAuth = (baseQuery: BaseQueryFn): BaseQueryFn => {
    return async (args, api, extraOptions) => {
      // 1. 기본 요청 실행
      let result = await baseQuery(args, api, extraOptions);

      // 2. 401 오류가 아니면 정상 응답 반환
      if (!result.error || (result.error as FetchBaseQueryError).status !== 401) {
        return result;
      }

      console.log('🔄 [TokenInterceptor] 401 응답 감지, 토큰 갱신 시도');

      // 3. 이미 갱신 중이면 대기열에 추가
      if (this.isRefreshing) {
        return this.addToFailedQueue(args, api, extraOptions, baseQuery);
      }

      // 4. 토큰 갱신 수행
      const refreshResult = await this.refreshTokens();

      if (refreshResult.success) {
        console.log('✅ [TokenInterceptor] 토큰 갱신 성공, 원본 요청 재시도');

        // 5. 갱신 성공: 대기열 처리 및 원본 요청 재시도
        this.processFailedQueue(null);
        result = await baseQuery(args, api, extraOptions);
      } else {
        console.error('❌ [TokenInterceptor] 토큰 갱신 실패, 로그아웃 처리');

        // 6. 갱신 실패: 로그아웃 처리
        this.processFailedQueue(new Error('Token refresh failed'));
        await this.handleAuthFailure();

        // 로그아웃 상태 반영
        result = {
          error: {
            status: 401,
            data: { message: 'Authentication failed' }
          }
        };
      }

      return result;
    };
  };

  /**
   * 토큰 갱신 수행
   * UserStateManager를 통해 통합 관리
   */
  private async refreshTokens(): Promise<TokenRefreshResult> {
    if (this.isRefreshing) {
      console.log('⏳ [TokenInterceptor] 이미 토큰 갱신 중...');
      return { success: false, error: 'Already refreshing' };
    }

    this.isRefreshing = true;

    try {
      console.log('🔄 [TokenInterceptor] 토큰 갱신 시작');

      const userStateManager = UserStateManager.getInstance();
      const currentUserData = userStateManager.userData;

      if (!currentUserData?.refreshToken) {
        console.log('❌ [TokenInterceptor] Refresh token이 없음');
        return { success: false, error: 'No refresh token' };
      }

      // UserStateManager의 토큰 갱신 메서드 호출
      const success = await userStateManager.refreshTokens();

      if (success) {
        const updatedUserData = userStateManager.userData;
        console.log('✅ [TokenInterceptor] UserStateManager를 통한 토큰 갱신 성공');

        return {
          success: true,
          accessToken: updatedUserData?.accessToken,
          refreshToken: updatedUserData?.refreshToken
        };
      } else {
        console.log('❌ [TokenInterceptor] UserStateManager 토큰 갱신 실패');
        return { success: false, error: 'Refresh failed' };
      }

    } catch (error) {
      console.error('❌ [TokenInterceptor] 토큰 갱신 중 오류:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * 대기열에 요청 추가 (동시 요청 처리)
   */
  private addToFailedQueue(
    args: any,
    api: any,
    extraOptions: any,
    baseQuery: BaseQueryFn
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.failedQueue.push({
        resolve: async () => {
          try {
            const result = await baseQuery(args, api, extraOptions);
            resolve(result);
          } catch (err) {
            reject(err);
          }
        },
        reject
      });
    });
  }

  /**
   * 대기열 처리 (갱신 완료 후)
   */
  private processFailedQueue(error: Error | null): void {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(null);
      }
    });

    this.failedQueue = [];
  }

  /**
   * 인증 실패 처리 (로그아웃)
   */
  private async handleAuthFailure(): Promise<void> {
    try {
      console.log('🚪 [TokenInterceptor] 인증 실패, 로그아웃 처리');

      const userStateManager = UserStateManager.getInstance();
      await userStateManager.logout();

      // 추가적인 로그아웃 후 처리가 필요하면 여기에 추가
      // 예: 로그인 화면으로 리다이렉트, 알림 표시 등

    } catch (error) {
      console.error('❌ [TokenInterceptor] 로그아웃 처리 중 오류:', error);
    }
  }

  /**
   * 토큰 유효성 사전 검사
   * API 호출 전에 토큰 만료 여부를 미리 확인
   */
  async validateTokenBeforeRequest(): Promise<boolean> {
    const userStateManager = UserStateManager.getInstance();
    const userData = userStateManager.userData;

    if (!userData?.accessToken) {
      console.log('❌ [TokenInterceptor] Access token이 없음');
      return false;
    }

    // 토큰 만료 5분 전에 미리 갱신
    if (authenticationService.isTokenExpired(userData.accessToken)) {
      console.log('⏰ [TokenInterceptor] 토큰이 만료됨, 미리 갱신 시도');

      const refreshResult = await this.refreshTokens();
      return refreshResult.success;
    }

    return true;
  }

  /**
   * 인터셉터 상태 리셋
   * 테스트나 디버깅 용도
   */
  reset(): void {
    this.isRefreshing = false;
    this.failedQueue = [];
    console.log('🔄 [TokenInterceptor] 상태 리셋 완료');
  }
}

// Singleton export
export const tokenRefreshInterceptor = TokenRefreshInterceptor.getInstance();