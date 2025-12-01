/**
 * User Service
 * 기존 userApi.ts에서 마이그레이션
 * RTK Query → Axios
 */

import { userDataDtoToUser, type User, type UserDataDto } from '~/features/user/models';
import { apiClient } from '../../../services/api/client';
import { API_ENDPOINTS } from '../../../services/api/config';

/**
 * 프로필 업데이트 응답
 */
export interface ProfileResponse {
  id: number;
  nickname: string;
  profileImageUrl?: string;
}

/**
 * User API Service
 */
export const userService = {
  /**
   * 사용자 ID로 사용자 정보 조회
   * 기존: getUserById query
   */
  getUserById: async (userId: number): Promise<User> => {
    const { data } = await apiClient.get<User>(`${API_ENDPOINTS.USER.BASE}/${userId}`);
    return data;
  },

  /**
   * 현재 사용자 데이터 조회 (UserDataDto)
   * 기존: getUserData query
   */
  getUserData: async (): Promise<UserDataDto> => {
    const { data } = await apiClient.get<UserDataDto>(API_ENDPOINTS.USER.ME);
    return data;
  },

  /**
   * 현재 사용자 정보 조회 (User)
   * 기존: getCurrentUser query
   * UserDataDto를 User로 변환하여 반환
   */
  getCurrentUser: async (): Promise<User> => {
    const { data } = await apiClient.get<UserDataDto>(API_ENDPOINTS.USER.ME);
    return userDataDtoToUser(data);
  },

  /**
   * 사용자 계정 연결
   * POST /api/v1/users/accounts
   */
  connectAccount: async (userId: number, provider: string, code: string): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.USER.ACCOUNTS(userId), {
      provider,
      code
    });
  },

  /**
   * 사용자 계정 연결 해제
   * DELETE /api/v1/users/accounts/{accountId}
   */
  disconnectAccount: async (accountId: number): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.USER.ACCOUNT_DISCONNECT(accountId));
  },

  /**
   * 사용자 삭제 (탈퇴)
   * 기존: deleteUser mutation
   */
  deleteUser: async (): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.USER.BASE);
  },

  /**
   * 프로필 업데이트 (닉네임 및/또는 프로필 이미지)
   * PATCH /api/v1/users/me (multipart/form-data)
   */
  updateProfile: async (params: {
    nickname?: string;
    profileImage?: {
      uri: string;
      type: string;
      name: string;
    };
  }): Promise<ProfileResponse> => {
    const formData = new FormData();

    if (params.nickname) {
      formData.append('nickname', params.nickname);
    }

    if (params.profileImage) {
      formData.append('profileImage', {
        uri: params.profileImage.uri,
        type: params.profileImage.type,
        name: params.profileImage.name,
      } as unknown as Blob);
    }

    const { data } = await apiClient.patch<ProfileResponse>(
      API_ENDPOINTS.USER.ME,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return data;
  },

  /**
   * 회원 탈퇴 (익명화 처리)
   * DELETE /api/v1/users/me
   */
  withdraw: async (): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.USER.ME);
  },
};
