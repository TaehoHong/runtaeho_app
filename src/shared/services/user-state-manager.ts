import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserAuthData } from '../../features/auth/models/UserAuthData';

interface UserState {
  isLoggedIn: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  userData: UserAuthData | null;
  equippedItems: any[]; // TODO: 아바타 아이템 타입 정의 후 수정
}

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_DATA: 'userData',
  EQUIPPED_ITEMS: 'equippedItems',
} as const;

const initialState: UserState = {
  isLoggedIn: false,
  accessToken: null,
  refreshToken: null,
  userData: null,
  equippedItems: [],
};

export class UserStateManager {
  private static instance: UserStateManager;
  private state: UserState = { ...initialState };
  private listeners: Array<(state: UserState) => void> = [];

  private constructor() {
    this.loadStoredState();
  }

  static getInstance(): UserStateManager {
    if (!UserStateManager.instance) {
      UserStateManager.instance = new UserStateManager();
    }
    return UserStateManager.instance;
  }

  // State 접근자들
  get isLoggedIn(): boolean {
    return this.state.isLoggedIn;
  }

  get accessToken(): string | null {
    return this.state.accessToken;
  }

  get refreshToken(): string | null {
    return this.state.refreshToken;
  }

  get userData(): UserAuthData | null {
    return this.state.userData;
  }

  get equippedItems(): any[] {
    return this.state.equippedItems;
  }

  get currentState(): UserState {
    return { ...this.state };
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
      const equippedItems = equippedItemsString ? JSON.parse(equippedItemsString) : [];

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

  async updateEquippedItems(items: any[]): Promise<void> {
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
}