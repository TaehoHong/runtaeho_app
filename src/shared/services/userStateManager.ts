import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserAuthData } from '../../features/auth/models/UserAuthData';
import { userService } from '../../features/user/services/UserService';
import { authenticationService } from '../../features/auth/services/AuthenticationService';
import { store } from '../../store';
import { User } from '@react-native-google-signin/google-signin';
import { AvatarItem, ItemType } from '~/features/avatar/models';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_DATA: 'userData',
  EQUIPPED_ITEMS: 'equippedItems',
} as const;


export class UserStateManager {
  private static instance: UserStateManager;
  private isLoggedIn: Boolean = false;
  private user?: User
  private listeners: Array<(state: UserState) => void> = [];
  private accessToken? : String;
  private refreshToken? : String;
  private equippedItems: Record<ItemType, AvatarItem> = {};

  private constructor() {
    this.loadStoredState();
  }

  static getInstance(): UserStateManager {
    if (!UserStateManager.instance) {
      UserStateManager.instance = new UserStateManager();
    }
    return UserStateManager.instance;
  }

  get equippedItems(): Record<ItemType, AvatarItem> {
    return this.state.equippedItems;
  }


  // 리스너 관리 (React 컴포넌트에서 구독 가능)
  addListener(listener: (state: UserState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentState));
  }

  private async loadStoredState(): Promise<void> {
    try {
      const [accessToken, refreshToken, userDataString, equippedItemsString] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER_DATA),
        AsyncStorage.getItem(STORAGE_KEYS.EQUIPPED_ITEMS),
      ]);

      const userData = userDataString ? JSON.parse(userDataString) : null;
      const equippedItems: Record<ItemType, AvatarItem> = equippedItemsString
        ? JSON.parse(equippedItemsString)
        : {};

      this.state = {
        isLoggedIn: !!(accessToken && refreshToken && userData),
        accessToken,
        refreshToken,
        userData,
        equippedItems,
      };

      this.notifyListeners();
    } catch (error) {
      console.error('Failed to load stored user state:', error);
    }
  }

  async login(userData: UserAuthData): Promise<void> {
    try {

      let userDataDto = userService.getUserDataDto();

      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, userData.accessToken),
        AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, userData.refreshToken),
        AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData)),
      ]);

      this.state = {
        ...this.state,
        isLoggedIn: true,
        accessToken: userData.accessToken,
        refreshToken: userData.refreshToken,
        userData,
      };

      this.notifyListeners();
      console.log('User logged in successfully:', userData.nickname);
    } catch (error) {
      console.error('Failed to save login data:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA),
        AsyncStorage.removeItem(STORAGE_KEYS.EQUIPPED_ITEMS),
      ]);

      this.state = { ...initialState };
      this.notifyListeners();
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Failed to clear login data:', error);
      throw error;
    }
  }

  async updateTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
        AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
      ]);

      this.state = {
        ...this.state,
        accessToken,
        refreshToken,
      };

      this.notifyListeners();
    } catch (error) {
      console.error('Failed to update tokens:', error);
      throw error;
    }
  }

  async updateUserData(userData: UserAuthData): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));

      this.state = {
        ...this.state,
        userData,
      };

      this.notifyListeners();
    } catch (error) {
      console.error('Failed to update user data:', error);
      throw error;
    }
  }

  async updateEquippedItems(items: Record<ItemType, AvatarItem>): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.EQUIPPED_ITEMS, JSON.stringify(items));

      this.state = {
        ...this.state,
        equippedItems: items,
      };

      this.notifyListeners();
    } catch (error) {
      console.error('Failed to update equipped items:', error);
      throw error;
    }
  }

  /**
   * 인증 상태 초기화 및 백엔드 동기화
   * AuthProvider에서 호출하는 메인 메서드
   * Swift UserStateManager.initializeWithBackendSync()와 동일
   */
  async initializeWithBackendSync(): Promise<AuthInitResult> {
    try {
      console.log('🔍 [UserStateManager] 인증 상태 초기화 및 백엔드 동기화 시작');

      // 1. 로컬 상태 로드 (생성자에서 이미 수행됨)
      const userData = this.userData;

      if (!userData || !this.isLoggedIn) {
        console.log('ℹ️ [UserStateManager] 저장된 인증 상태 없음');
        return { success: false, error: 'No stored auth state' };
      }

      // 2. 기본 토큰 유효성 검사
      if (!userData.accessToken ||
          authenticationService.isTokenExpired(userData.accessToken)) {
        console.log('❌ [UserStateManager] 토큰이 만료되었거나 유효하지 않음');
        await this.logout();
        return { success: false, error: 'Token expired or invalid' };
      }

      // 3. UserService를 통한 백엔드 동기화
      const userDataDto = await userService.getUserDataDto();

      if (!userDataDto) {
        console.error('❌ [UserStateManager] 백엔드 동기화 실패:', userDataDto);

        // 기타 오류의 경우 기존 데이터 그대로 사용
        console.warn('⚠️ [UserStateManager] 동기화 실패, 기존 데이터 사용');
        return { success: true, userData };
      } else {
        await this.updateUserData(userDataDto);

      }

    } catch (error) {
      console.error('❌ [UserStateManager] 인증 상태 초기화 실패:', error);
    }
  }

  /**
   * 액세스 토큰 갱신
   * TokenRefreshInterceptor에서 호출되는 메인 메서드
   * Swift UserStateManager.refreshAccessToken()과 동일
   */
  async refreshTokens(): Promise<boolean> {
    try {
      console.log('🔄 [UserStateManager] 토큰 갱신 시작');

      const currentRefreshToken = this.refreshToken;
      if (!currentRefreshToken) {
        console.log('❌ [UserStateManager] Refresh token이 없음');
        return false;
      }

      // 백엔드에 refresh token으로 새로운 토큰 요청
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1'}/auth/refresh`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: currentRefreshToken }),
        }
      );

      if (!response.ok) {
        console.log('❌ [UserStateManager] 토큰 갱신 API 실패:', response.status);

        // 401/403인 경우 refresh token도 만료된 것으로 간주
        if (response.status === 401 || response.status === 403) {
          console.log('🚪 [UserStateManager] Refresh token 만료, 로그아웃 처리');
          await this.logout();
        }

        return false;
      }

      const tokenData = await response.json();
      const { accessToken, refreshToken: newRefreshToken } = tokenData;

      if (!accessToken || !newRefreshToken) {
        console.log('❌ [UserStateManager] 응답에 토큰 정보 없음');
        return false;
      }

      // 로컬 상태 업데이트
      await this.updateTokens(accessToken, newRefreshToken);

      // Redux 상태 업데이트
      store.dispatch({
        type: 'auth/setTokens',
        payload: { accessToken, refreshToken: newRefreshToken }
      });

      console.log('✅ [UserStateManager] 토큰 갱신 성공');
      return true;

    } catch (error) {
      console.error('❌ [UserStateManager] 토큰 갱신 중 오류:', error);
      return false;
    }
  }

  /**
   * 토큰 유효성 검사 및 필요시 자동 갱신
   * API 호출 전에 호출하여 미리 토큰 상태 보장
   */
  async ensureValidTokens(): Promise<boolean> {
    try {
      const accessToken = this.accessToken;

      if (!accessToken) {
        console.log('❌ [UserStateManager] Access token이 없음');
        return false;
      }

      // 토큰이 5분 이내에 만료될 예정이면 미리 갱신
      if (authenticationService.isTokenExpired(accessToken)) {
        console.log('⏰ [UserStateManager] 토큰 만료 예정, 미리 갱신');
        return await this.refreshTokens();
      }

      return true;
    } catch (error) {
      console.error('❌ [UserStateManager] 토큰 유효성 검사 실패:', error);
      return false;
    }
  }
}