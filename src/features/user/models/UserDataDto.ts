import { AuthProviderType } from '../../auth/models/AuthType';
import { User, createUser } from './User';
import { UserAccount, createUserAccount } from './UserAccount';

/**
 * User Data DTO
 * Swift UserDataDto.swift에서 마이그레이션
 */
export interface UserDataDto {
  id: number;
  name: string;
  authorityType: string;
  totalPoint: number;
  userAccounts: UserAccountDataDto[];
  avatarId: number;
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
 * Swift EquippedItemDataDto에서 마이그레이션
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
 * Swift toUser() 메서드와 동일
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

/**
 * 장착된 아이템 변환
 * Swift getEquippedItems() 메서드와 동일
 *
 * 주의: Avatar 도메인이 마이그레이션되면 AvatarItem과 ItemType을 import해서 구현
 */
export const getEquippedItemsFromDto = (dto: UserDataDto): Record<number, any> => {
  // TODO: Avatar 도메인 마이그레이션 후 구현
  // return dto.equippedItems.reduce((acc, item) => {
  //   const itemType = getItemType(item.itemTypeId);
  //   const avatarItem = equippedItemDataDtoToAvatarItem(item);
  //   acc[itemType] = avatarItem;
  //   return acc;
  // }, {} as Record<ItemType, AvatarItem>);

  return {};
};

/**
 * EquippedItemDataDto를 AvatarItem으로 변환
 * Swift toAvatarItem() 메서드와 동일
 *
 * 주의: Avatar 도메인 마이그레이션 후 구현
 */
export const equippedItemDataDtoToAvatarItem = (dto: EquippedItemDataDto): any => {
  // TODO: Avatar 도메인 마이그레이션 후 구현
  // return createAvatarItem({
  //   id: dto.id,
  //   name: dto.name,
  //   itemType: getItemType(dto.itemTypeId),
  //   filePath: dto.filePath,
  //   unityFilePath: dto.unityFilePath,
  //   status: ItemStatus.EQUIPPED,
  //   price: null,
  // });

  return {};
};