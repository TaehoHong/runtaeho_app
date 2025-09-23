import { baseApi } from './baseApi';
import { AuthProvider, TokenDto, UserAuthData } from '../../features/auth/models';

/**
 * Authentication API endpoints
 * Swift AuthenticationService.swift에서 마이그레이션
 */
export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * OAuth 토큰 획득
     * Swift: getToken(provider:code:) 메서드
     */
    getOAuthToken: builder.mutation<TokenDto, { provider: AuthProvider; code: string }>({
      query: ({ provider, code }) => {
        const oauthPath = getOAuthPath(provider);
        return {
          url: oauthPath,
          method: 'GET',
          params: { code }, // GET 요청이므로 쿼리 파라미터로 전송
        };
      },
      invalidatesTags: ['Auth'],
    }),

    /**
     * 토큰 갱신
     * Swift: refresh() 메서드
     */
    refreshToken: builder.mutation<TokenDto, void>({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),

    /**
     * 로그아웃
     */
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),

    /**
     * 현재 사용자 인증 정보 조회
     */
    getCurrentUserAuth: builder.query<UserAuthData, void>({
      query: () => '/auth/me',
      providesTags: ['Auth'],
    }),
  }),
});

/**
 * OAuth 경로 매핑
 * Swift getOAuthPath(for:) 메서드와 동일한 로직
 */
const getOAuthPath = (provider: AuthProvider): string => {
  switch (provider) {
    case AuthProvider.GOOGLE:
      return '/auth/oauth/google';
    case AuthProvider.APPLE:
      return '/auth/oauth/apple';
    default:
      throw new Error(`Unsupported auth provider: ${provider}`);
  }
};

// Export hooks
export const {
  useGetOAuthTokenMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
  useGetCurrentUserAuthQuery,
  useLazyGetCurrentUserAuthQuery,
} = authApi;