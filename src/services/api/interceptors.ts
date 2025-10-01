/**
 * Token Refresh Interceptor for Axios
 * 기존 TokenRefreshInterceptor를 Axios용으로 마이그레이션
 * RTK Query baseQueryWithReauth를 대체
 */

import { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './client';
import { API_CONFIG } from './config';

// 토큰 갱신 전 대기 시간 (초)
const TOKEN_REFRESH_THRESHOLD_SECONDS = 5 * 60; // 5분

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  config: AxiosRequestConfig;
}

/**
 * Token Refresh Interceptor
 * 기존 TokenRefreshInterceptor 로직 그대로 적용
 */
class TokenRefreshInterceptor {
  private static instance: TokenRefreshInterceptor;
  private isRefreshing = false;
  private failedQueue: PendingRequest[] = [];

  private constructor() {
    this.setupInterceptors();
  }

  static getInstance(): TokenRefreshInterceptor {
    if (!TokenRefreshInterceptor.instance) {
      TokenRefreshInterceptor.instance = new TokenRefreshInterceptor();
    }
    return TokenRefreshInterceptor.instance;
  }

  /**
   * Axios Interceptor 설정
   */
  private setupInterceptors() {
    // Response Interceptor: 401 에러 시 토큰 갱신
    apiClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // 401 에러가 아니거나 이미 재시도한 요청이면 그대로 에러 반환
        if (error.response?.status !== 401 || originalRequest._retry) {
          return Promise.reject(error);
        }

        // 이미 갱신 중이면 대기열에 추가
        if (this.isRefreshing) {
          return this.addToFailedQueue(originalRequest);
        }

        // 토큰 갱신 시도
        originalRequest._retry = true;

        const refreshResult = await this.refreshTokens();

        if (refreshResult.success) {
          console.log('✅ [TokenInterceptor] 토큰 갱신 성공, 원본 요청 재시도');

          // 대기열 처리
          this.processFailedQueue();

          // 새 토큰으로 원본 요청 재시도
          if (refreshResult.accessToken) {
            originalRequest.headers.Authorization = `Bearer ${refreshResult.accessToken}`;
          }

          return apiClient(originalRequest);
        } else {
          console.error('❌ [TokenInterceptor] 토큰 갱신 실패, 로그아웃 처리');

          // 대기열 에러 처리
          this.clearFailedQueue(new Error('Token refresh failed'));

          // 로그아웃 처리
          await this.handleAuthFailure();

          return Promise.reject(error);
        }
      }
    );
  }

  /**
   * 토큰 갱신 수행
   * 기존 refreshTokens 로직 그대로
   */
  private async refreshTokens(): Promise<{ success: boolean; accessToken?: string; refreshToken?: string; error?: string }> {
    if (this.isRefreshing) {
      console.log('⏳ [TokenInterceptor] 이미 토큰 갱신 중...');
      return { success: false, error: 'Already refreshing' };
    }

    this.isRefreshing = true;

    try {
      console.log('🔄 [TokenInterceptor] 토큰 갱신 시작');

      // AsyncStorage에서 refreshToken 가져오기
      const currentRefreshToken = await AsyncStorage.getItem('refreshToken');

      if (!currentRefreshToken) {
        console.log('❌ [TokenInterceptor] Refresh token이 없음');
        return { success: false, error: 'No refresh token' };
      }

      // Refresh Token API 호출 (기존 SilentTokenRefreshService 로직)
      const response = await apiClient.post('/auth/refresh', null, {
        headers: {
          Authorization: `Bearer ${currentRefreshToken}`,
        },
      });

      const { accessToken, refreshToken } = response.data;

      if (accessToken) {
        // AsyncStorage에 새 토큰 저장
        await AsyncStorage.setItem('accessToken', accessToken);
        if (refreshToken) {
          await AsyncStorage.setItem('refreshToken', refreshToken);
        }

        console.log('✅ [TokenInterceptor] 토큰 갱신 및 저장 성공');

        return {
          success: true,
          accessToken,
          refreshToken,
        };
      } else {
        console.log('❌ [TokenInterceptor] 토큰 갱신 실패');
        return { success: false, error: 'Refresh failed' };
      }
    } catch (error: any) {
      console.error('❌ [TokenInterceptor] 토큰 갱신 중 오류:', error);

      // RefreshTokenExpired 에러는 로그아웃 필요
      if (error?.response?.status === 401) {
        await this.handleAuthFailure();
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * 대기열에 요청 추가
   * 기존 addToFailedQueue 로직 그대로
   */
  private addToFailedQueue(config: AxiosRequestConfig): Promise<any> {
    return new Promise((resolve, reject) => {
      this.failedQueue.push({
        resolve,
        reject,
        config,
      });
    });
  }

  /**
   * 대기열 처리 (갱신 성공 후)
   * 기존 processFailedQueue 로직 그대로
   */
  private processFailedQueue(): void {
    const queue = [...this.failedQueue];
    this.failedQueue = [];

    queue.forEach(async (request) => {
      try {
        const accessToken = await AsyncStorage.getItem('accessToken');
        if (accessToken && request.config.headers) {
          request.config.headers.Authorization = `Bearer ${accessToken}`;
        }

        const response = await apiClient(request.config);
        request.resolve(response);
      } catch (error) {
        request.reject(error);
      }
    });
  }

  /**
   * 대기열 에러 처리 (갱신 실패 시)
   * 기존 clearFailedQueue 로직 그대로
   */
  private clearFailedQueue(error: Error): void {
    const queue = [...this.failedQueue];
    this.failedQueue = [];

    queue.forEach((request) => {
      request.reject(error);
    });
  }

  /**
   * 인증 실패 처리 (로그아웃)
   * 기존 handleAuthFailure 로직 그대로
   */
  private async handleAuthFailure(): Promise<void> {
    try {
      console.log('🚪 [TokenInterceptor] 인증 실패, 로그아웃 처리');

      // AsyncStorage 클리어
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'isLoggedIn']);

      // 추가적인 로그아웃 후 처리
      // UserStateManager.logout() 호출은 Phase 3에서 Zustand로 변경 후 추가 예정

    } catch (error) {
      console.error('❌ [TokenInterceptor] 로그아웃 처리 중 오류:', error);
    }
  }

  /**
   * JWT 토큰 파싱
   */
  private parseTokenPayload(token: string): any {
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
      console.error('Failed to parse token payload:', error);
      return null;
    }
  }

  /**
   * 토큰 만료 임박 확인
   * 기존 isTokenExpiringSoon 로직
   */
  private isTokenExpiringSoon(token: string, thresholdSeconds: number): boolean {
    const payload = this.parseTokenPayload(token);
    if (!payload || !payload.exp) return false;

    const currentTime = Math.floor(Date.now() / 1000);
    const expirationTime = payload.exp;
    const timeRemaining = expirationTime - currentTime;

    return timeRemaining <= thresholdSeconds;
  }

  /**
   * 토큰 남은 시간 확인 (디버깅용)
   * 기존 getTokenRemainingTime 로직
   */
  async getTokenRemainingTime(): Promise<number | null> {
    const accessToken = await AsyncStorage.getItem('accessToken');

    if (!accessToken) {
      return null;
    }

    const payload = this.parseTokenPayload(accessToken);
    if (!payload || !payload.exp) return null;

    const currentTime = Math.floor(Date.now() / 1000);
    const remainingTime = payload.exp - currentTime;

    return Math.max(0, remainingTime);
  }

  /**
   * 인터셉터 상태 리셋 (개발 환경 전용)
   * 기존 reset 로직 그대로
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

// 초기화 (앱 시작 시 자동 실행)
tokenRefreshInterceptor;
