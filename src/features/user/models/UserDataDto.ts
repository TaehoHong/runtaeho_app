import { AuthProviderType } from '../../auth/models/AuthType';
import type { User } from './User';
import { createUser } from './User';
import type { UserAccount } from './UserAccount';
import { createUserAccount } from './UserAccount';

/**
 * User Data DTO
 */
export interface UserDataDto {
  id: number;
  name: string;
  authorityType: string;
  totalPoint: number;
  userAccounts: UserAccountDataDto[];
  avatarId: number;
  haveRunningRecord: boolean;
  equippedItems: EquippedItemDataDto[];
}

/**
 * User Account Data DTO
 * Swift UserAccountDataDto에서 마이그레이션
 */
export interface UserAccountDataDto {
  id: number;
  email: string;
  accountType: AuthProviderType;
}

/**
 * Equipped Item Data DTO
 */
export interface EquippedItemDataDto {
  id: number;
  name: string;
  itemTypeId: number;
  filePath: string;
  unityFilePath: string;
}

/**
 * UserDataDto를 User로 변환
 */
export const userDataDtoToUser = (dto: UserDataDto): User => {
  // userAccounts를 Map으로 변환
  const userAccountMap = new Map<AuthProviderType, UserAccountDataDto>();
  dto.userAccounts.forEach((account) => {
    userAccountMap.set(account.accountType, account);
  });

  // 모든 AuthProvider에 대해 UserAccount 생성
  const accounts: UserAccount[] = Object.values(AuthProviderType).map((provider) => {
    const accountData = userAccountMap.get(provider);
    return accountData ? userAccountDataDtoToUserAccount(accountData) : createUserAccount({ provider });
  });

  return createUser({
    id: dto.id,
    nickname: dto.name,
    userAccounts: accounts,
  });
};

/**
 * UserAccountDataDto를 UserAccount로 변환
 * Swift toUserAccount() 메서드와 동일
 */
export const userAccountDataDtoToUserAccount = (dto: UserAccountDataDto): UserAccount => {
  return createUserAccount({
    id: dto.id,
    provider: dto.accountType,
    isConnected: true,
    connectedAt: null, // DTO에 connectedAt 정보가 없음
    email: dto.email,
  });
};