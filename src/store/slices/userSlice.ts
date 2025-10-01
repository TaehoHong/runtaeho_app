import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../features/user/models/User';
import { AvatarItem, ItemType } from '../../features/avatar/models';

/**
 * Theme Mode
 * SwiftUI UserPreferences.ThemeMode와 동일
 */
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

/**
 * Distance Unit
 * SwiftUI UserPreferences.DistanceUnit과 동일
 */
export enum DistanceUnit {
  KILOMETER = 'km',
  MILE = 'mile',
}

/**
 * User Preferences
 * SwiftUI UserPreferences와 동일
 */
export interface UserPreferences {
  themeMode: ThemeMode;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  language: string;
  distanceUnit: DistanceUnit;
  autoStartRunning: boolean;
}

/**
 * User State
 * SwiftUI UserStateManager의 @Published 속성들과 동일
 */
export interface UserState {
  // User 정보
  currentUser: User | null;
  totalPoint: number;
  isLoggedIn: boolean;
  isLoading: boolean;
  
  // 토큰 정보 (실제 토큰은 Keychain에 저장)
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
  
  // Background State (포그라운드/백그라운드 처리용)
  backgroundEnterTime: Date | null;
}

const defaultPreferences: UserPreferences = {
  themeMode: ThemeMode.SYSTEM,
  notificationsEnabled: true,
  soundEnabled: true,
  language: 'ko',
  distanceUnit: DistanceUnit.KILOMETER,
  autoStartRunning: false,
};

const initialState: UserState = {
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
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Login/Logout
    setLoginData: (state, action: PayloadAction<{
      user: User;
      totalPoint: number;
      avatarId: number;
      equippedItems: Record<string, AvatarItem>;
      accessToken: string;
      refreshToken?: string;
    }>) => {
      const { user, totalPoint, avatarId, equippedItems, accessToken, refreshToken } = action.payload;
      
      // Update last login
      user.lastLoginAt = new Date();
      
      state.currentUser = user;
      state.totalPoint = totalPoint;
      state.avatarId = avatarId;
      state.equippedItems = equippedItems;
      state.isLoggedIn = true;
      state.accessToken = accessToken;
      if (refreshToken) {
        state.refreshToken = refreshToken;
      }
      
      // Debug logging
      if (__DEV__) {
        console.log('=== UserStateManager Login Debug Info ===');
        console.log('CurrentUser:', user);
        console.log('Point:', totalPoint);
        console.log('EquippedItems:', equippedItems);
        console.log('============================================');
      }
    },
    
    logout: (state) => {
      state.currentUser = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isLoggedIn = false;
      state.totalPoint = 0;
      state.avatarId = 0;
      state.equippedItems = {};
    },
    
    // Profile Management
    updateProfile: (state, action: PayloadAction<{
      nickname?: string;
      profileImageURL?: string;
    }>) => {
      if (!state.currentUser) return;
      
      const { nickname, profileImageURL } = action.payload;
      if (nickname) {
        state.currentUser.nickname = nickname;
      }
      if (profileImageURL !== undefined) {
        state.currentUser.profileImageURL = profileImageURL;
      }
    },
    
    // User Account Management
    disconnectAccount: (state, action: PayloadAction<string>) => {
      if (!state.currentUser) return;
      
      const provider = action.payload;
      const accountIndex = state.currentUser.userAccounts.findIndex(
        account => account.provider === provider
      );
      
      if (accountIndex !== -1) {
        state.currentUser.userAccounts[accountIndex] = {
          ...state.currentUser.userAccounts[accountIndex],
          isConnected: false
        };
      }
    },
    
    connectAccount: (state, action: PayloadAction<any>) => {
      if (!state.currentUser) return;
      
      const account = action.payload;
      const existingIndex = state.currentUser.userAccounts.findIndex(
        acc => acc.provider === account.provider
      );
      
      if (existingIndex !== -1) {
        state.currentUser.userAccounts[existingIndex] = account;
      } else {
        state.currentUser.userAccounts.push(account);
      }
    },
    
    // Points Management
    earnPoints: (state, action: PayloadAction<number>) => {
      state.totalPoint += action.payload;
    },
    
    setTotalPoint: (state, action: PayloadAction<number>) => {
      state.totalPoint = action.payload;
    },
    
    // Token Management
    setTokens: (state, action: PayloadAction<{
      accessToken: string;
      refreshToken?: string;
    }>) => {
      state.accessToken = action.payload.accessToken;
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
      }
    },
    
    // User Info Management
    setNickname: (state, action: PayloadAction<string>) => {
      if (!state.currentUser) return;
      state.currentUser.nickname = action.payload;
    },
    
    setLevel: (state, action: PayloadAction<number>) => {
      if (!state.currentUser) return;
      state.currentUser.level = action.payload;
    },
    
    // Avatar Management
    setAvatarId: (state, action: PayloadAction<number>) => {
      state.avatarId = action.payload;
    },
    
    setEquippedItems: (state, action: PayloadAction<Record<string, AvatarItem>>) => {
      state.equippedItems = action.payload;
    },
    
    // Preferences Management
    setUserPreferences: (state, action: PayloadAction<UserPreferences>) => {
      state.userPreferences = action.payload;
    },
    
    updateUserPreferences: (state, action: PayloadAction<Partial<UserPreferences>>) => {
      state.userPreferences = {
        ...state.userPreferences,
        ...action.payload,
      };
    },
    
    // App State Management
    incrementAppLaunchCount: (state) => {
      state.appLaunchCount += 1;
    },
    
    setLastAppVersion: (state, action: PayloadAction<string>) => {
      state.lastAppVersion = action.payload;
    },
    
    // Loading State
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    // Background State Management
    setBackgroundEnterTime: (state, action: PayloadAction<Date | null>) => {
      state.backgroundEnterTime = action.payload;
    },
    
    // Sync User Data from Server
    syncUserData: (state, action: PayloadAction<{
      totalPoint?: number;
      avatarId?: number;
      equippedItems?: Record<string, AvatarItem>;
      level?: number;
    }>) => {
      const { totalPoint, avatarId, equippedItems, level } = action.payload;
      
      if (totalPoint !== undefined) {
        console.log(`💰 [UserState] Point updated: ${state.totalPoint} -> ${totalPoint}`);
        state.totalPoint = totalPoint;
      }
      
      if (avatarId !== undefined && avatarId !== state.avatarId) {
        console.log(`👤 [UserState] Avatar updated: ${state.avatarId} -> ${avatarId}`);
        state.avatarId = avatarId;
      }
      
      if (equippedItems) {
        state.equippedItems = equippedItems;
      }
      
      if (level !== undefined && state.currentUser) {
        state.currentUser.level = level;
      }
    },
    
    // Reset App State (개발/디버그용)
    resetAppState: () => initialState,
  },
});

export const {
  setLoginData,
  logout,
  updateProfile,
  disconnectAccount,
  connectAccount,
  earnPoints,
  setTotalPoint,
  setTokens,
  setNickname,
  setLevel,
  setAvatarId,
  setEquippedItems,
  setUserPreferences,
  updateUserPreferences,
  incrementAppLaunchCount,
  setLastAppVersion,
  setLoading,
  setBackgroundEnterTime,
  syncUserData,
  resetAppState,
} = userSlice.actions;

export default userSlice.reducer;