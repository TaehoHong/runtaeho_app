/**
 * User Service
 *
 * React Native에서는 주로 RTK Query를 통해 API 호출을 하므로
 * 이 서비스는 복잡한 비즈니스 로직이나 유틸리티 함수들을 위해 사용
 */

import { AuthProviderType } from '../../auth/models';
import type { User } from '../models';
import type { UserDataDto } from '../models/UserDataDto';

export class UserService {
  private static instance: UserService;

  private constructor() {}

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * 사용자 권한 검증
   */
  validateUserPermissions(user: User, requiredLevel: number = 1): boolean {
    return user.level >= requiredLevel;
  }

  /**
   * 사용자 활동성 검사
   */
  isActiveUser(user: User, daysThreshold: number = 30): boolean {
    if (!user.lastLoginAt) {
      return false;
    }

    const daysSinceLastLogin = Math.floor(
      (new Date().getTime() - user.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceLastLogin <= daysThreshold;
  }

  /**
   * 사용자 계정 연결 가능 여부 확인
   */
  canConnectAccount(user: User, provider: AuthProviderType): boolean {
    // 이미 연결된 계정이 있는지 확인
    const existingAccount = user.userAccounts.find(
      (account) => account.provider === provider
    );

    return !existingAccount?.isConnected;
  }

  /**
   * 사용자 프로필 완성도 계산
   */
  calculateProfileCompleteness(user: User): number {
    let completeness = 0;
    const totalFields = 5;

    // 기본 정보
    if (user.nickname?.trim()) completeness++;
    if (user.profileImageURL) completeness++;

    // 계정 연결
    const connectedAccounts = user.userAccounts.filter(account => account.isConnected);
    if (connectedAccounts.length > 0) completeness++;

    // 추가 정보들
    if (user.level > 1) completeness++;
    if (user.lastLoginAt) completeness++;

    return Math.round((completeness / totalFields) * 100);
  }

  /**
   * 사용자 표시 이름 생성
   */
  getDisplayName(user: User): string {
    if (user.nickname?.trim()) {
      return user.nickname;
    }

    // 연결된 계정의 이메일에서 이름 추출
    const connectedAccount = user.userAccounts.find(account => account.isConnected && account.email);
    if (connectedAccount?.email) {
      return connectedAccount.email.split('@')[0];
    }

    return `사용자${user.id}`;
  }

  /**
   * 사용자 등급 계산
   */
  calculateUserGrade(user: User): string {
    if (user.level >= 10) return 'VIP';
    if (user.level >= 5) return 'Premium';
    if (user.level >= 3) return 'Regular';
    return 'Starter';
  }

  /**
   * 사용자 계정 요약 정보 생성
   */
  getUserSummary(user: User): {
    displayName: string;
    grade: string;
    completeness: number;
    connectedProviders: AuthProviderType[];
    isActive: boolean;
  } {
    return {
      displayName: this.getDisplayName(user),
      grade: this.calculateUserGrade(user),
      completeness: this.calculateProfileCompleteness(user),
      connectedProviders: user.userAccounts
        .filter(account => account.isConnected)
        .map(account => account.provider),
      isActive: this.isActiveUser(user),
    };
  }

  /**
   * 닉네임 유효성 검사
   */
  validateNickname(nickname: string): { isValid: boolean; message?: string } {
    if (!nickname || nickname.trim().length === 0) {
      return { isValid: false, message: '닉네임을 입력해주세요.' };
    }

    if (nickname.trim().length < 2) {
      return { isValid: false, message: '닉네임은 2자 이상이어야 합니다.' };
    }

    if (nickname.trim().length > 20) {
      return { isValid: false, message: '닉네임은 20자 이하여야 합니다.' };
    }

    // 특수문자 검사 (한글, 영문, 숫자, 공백만 허용)
    const validPattern = /^[가-힣a-zA-Z0-9\s]+$/;
    if (!validPattern.test(nickname.trim())) {
      return { isValid: false, message: '닉네임은 한글, 영문, 숫자만 사용할 수 있습니다.' };
    }

    return { isValid: true };
  }

  /**
   * 백엔드에서 최신 사용자 데이터 조회
   * Swift getUserDataDto() 메서드와 동일
   */
  async fetchUserDataDto(): Promise<UserDataDto | null> {
    try {
      console.log('🔍 [UserService] 백엔드에서 사용자 데이터 조회 시작');

      const result = await store.dispatch(
        userApi.endpoints.getUserData.initiate()
      );

      if (result.data) {
        console.log('✅ [UserService] 백엔드 사용자 데이터 조회 성공:', result.data);
        return result.data;
      } else {
        console.warn('⚠️ [UserService] 백엔드에서 데이터 조회 실패');
        return null;
      }
    } catch (error) {
      console.error('❌ [UserService] 백엔드 데이터 조회 오류:', error);
      throw error;
    }
  }

  async getUserDataDto(): Promise<UserDataDto | null> {
    try {
      console.log('🔄 [UserService] 백엔드와 사용자 데이터 동기화 시작');

      // 백엔드에서 최신 데이터 조회
      // 토큰 검증 및 갱신은 TokenRefreshInterceptor가 자동 처리
      const userDataDto = await this.fetchUserDataDto();

       if (!userDataDto) {
        return null
      } else {
        return userDataDto
      }

    } catch (error) {
      console.error('❌ [UserService] 동기화 실패:', error);
      throw error
    }
  }
}

// Singleton export
export const userService = UserService.getInstance();