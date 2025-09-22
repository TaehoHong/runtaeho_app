import { baseApi } from './baseApi';
import { User, UserDataDto, userDataDtoToUser } from '../../features/user/models';

/**
 * User API endpoints
 * Swift UserService.swift, UserAPIService.swift에서 마이그레이션
 */
export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * 사용자 ID로 사용자 정보 조회
     * Swift: getUserById(userId:accessToken:) 메서드
     */
    getUserById: builder.query<User, { userId: number }>({
      query: ({ userId }) => `/user/${userId}`,
      providesTags: (result, error, { userId }) => [{ type: 'User', id: userId }],
    }),

    /**
     * 현재 사용자 데이터 조회
     * Swift: getUserDataDto() 메서드
     */
    getUserData: builder.query<UserDataDto, void>({
      query: () => '/user/me',
      providesTags: ['User'],
    }),

    /**
     * 현재 사용자 정보 조회 (User 형태로 변환)
     * UserDataDto를 User로 변환하여 반환
     */
    getCurrentUser: builder.query<User, void>({
      query: () => '/user/me',
      transformResponse: (response: UserDataDto) => userDataDtoToUser(response),
      providesTags: ['User'],
    }),

    /**
     * 사용자 프로필 업데이트
     */
    updateUserProfile: builder.mutation<User, { nickname?: string; profileImageURL?: string }>({
      query: (updates) => ({
        url: '/user/profile',
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: ['User'],
    }),

    /**
     * 사용자 계정 연결
     */
    connectAccount: builder.mutation<void, { provider: string; token: string }>({
      query: ({ provider, token }) => ({
        url: `/user/account/connect/${provider}`,
        method: 'POST',
        body: { token },
      }),
      invalidatesTags: ['User'],
    }),

    /**
     * 사용자 계정 연결 해제
     */
    disconnectAccount: builder.mutation<void, { provider: string }>({
      query: ({ provider }) => ({
        url: `/user/account/disconnect/${provider}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),

    /**
     * 사용자 삭제 (탈퇴)
     */
    deleteUser: builder.mutation<void, void>({
      query: () => ({
        url: '/user',
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

// Export hooks
export const {
  useGetUserByIdQuery,
  useLazyGetUserByIdQuery,
  useGetUserDataQuery,
  useLazyGetUserDataQuery,
  useGetCurrentUserQuery,
  useLazyGetCurrentUserQuery,
  useUpdateUserProfileMutation,
  useConnectAccountMutation,
  useDisconnectAccountMutation,
  useDeleteUserMutation,
} = userApi;