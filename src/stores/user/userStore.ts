/**
 * User Store (Zustand)
 * 기존 userSlice.ts + UserStateManager에서 마이그레이션
 * Redux → Zustand
 *
 * Phase 4: 사용자 데이터만 관리 (인증 상태는 AuthStore)
 * - 토큰은 Keychain에만 저장 (Store에 저장하지 않음)
 * - isLoggedIn은 AuthStore로 이동
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Item, EquippedItemsMap } from '~/features/avatar';
import { ItemStatus, getItemTypeById } from '~/features/avatar/models';
import { type User } from '~/features/user/models/User';
import { type UserAccount } from '~/features/user/models/UserAccount';
import { userDataDtoToUser, type UserDataDto } from '~/features/user/models/UserDataDto';

/**
 * Theme Mode
 * 기존 userSlice.ts의 ThemeMode enum과 동일
 */
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

/**
 * Distance Unit
 * 기존 userSlice.ts의 DistanceUnit enum과 동일
 */
export enum DistanceUnit {
  KILOMETER = 'km',
  MILE = 'mile',
}

/**
 * User Preferences
 * 기존 userSlice.ts의 UserPreferences interface와 동일
 */
export interface UserPreferences {
  themeMode: ThemeMode;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  language: string;
  distanceUnit: DistanceUnit;
  autoStartRunning: boolean;
}

const defaultPreferences: UserPreferences = {
  themeMode: ThemeMode.SYSTEM,
  notificationsEnabled: true,
  soundEnabled: true,
  language: 'ko',
  distanceUnit: DistanceUnit.KILOMETER,
  autoStartRunning: false,
};

/**
 * User State
 */
interface UserState {
  // User 정보
  currentUser: User | null;
  totalPoint: number;
  profileImgUrl: string | null;
  haveRunningRecord: boolean,

  // Avatar 정보
  avatarId: number;
  equippedItems: EquippedItemsMap; // ItemType을 key로 하는 맵
  hairColor: string; // 헤어 색상 (HEX 형식: "#FFFFFF")

  // User Preferences
  userPreferences: UserPreferences;

  // App State
  appLaunchCount: number;
  lastAppVersion: string | null;

  // Background State
  backgroundEnterTime: Date | null;

  // Actions (기존 userSlice의 reducers와 동일한 이름)
  setLoginData: (params: {
    user: User;
    totalPoint: number;
    avatarId: number;
    haveRunningRecord: boolean;
    equippedItems: EquippedItemsMap;
    hairColor: string;
  }) => void;
  setHairColor: (hairColor: string) => void;
  logout: () => void;
  updateProfile: (params: { nickname?: string; profileImageURL?: string }) => void;
  disconnectAccount: (provider: string) => void;
  connectAccount: (account: UserAccount) => void;
  earnPoints: (points: number) => void;
  setTotalPoint: (totalPoint: number) => void;
  setNickname: (nickname: string) => void;
  setLevel: (level: number) => void;
  setAvatarId: (avatarId: number) => void;
  setEquippedItems: (items: EquippedItemsMap) => void;
  deductPoints: (amount: number) => void; // 포인트 차감 추가
  updateEquippedItem: (itemTypeId: number, item: Item) => void; // 개별 아이템 업데이트
  setUserPreferences: (preferences: UserPreferences) => void;
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
  incrementAppLaunchCount: () => void;
  setLastAppVersion: (version: string) => void;
  setBackgroundEnterTime: (time: Date | null) => void;
  syncUserData: (params: {
    totalPoint?: number;
    avatarId?: number;
    equippedItems?: EquippedItemsMap;
    level?: number;
  }) => void;
  resetAppState: () => void;

  // 추가 헬퍼 메서드 (UserStateManager에서 사용)
  login: (userData: UserDataDto) => void;
}

/**
 * User Store
 */
