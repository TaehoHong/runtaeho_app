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
 * Swift TokenDto.swift에서 마이그레이션
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
  profileImageURL: data.profileImageURL,
});

/**
 * Legacy constructor - TokenDto에서 UserAuthData 생성
 */
export const createUserAuthDataFromToken = (tokenDto: TokenDto): UserAuthData => ({
  id: tokenDto.userId,
  email: 'unknown@example.com',
  nickname: '사용자',
  accessToken: tokenDto.accessToken,
  refreshToken: tokenDto.refreshToken,
  profileImageURL: undefined,
});

/**
 * UserAuthData에서 userId getter (Legacy Support)
 */
export const getUserId = (userAuthData: UserAuthData): number => userAuthData.id;