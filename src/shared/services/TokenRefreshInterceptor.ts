/**
 * Token Refresh Interceptor
 * Spring AOP/Interceptor 패턴을 모방한 토큰 갱신 관리 서비스
 * 모든 API 호출에서 자동으로 토큰 갱신 처리
 */

import { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { UserStateManager } from './userStateManager';
import { SilentTokenRefreshService } from '../../features/auth/services/SilentTokenRefreshService';

export interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  args: FetchArgs;
  api: any;
  extraOptions: any;
}

// 토큰 갱신 전 대기 시간 (초)
const TOKEN_REFRESH_THRESHOLD_SECONDS = 5 * 60; // 5분

export class TokenRefreshInterceptor {
  private static instance: TokenRefreshInterceptor;
  private isRefreshing = false;
  private failedQueue: PendingRequest[] = [];
  private silentTokenRefreshService: SilentTokenRefreshService;

  private constructor() {
    this.silentTokenRefreshService = SilentTokenRefreshService.getInstance();
  }

  static getInstance(): TokenRefreshInterceptor {
    if (!TokenRefreshInterceptor.instance) {
      TokenRefreshInterceptor.instance = new TokenRefreshInterceptor();
    }
    return TokenRefreshInterceptor.instance;
  }

  /**
   * 타입 가드: FetchBaseQueryError 여부 확인
   */
  private isFetchBaseQueryError(error: unknown): error is FetchBaseQueryError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'status' in error
    );
  }

  /**
   * RTK Query baseQuery wrapper
   * 모든 API 호출을 가로채서 토큰 갱신 처리
   */
  createBaseQueryWithAuth = <
    Args = FetchArgs,
    Result = unknown,
    Error = FetchBaseQueryError,
    DefinitionExtraOptions = {},
    Meta = {}
  >(
    baseQuery: BaseQueryFn<Args, Result, Error, DefinitionExtraOptions, Meta>
  ): BaseQueryFn<Args, Result, Error, DefinitionExtraOptions, Meta> => {
    return async (args, api, extraOptions) => {
      // 1. 토큰 사전 검증 (만료 임박 시 미리 갱신)
      await this.validateAndRefreshIfNeeded();

      // 2. 기본 요청 실행
      let result = await baseQuery(args, api, extraOptions);

      // 3. 401 오류가 아니면 정상 응답 반환
      if (!result.error || !this.isFetchBaseQueryError(result.error) || result.error.status !== 401) {
        return result;
      }

      console.log('🔄 [TokenInterceptor] 401 응답 감지, 토큰 갱신 시도');

      // 4. 이미 갱신 중이면 대기열에 추가
      if (this.isRefreshing) {
        return this.addToFailedQueue(args, api, extraOptions, baseQuery);
      }

      // 5. 토큰 갱신 수행
      const refreshResult = await this.refreshTokens();

      if (refreshResult.success) {
        console.log('✅ [TokenInterceptor] 토큰 갱신 성공, 원본 요청 재시도');

        // 6. 갱신 성공: 대기열 처리 및 원본 요청 재시도
        await this.processFailedQueue(baseQuery);
        result = await baseQuery(args, api, extraOptions);
      } else {
        console.error('❌ [TokenInterceptor] 토큰 갱신 실패, 로그아웃 처리');

        // 7. 갱신 실패: 로그아웃 처리
        this.clearFailedQueue(new Error('Token refresh failed'));
        await this.handleAuthFailure();

        // 로그아웃 상태 반영
        result = {
          error: {
            status: 401,
            data: { message: 'Authentication failed' }
          } as FetchBaseQueryError
        } as any;
      }

      return result;
    };
  };

  /**
   * 토큰 사전 검증 및 필요 시 갱신
   * API 호출 전에 토큰 만료 여부를 미리 확인하고 갱신
   */
  private async validateAndRefreshIfNeeded(): Promise<void> {
    try {
      const userStateManager = UserStateManager.getInstance();
      const accessToken = userStateManager.accessToken;

      if (!accessToken) {
        return; // 로그인하지 않은 상태
      }

      // 토큰이 곧 만료될 예정이면 미리 갱신
      if (this.silentTokenRefreshService.isTokenExpiringSoon(accessToken, TOKEN_REFRESH_THRESHOLD_SECONDS)) {
        console.log('⏰ [TokenInterceptor] 토큰 만료 임박, 사전 갱신 시도');
        
        // 이미 갱신 중이면 대기
        if (this.isRefreshing) {
          await this.waitForRefresh();
          return;
        }

        await this.refreshTokens();
      }
    } catch (error) {
      console.error('❌ [TokenInterceptor] 토큰 사전 검증 중 오류:', error);
      // 사전 검증 실패는 무시하고 진행 (실제 401 응답 시 처리)
    }
  }

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
      const currentRefreshToken = userStateManager.refreshToken;

      if (!currentRefreshToken) {
        console.log('❌ [TokenInterceptor] Refresh token이 없음');
        return { success: false, error: 'No refresh token' };
      }

      // SilentTokenRefreshService를 통한 토큰 갱신
      const tokenPair = await this.silentTokenRefreshService.performSilentRefresh();

      if (tokenPair) {
        // UserStateManager에 새 토큰 저장
        await userStateManager.setTokens(tokenPair.accessToken, tokenPair.refreshToken);
        
        console.log('✅ [TokenInterceptor] 토큰 갱신 및 저장 성공');

        return {
          success: true,
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken
        };
      } else {
        console.log('❌ [TokenInterceptor] 토큰 갱신 실패');
        return { success: false, error: 'Refresh failed' };
      }

    } catch (error) {
      console.error('❌ [TokenInterceptor] 토큰 갱신 중 오류:', error);
      
      // RefreshTokenExpired 에러는 로그아웃 필요
      if (error instanceof Error && error.message === 'RefreshTokenExpired') {
        await this.handleAuthFailure();
      }
      
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
  private addToFailedQueue<Args, Result, Error, DefinitionExtraOptions, Meta>(
    args: Args,
    api: any,
    extraOptions: DefinitionExtraOptions,
    baseQuery: BaseQueryFn<Args, Result, Error, DefinitionExtraOptions, Meta>
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.failedQueue.push({
        resolve,
        reject,
        args: args as any,
        api,
        extraOptions
      });
    });
  }

  /**
   * 대기열 처리 (갱신 성공 후)
   * 대기 중이던 모든 요청을 재시도
   */
  private async processFailedQueue<Args, Result, Error, DefinitionExtraOptions, Meta>(
    baseQuery: BaseQueryFn<Args, Result, Error, DefinitionExtraOptions, Meta>
  ): Promise<void> {
    const queue = [...this.failedQueue];
    this.failedQueue = [];

    for (const request of queue) {
      try {
        const result = await baseQuery(
          request.args as Args,
          request.api,
          request.extraOptions as DefinitionExtraOptions
        );
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }
  }

  /**
   * 대기열 에러 처리 (갱신 실패 시)
   */
  private clearFailedQueue(error: Error): void {
    const queue = [...this.failedQueue];
    this.failedQueue = [];

    queue.forEach(request => {
      request.reject(error);
    });
  }

  /**
   * 진행 중인 갱신 작업 대기
   */
  private async waitForRefresh(): Promise<void> {
    const maxWaitTime = 10000; // 10초
    const checkInterval = 100; // 100ms
    let waited = 0;

    while (this.isRefreshing && waited < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    if (waited >= maxWaitTime) {
      console.error('❌ [TokenInterceptor] 토큰 갱신 대기 시간 초과');
    }
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
   * 토큰 남은 시간 확인 (디버깅용)
   */
  getTokenRemainingTime(): number | null {
    const userStateManager = UserStateManager.getInstance();
    const accessToken = userStateManager.accessToken;

    if (!accessToken) {
      return null;
    }

    return this.silentTokenRefreshService.getTokenRemainingTime(accessToken);
  }

  /**
   * 인터셉터 상태 리셋 (개발 환경 전용)
   * 프로덕션에서는 사용하지 않음
   */
  reset(): void {
    if (__DEV__) {
      this.isRefreshing = false;
      this.failedQueue = [];
      console.log('🔄 [TokenInterceptor] 상태 리셋 완료 (개발 모드)');
    } else {
      console.warn('⚠️ [TokenInterceptor] reset()은 개발 환경에서만 사용 가능합니다');
    }
  }
}

// Singleton export
export const tokenRefreshInterceptor = TokenRefreshInterceptor.getInstance();