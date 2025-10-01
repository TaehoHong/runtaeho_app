/**
 * User Service
 * 기존 userApi.ts에서 마이그레이션
 * RTK Query → Axios
 */

import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/config';
import { User, UserDataDto, userDataDtoToUser } from '~/features/user/models';

/**
 * User API Service
 * 기존 userApi.endpoints를 함수로 변환
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
   * 사용자 프로필 업데이트
   * 기존: updateUserProfile mutation
   */
  updateUserProfile: async (updates: { nickname?: string; profileImageURL?: string }): Promise<User> => {
    const { data } = await apiClient.put<User>(API_ENDPOINTS.USER.PROFILE, updates);
    return data;
  },

  /**
   * 사용자 계정 연결
   * 기존: connectAccount mutation
   */
  connectAccount: async (provider: string, token: string): Promise<void> => {
    await apiClient.post(`${API_ENDPOINTS.USER.BASE}/account/connect/${provider}`, { token });
  },

  /**
   * 사용자 계정 연결 해제
   * 기존: disconnectAccount mutation
   */
  disconnectAccount: async (provider: string): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.USER.BASE}/account/disconnect/${provider}`);
  },

  /**
   * 사용자 삭제 (탈퇴)
   * 기존: deleteUser mutation
   */
  deleteUser: async (): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.USER.BASE);
  },
};