export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial State (기존 userSlice의 initialState)
      currentUser: null,
      totalPoint: 0,
      profileImgUrl: null,
      avatarId: 0,
      haveRunningRecord: false,
      equippedItems: {} as EquippedItemsMap,
      hairColor: '', // 백엔드 동기화 전에는 빈 값 유지
      userPreferences: defaultPreferences,
      appLaunchCount: 0,
      lastAppVersion: null,
      backgroundEnterTime: null,

      // Actions

      
      /**
       * 로그인 데이터 설정
       * 기존: setLoginData reducer
       *
       */
      setLoginData: ({ user, totalPoint, avatarId, haveRunningRecord, equippedItems, hairColor }) => {
        // Update last login
        user.lastLoginAt = new Date();

        set({
          currentUser: user,
          totalPoint,
          avatarId,
          haveRunningRecord,
          equippedItems,
          hairColor,
        });

        // Debug logging
        if (__DEV__) {
          console.log('=== UserStore Login Debug Info ===');
          console.log('CurrentUser:', user);
          console.log('Point:', totalPoint);
          console.log('EquippedItems:', equippedItems);
          console.log('HairColor:', hairColor);
          console.log('====================================');
        }
      },

      /**
       * 헤어 색상 설정
       */
      setHairColor: (hairColor) =>
        set({
          hairColor,
        }),

      /**
       * 로그아웃
       * 기존: logout reducer
       *
       * ⚠️ 토큰 관련 state 제거됨
       * ⚠️ 모든 사용자 데이터를 초기 상태로 복원
       */
      logout: () =>
        set({
          currentUser: null,
          totalPoint: 0,
          profileImgUrl: null,
          avatarId: 0,
          equippedItems: {} as EquippedItemsMap,
          hairColor: '',
          userPreferences: defaultPreferences,
          appLaunchCount: 0,
          lastAppVersion: null,
          backgroundEnterTime: null,
        }),

      /**
       * 프로필 업데이트
       * 기존: updateProfile reducer
       */
      updateProfile: ({ nickname, profileImageURL }) => {
        const currentUser = get().currentUser;
        if (!currentUser) return;

        const updates: Partial<User> = {
          ...currentUser,
          nickname: nickname || currentUser.nickname,
        };

        if (profileImageURL !== undefined) {
          updates.profileImageURL = profileImageURL;
        }

        set({
          currentUser: updates as User,
        });
      },

      /**
       * 계정 연결 해제
       * 기존: disconnectAccount reducer
       */
      disconnectAccount: (provider) => {
        const currentUser = get().currentUser;
        if (!currentUser) return;

        const accountIndex = currentUser.userAccounts.findIndex(
          (account) => account.provider === provider
        );

        if (accountIndex !== -1) {
          const updatedAccounts = [...currentUser.userAccounts];
          updatedAccounts[accountIndex] = {
            ...updatedAccounts[accountIndex],
            isConnected: false,
          } as UserAccount;

          set({
            currentUser: {
              ...currentUser,
              userAccounts: updatedAccounts,
            },
          });
        }
      },

      /**
       * 계정 연결
       * 기존: connectAccount reducer
       */
      connectAccount: (account) => {
        const currentUser = get().currentUser;
        if (!currentUser) return;

        const existingIndex = currentUser.userAccounts.findIndex(
          (acc) => acc.provider === account.provider
        );

        let updatedAccounts = [...currentUser.userAccounts];
        if (existingIndex !== -1) {
          updatedAccounts[existingIndex] = account;
        } else {
          updatedAccounts.push(account);
        }

        set({
          currentUser: {
            ...currentUser,
            userAccounts: updatedAccounts,
          },
        });
      },

      /**
       * 포인트 획득
       * 기존: earnPoints reducer
       */
      earnPoints: (points) =>
        set((state) => ({
          totalPoint: state.totalPoint + points,
        })),

      /**
       * 총 포인트 설정
       * 기존: setTotalPoint reducer
       */
      setTotalPoint: (totalPoint) =>
        set({
          totalPoint,
        }),

      /**
       * 닉네임 설정
       * 기존: setNickname reducer
       */
      setNickname: (nickname) => {
        const currentUser = get().currentUser;
        if (!currentUser) return;

        set({
          currentUser: {
            ...currentUser,
            nickname,
          },
        });
      },

      /**
       * 레벨 설정
       * 기존: setLevel reducer
       */
      setLevel: (level) => {
        const currentUser = get().currentUser;
        if (!currentUser) return;

        set({
          currentUser: {
            ...currentUser,
            level,
          },
        });
      },

      /**
       * 아바타 ID 설정
       * 기존: setAvatarId reducer
       */
      setAvatarId: (avatarId) =>
        set({
          avatarId,
        }),

      /**
       * 장착 아이템 설정
       * 기존: setEquippedItems reducer
       */
      setEquippedItems: (equippedItems) =>
        set({
          equippedItems,
        }),

      /**
       * 포인트 차감
       * 아바타 아이템 구매 시 사용
       */
      deductPoints: (amount) =>
        set((state) => ({
          totalPoint: Math.max(0, state.totalPoint - amount),
        })),

      /**
       * 개별 아이템 업데이트
       * 카테고리별로 아이템 교체 시 사용
       */
      updateEquippedItem: (itemType, item) =>
        set((state) => ({
          equippedItems: {
            ...state.equippedItems,
            [itemType]: item,
          },
        })),

      /**
       * 사용자 환경설정 설정
       * 기존: setUserPreferences reducer
       */
      setUserPreferences: (userPreferences) =>
        set({
          userPreferences,
        }),

      /**
       * 사용자 환경설정 업데이트 (부분)
       * 기존: updateUserPreferences reducer
       */
      updateUserPreferences: (preferences) =>
        set((state) => ({
          userPreferences: {
            ...state.userPreferences,
            ...preferences,
          },
        })),

      /**
       * 앱 실행 횟수 증가
       * 기존: incrementAppLaunchCount reducer
       */
      incrementAppLaunchCount: () =>
        set((state) => ({
          appLaunchCount: state.appLaunchCount + 1,
        })),

      /**
       * 마지막 앱 버전 설정
       * 기존: setLastAppVersion reducer
       */
      setLastAppVersion: (lastAppVersion) =>
        set({
          lastAppVersion,
        }),

      /**
       * 백그라운드 진입 시간 설정
       * 기존: setBackgroundEnterTime reducer
       */
      setBackgroundEnterTime: (backgroundEnterTime) =>
        set({
          backgroundEnterTime,
        }),

      /**
       * 사용자 데이터 동기화
       * 기존: syncUserData reducer
       */
      syncUserData: ({ totalPoint, avatarId, equippedItems, level }) => {
        const state = get();

        const updates: Partial<UserState> = {};

        if (totalPoint !== undefined) {
          console.log(`💰 [UserStore] Point updated: ${state.totalPoint} -> ${totalPoint}`);
          updates.totalPoint = totalPoint;
        }

        if (avatarId !== undefined && avatarId !== state.avatarId) {
          console.log(`👤 [UserStore] Avatar updated: ${state.avatarId} -> ${avatarId}`);
          updates.avatarId = avatarId;
        }

        if (equippedItems) {
          updates.equippedItems = equippedItems;
        }

        if (level !== undefined && state.currentUser) {
          updates.currentUser = {
            ...state.currentUser,
            level,
          };
        }

        set(updates);
      },

      /**
       * 앱 상태 초기화 (개발/디버그용)
       * 기존: resetAppState reducer
       */
      resetAppState: () =>
        set({
          currentUser: null,
          totalPoint: 0,
          avatarId: 0,
          equippedItems: {} as EquippedItemsMap,
          userPreferences: defaultPreferences,
          appLaunchCount: 0,
          lastAppVersion: null,
          backgroundEnterTime: null,
        }),

      /**
       * 로그인 헬퍼 메서드
       * UserStateManager.login()을 위한 래퍼
       */
      login: (userData) => {
        const user = userDataDtoToUser(userData);
        
        // DEBUG: API 응답 구조 확인
        console.log('[UserStore] Login - userData.equippedItems:', JSON.stringify(userData.equippedItems, null, 2));

        // EquippedItemDataDto를 EquippedItemsMap으로 변환
        const convertEquippedItems = (equippedItems: any[]): EquippedItemsMap => {
          const result: EquippedItemsMap = {};

          equippedItems.forEach((item) => {
            const itemTypeId = item.itemTypeId;
            result[itemTypeId] = {
              id: item.id,
              name: item.name,
              itemType: getItemTypeById(itemTypeId),
              filePath: item.filePath,
              unityFilePath: item.unityFilePath,
              point: 0,
              createdAt: new Date().toISOString(),
              status: ItemStatus.EQUIPPED,
              isOwned: true,
            };
          });

          console.log('[UserStore] Login - converted equippedItems:', JSON.stringify(result, null, 2));
          return result;
        };;

        console.log("userData.haveRunningRecord: ", userData.haveRunningRecord)

        get().setLoginData({
          user,
          totalPoint: userData.totalPoint,
          avatarId: userData.avatarId,
          haveRunningRecord: userData.haveRunningRecord,
          equippedItems: convertEquippedItems(userData.equippedItems || []),
          hairColor: userData.hairColor,
        });
      },
    }),
    {
      name: 'user-storage', // AsyncStorage key
      storage: createJSONStorage(() => AsyncStorage),
      // 필요한 필드만 persist (토큰은 Keychain에 별도 저장)
      partialize: (state) => ({
        currentUser: state.currentUser,
        totalPoint: state.totalPoint,
        avatarId: state.avatarId,
        equippedItems: state.equippedItems,
        hairColor: state.hairColor,
        userPreferences: state.userPreferences,
        appLaunchCount: state.appLaunchCount,
        lastAppVersion: state.lastAppVersion,
        // ❌ accessToken, refreshToken 제거됨 (Keychain에만 저장)
      }),
    }
  )
);

/**
 * Selectors (복잡한 로직이 필요한 경우만 제공)
 *
 * Phase 4: 불필요한 단순 selector 제거
 * 단순 필드 접근은 Hook으로 직접 사용:
 *
 * @example
 * // ❌ Bad (불필요한 selector)
 * const user = selectCurrentUser();
 *
 * // ✅ Good (직접 hook 사용)
 * const user = useUserStore(state => state.currentUser);
 */

// 복잡한 계산이 필요한 경우만 selector로 제공
export const selectHasConnectedAccounts = (state: UserState) => {
  return state.currentUser?.userAccounts.some(acc => acc.isConnected) ?? false;
};

export const selectUserLevel = (state: UserState) => {
  return state.currentUser?.level ?? 0;
};

export const selectIsUserPremium = (state: UserState) => {
  // 예: 포인트가 일정 이상이면 프리미엄
  return (state.totalPoint ?? 0) >= 10000;
};
