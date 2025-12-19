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
  profileImageUrl?: string;
  authorityType: string;
  totalPoint: number;
  userAccounts: UserAccountDataDto[];
  avatarId: number;
  haveRunningRecord: boolean;
  equippedItems: EquippedItemDataDto[];
  hairColor?: string;  // 헤어 색상 (HEX 형식: "#FFFFFF")
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
 * 프로필 이미지 URL을 전체 URL로 변환
 * 서버에서 상대 경로(/profile-images/...)로 내려오면 S3 버킷 URL과 결합
 */
const buildFullImageUrl = (imageUrl: string | undefined): string | undefined => {
  if (!imageUrl) {
    return undefined;
  }

  // 이미 전체 URL인 경우 그대로 반환
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // 상대 경로인 경우 S3 버킷 URL과 결합
  const s3BucketUrl = process.env.EXPO_PUBLIC_S3_BUCKET_URL;
  if (!s3BucketUrl) {
    console.warn('⚠️ EXPO_PUBLIC_S3_BUCKET_URL not set');
    return imageUrl;
  }

  return `${s3BucketUrl}${imageUrl}`;
};

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

  const userParams: Parameters<typeof createUser>[0] = {
    id: dto.id,
    nickname: dto.name,
    userAccounts: accounts,
  };

  // 프로필 이미지 URL을 전체 URL로 변환
  const fullImageUrl = buildFullImageUrl(dto.profileImageUrl);
  if (fullImageUrl) {
    userParams.profileImageURL = fullImageUrl;
  }

  return createUser(userParams);
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