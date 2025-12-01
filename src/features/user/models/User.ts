import { AuthProviderType } from '../../auth/models/AuthType';
import type { UserAccount } from './UserAccount';

/**
 * User Model
 * Swift User.swift에서 마이그레이션
 */
export interface User {
  id: number;
  nickname: string;
  userAccounts: UserAccount[];
  profileImageURL?: string;
  level: number;
  createdAt: Date;
  lastLoginAt?: Date;
}

/**
 * User 생성을 위한 팩토리 함수
 * Swift User init과 동일
 */
export const createUser = (data: {
  id: number;
  nickname: string;
  userAccounts?: UserAccount[];
  profileImageURL?: string;
  level?: number;
  createdAt?: Date;
  lastLoginAt?: Date;
}): User => {
  const user: User = {
    id: data.id,
    nickname: data.nickname,
    userAccounts: data.userAccounts ?? [],
    level: data.level ?? 1,
    createdAt: data.createdAt ?? new Date(),
  };

  if (data.profileImageURL) {
    user.profileImageURL = data.profileImageURL;
  }

  if (data.lastLoginAt) {
    user.lastLoginAt = data.lastLoginAt;
  }

  return user;
};

/**
 * 마지막 로그인 시간 업데이트
 * Swift updateLastLogin() 메서드와 동일
 */
export const updateLastLogin = (user: User): User => ({
  ...user,
  lastLoginAt: new Date(),
});

/**
 * 프로필 업데이트
 * Swift updateProfile() 메서드와 동일
 */
export const updateUserProfile = (
  user: User,
  updates: {
    nickname?: string;
    profileImageURL?: string;
  }
): User => ({
  ...user,
  ...(updates.nickname && { nickname: updates.nickname }),
  ...(updates.profileImageURL && { profileImageURL: updates.profileImageURL }),
});

/**
 * 사용자 계정 추가
 * Swift addUserAccount() 메서드와 동일
 */
export const addUserAccount = (user: User, account: UserAccount): User => {
  // 동일한 provider의 계정이 이미 있는지 확인
  const existingAccount = user.userAccounts.find(
    (acc) => acc.provider === account.provider
  );

  if (existingAccount) {
    return user; // 이미 존재하는 경우 변경하지 않음
  }

  return {
    ...user,
    userAccounts: [...user.userAccounts, account],
  };
};

/**
 * 사용자 계정 제거
 * Swift removeUserAccount() 메서드와 동일
 */
export const removeUserAccount = (user: User, provider: AuthProviderType): User => ({
  ...user,
  userAccounts: user.userAccounts.filter((account) => account.provider !== provider),
});

/**
 * 특정 provider의 계정 조회
 */
export const getUserAccount = (user: User, provider: AuthProviderType): UserAccount | undefined => {
  return user.userAccounts.find((account) => account.provider === provider);
};

/**
 * 연결된 계정 수 조회
 */
export const getConnectedAccountsCount = (user: User): number => {
  return user.userAccounts.filter((account) => account.isConnected).length;
};