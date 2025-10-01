/**
 * User Store (Zustand)
 * 기존 userSlice.ts + UserStateManager에서 마이그레이션
 * Redux → Zustand
 *
 * Phase 3: 주 Store로서 사용자 정보, 토큰, 로그인 상태 모두 관리
 * AuthStore는 인증 플로우(로딩/에러)만 관리
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '~/features/user/models/User';
import { UserAccount } from '~/features/user/models/UserAccount';
import { AuthProvider } from '~/features/auth/models/AuthProvider';
import { AvatarItem } from '~/features/avatar/models';
import { UserDataDto, userDataDtoToUser } from '~/features/user/models/UserDataDto';

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
 * 기존 userSlice.ts의 UserState와 동일
 *
 * Phase 3: AuthStore와 중복 제거
 * - isLoggedIn, accessToken, refreshToken은 UserStore에서 관리
 * - AuthStore는 인증 플로우(isLoading, error)만 관리
 */
interface UserState {
  // User 정보
  currentUser: User | null;
  totalPoint: number;
  isLoggedIn: boolean;
  isLoading: boolean;

  // 토큰 정보 (실제 토큰은 Keychain에 저장, 여기는 상태만)
  accessToken: string | null;
  refreshToken: string | null;

  // Avatar 정보
  avatarId: number;
  equippedItems: Record<string, AvatarItem>;

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
    equippedItems: Record<string, AvatarItem>;
    accessToken: string;
    refreshToken?: string;
  }) => void;
  logout: () => void;
  updateProfile: (params: { nickname?: string; profileImageURL?: string }) => void;
  disconnectAccount: (provider: string) => void;
  connectAccount: (account: UserAccount) => void;
  earnPoints: (points: number) => void;
  setTotalPoint: (totalPoint: number) => void;
  setTokens: (params: { accessToken: string; refreshToken?: string }) => void;
  setNickname: (nickname: string) => void;
  setLevel: (level: number) => void;
  setAvatarId: (avatarId: number) => void;
  setEquippedItems: (items: Record<string, AvatarItem>) => void;
  setUserPreferences: (preferences: UserPreferences) => void;
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
  incrementAppLaunchCount: () => void;
  setLastAppVersion: (version: string) => void;
  setLoading: (isLoading: boolean) => void;
  setBackgroundEnterTime: (time: Date | null) => void;
  syncUserData: (params: {
    totalPoint?: number;
    avatarId?: number;
    equippedItems?: Record<string, AvatarItem>;
    level?: number;
  }) => void;
  resetAppState: () => void;

  // 추가 헬퍼 메서드 (UserStateManager에서 사용)
  login: (userData: UserDataDto, accessToken: string, refreshToken?: string) => void;
}

/**
 * User Store
 * 기존 userSlice의 initialState와 reducers를 Zustand로 변환
 */
export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial State (기존 userSlice의 initialState)
      currentUser: null,
      totalPoint: 0,
      isLoggedIn: false,
      isLoading: false,
      accessToken: null,
      refreshToken: null,
      avatarId: 0,
      equippedItems: {},
      userPreferences: defaultPreferences,
      appLaunchCount: 0,
      lastAppVersion: null,
      backgroundEnterTime: null,

      // Actions

      /**
       * 로그인 데이터 설정
       * 기존: setLoginData reducer
       */
      setLoginData: ({ user, totalPoint, avatarId, equippedItems, accessToken, refreshToken }) => {
        // Update last login
        user.lastLoginAt = new Date();

        set({
          currentUser: user,
          totalPoint,
          avatarId,
          equippedItems,
          isLoggedIn: true,
          accessToken,
          refreshToken: refreshToken || get().refreshToken,
        });

        // Debug logging
        if (__DEV__) {
          console.log('=== UserStore Login Debug Info ===');
          console.log('CurrentUser:', user);
          console.log('Point:', totalPoint);
          console.log('EquippedItems:', equippedItems);
          console.log('====================================');
        }
      },

      /**
       * 로그아웃
       * 기존: logout reducer
       */
      logout: () =>
        set({
          currentUser: null,
          accessToken: null,
          refreshToken: null,
          isLoggedIn: false,
          totalPoint: 0,
          avatarId: 0,
          equippedItems: {},
        }),

      /**
       * 프로필 업데이트
       * 기존: updateProfile reducer
       */
      updateProfile: ({ nickname, profileImageURL }) => {
        const currentUser = get().currentUser;
        if (!currentUser) return;

        set({
          currentUser: {
            ...currentUser,
            nickname: nickname || currentUser.nickname,
            profileImageURL: profileImageURL !== undefined ? profileImageURL : currentUser.profileImageURL,
          },
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
          };

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
       * 토큰 설정
       * 기존: setTokens reducer
       */
      setTokens: ({ accessToken, refreshToken }) =>
        set((state) => ({
          accessToken,
          refreshToken: refreshToken || state.refreshToken,
        })),

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
       * 로딩 상태 설정
       * 기존: setLoading reducer
       */
      setLoading: (isLoading) =>
        set({
          isLoading,
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
          isLoggedIn: false,
          isLoading: false,
          accessToken: null,
          refreshToken: null,
          avatarId: 0,
          equippedItems: {},
          userPreferences: defaultPreferences,
          appLaunchCount: 0,
          lastAppVersion: null,
          backgroundEnterTime: null,
        }),

      /**
       * 로그인 헬퍼 메서드
       * UserStateManager.login()을 위한 래퍼
       */
      login: (userData, accessToken, refreshToken) => {
        const user = userDataDtoToUser(userData);

        // EquippedItemDataDto를 AvatarItem으로 변환
        const convertEquippedItems = (equippedItems: any[]): Record<string, AvatarItem> => {
          const result: Record<string, AvatarItem> = {};

          equippedItems.forEach((item) => {
            result[item.itemTypeId] = {
              id: item.id,
              item: {
                id: item.id,
                itemType: { id: item.itemTypeId, name: String(item.itemTypeId) },
                name: item.name,
                unityFilePath: item.unityFilePath,
                filePath: item.filePath,
                point: 0,
                createdAt: new Date().toISOString(),
              },
              isEnabled: true,
            };
          });

          return result;
        };

        get().setLoginData({
          user,
          totalPoint: userData.totalPoint,
          avatarId: userData.avatarId,
          equippedItems: convertEquippedItems(userData.equippedItems || []),
          accessToken,
          refreshToken,
        });
      },
    }),
    {
      name: 'user-storage', // AsyncStorage key
      storage: createJSONStorage(() => AsyncStorage),
      // 필요한 필드만 persist (토큰은 Keychain에 별도 저장)
      partialize: (state) => ({
        currentUser: state.currentUser,
        isLoggedIn: state.isLoggedIn,
        totalPoint: state.totalPoint,
        avatarId: state.avatarId,
        equippedItems: state.equippedItems,
        userPreferences: state.userPreferences,
        appLaunchCount: state.appLaunchCount,
        lastAppVersion: state.lastAppVersion,
        // accessToken, refreshToken은 Keychain에 저장되므로 제외
      }),
    }
  )
);

/**
 * Selectors (복잡한 로직이 필요한 경우만 제공)
 *
 * Phase 3: 불필요한 단순 selector 제거
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
