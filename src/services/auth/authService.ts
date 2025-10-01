/**
 * Auth Service
 * 기존 authApi.ts에서 마이그레이션
 * RTK Query → Axios
 */

import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/config';
import { AuthProvider, TokenDto, UserAuthData } from '~/features/auth/models';

/**
 * OAuth 경로 매핑
 * 기존 getOAuthPath 함수와 동일
 */
const getOAuthPath = (provider: AuthProvider): string => {
  switch (provider) {
    case AuthProvider.GOOGLE:
      return API_ENDPOINTS.AUTH.OAUTH_GOOGLE;
    case AuthProvider.APPLE:
      return API_ENDPOINTS.AUTH.OAUTH_APPLE;
    default:
      throw new Error(`Unsupported auth provider: ${provider}`);
  }
};

/**
 * Authentication API Service
 * 기존 authApi.endpoints를 함수로 변환
 */
export const authService = {
  /**
   * OAuth 토큰 획득
   * 기존: getOAuthToken mutation
   * Swift: getToken(provider:code:) 메서드
   */
  getOAuthToken: async (provider: AuthProvider, code: string): Promise<TokenDto> => {
    const oauthPath = getOAuthPath(provider);
    const { data } = await apiClient.get<TokenDto>(oauthPath, {
      params: { code }, // GET 요청이므로 쿼리 파라미터로 전송
    });
    return data;
  },

  /**
   * 토큰 갱신
   * 기존: refreshToken mutation
   * Swift: refresh() 메서드
   */
  refreshToken: async (): Promise<TokenDto> => {
    const { data } = await apiClient.post<TokenDto>(API_ENDPOINTS.AUTH.REFRESH);
    return data;
  },

  /**
   * 로그아웃
   * 기존: logout mutation
   */
  logout: async (): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
  },

  /**
   * 현재 사용자 인증 정보 조회
   * 기존: getCurrentUserAuth query
   */
  getCurrentUserAuth: async (): Promise<UserAuthData> => {
    const { data } = await apiClient.get<UserAuthData>(API_ENDPOINTS.AUTH.ME);
    return data;
  },
};
