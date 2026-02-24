/**
 * 사용자 인증 데이터
 * Swift UserAuthData.swift에서 마이그레이션
 */
export interface UserAuthData {
  id: number;
  email: string;
  nickname: string;
  accessToken: string;
  refreshToken: string;
  profileImageURL?: string;
}

/**
 * 토큰 DTO
 */
export interface TokenDto {
  userId: number;
  accessToken: string;
  refreshToken: string;
}

/**
 * UserAuthData 생성을 위한 팩토리 함수들
 */
export const createUserAuthData = (data: {
  id: number;
  email: string;
  nickname: string;
  accessToken: string;
  refreshToken: string;
  profileImageURL?: string;
}): UserAuthData => ({
  id: data.id,
  email: data.email,
  nickname: data.nickname,
  accessToken: data.accessToken,
  refreshToken: data.refreshToken,
  profileImageURL: data.profileImageURL ?? '',
});

export class AuthenticationError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'AuthenticationError';
  }

  static networkError(error: Error): AuthenticationError {
    return new AuthenticationError('Network error occurred', error);
  }
}

/**
 * UserAuthData에서 userId getter (Legacy Support)
 */
export const getUserId = (userAuthData: UserAuthData): number => userAuthData.id;
