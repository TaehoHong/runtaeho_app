import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthProviderType } from '../../features/auth/models/AuthType';
import { SilentTokenRefreshService } from '../../features/auth/services/SilentTokenRefreshService';
import type { User } from '../../features/user/models/User';
import type { UserAccount } from '../../features/user/models/UserAccount';
import { userDataDtoToUser, type UserDataDto } from '../../features/user/models/UserDataDto';
import { useAuthStore } from '../../features/auth/stores/authStore';
import { useUserStore, type UserPreferences } from '../../stores/user/userStore';
import { tokenStorage } from '../../utils/storage';
import { systemInfoManager } from '../utils/SystemInfoManager';
import { PermissionManager } from './PermissionManager';
import { TokenStatus, tokenUtils } from '../../features/auth//utils/tokenUtils'
import type { AvatarItem, EquippedItemsMap } from '~/features/avatar';

// Storage Keys (SwiftUI UserStateManager.Keys와 동일)
const STORAGE_KEYS = {
  CURRENT_USER: 'currentUser',
  IS_LOGGED_IN: 'isLoggedIn',
  USER_PREFERENCES: 'userPreferences',
  APP_LAUNCH_COUNT: 'appLaunchCount',
  LAST_APP_VERSION: 'lastAppVersion',
  TOTAL_POINT: 'totalPoint',
  AVATAR_ID: 'avatarId',
  EQUIPPED_ITEMS: 'equippedItems',
} as const;

/**
 * User State Manager
 * SwiftUI UserStateManager와 동일한 구조
 * Zustand를 통해 상태 관리 (Phase 3: Redux → Zustand 마이그레이션 완료)
 */
export class UserStateManager {
  private static instance: UserStateManager;
  private appStateSubscription: any;
  private backgroundEnterTime: Date | null = null;
  private refreshInFlight: Promise<void> | null = null;

  // MARK: - Initialization
  private constructor() {
    this.loadUserState();
    this.incrementAppLaunchCountInternal();
  }

  static getInstance(): UserStateManager {
    if (!UserStateManager.instance) {
      UserStateManager.instance = new UserStateManager();
    }
    return UserStateManager.instance;
  }

  // MARK: - Getters (Zustand State에서 값 가져오기)

  // UserStore getters
  get currentUser(): User | null {
    return useUserStore.getState().currentUser;
  }

  get totalPoint(): number {
    return useUserStore.getState().totalPoint;
  }

  get avatarId(): number {
    return useUserStore.getState().avatarId;
  }

  get equippedItems(): EquippedItemsMap {
    return useUserStore.getState().equippedItems;
  }

  get userPreferences(): UserPreferences {
    return useUserStore.getState().userPreferences;
  }

  get appLaunchCount(): number {
    return useUserStore.getState().appLaunchCount;
  }

  get lastAppVersion(): string | null {
    return useUserStore.getState().lastAppVersion;
  }

  get userAccounts(): UserAccount[] {
    return this.currentUser?.userAccounts ?? [];
  }

  get points(): number {
    return this.totalPoint;
  }

  // AuthStore getters
  get isLoggedIn(): boolean {
    return useAuthStore.getState().isLoggedIn;
  }

  get isLoading(): boolean {
    return useAuthStore.getState().isLoading;
  }

  // Token getters (토큰은 SecureStorage에서만 관리)
  // ⚠️ Deprecated: TokenRefreshInterceptor와 tokenUtils에서 tokenStorage 직접 사용 권장
  // 동기적 접근 불가능 - async 메서드 사용 필요
  async getAccessToken(): Promise<string | null> {
    return await tokenStorage.getAccessToken();
  }

  async getRefreshToken(): Promise<string | null> {
    return await tokenStorage.getRefreshToken();
  }

  // MARK: - Public Methods
  
  async login(userData: UserDataDto, authToken: string, refreshToken?: string): Promise<void> {
    try {
      // UserDataDto를 User로 변환
      const user = userDataDtoToUser(userData);

      // UserStore에 사용자 데이터 저장 (토큰 제외)
      useUserStore.getState().setLoginData({
        user,
        totalPoint: userData.totalPoint,
        avatarId: userData.avatarId,
        equippedItems: this.convertEquippedItems(userData.equippedItems),
      });

      // AuthStore에 로그인 상태 저장
      useAuthStore.getState().login();

      // 토큰 저장 (Keychain에만)
      await this.setTokens(authToken, refreshToken);

      // 상태 저장
      await this.saveUserState();
    } catch (error) {
      console.error('❌ [UserStateManager] Login failed:', error);
      throw error;
    }
  }

  /**
   * 사용자 로그아웃
   * SwiftUI UserStateManager.logout과 동일
   */
  async logout(): Promise<void> {
    try {
      // UserStore 상태 초기화
      useUserStore.getState().logout();

      // AuthStore 상태 초기화
      useAuthStore.getState().logout();

      // 저장된 상태 삭제
      await this.clearUserState();
    } catch (error) {
      console.error('❌ [UserStateManager] Logout failed:', error);
      throw error;
    }
  }

  /**
   * 프로필 업데이트
   * SwiftUI UserStateManager.updateProfile과 동일
   */
  updateProfile(nickname?: string, imageURL?: string): void {
    if (!this.currentUser) return;

    useUserStore.getState().updateProfile({
      nickname: nickname || '',
      profileImageURL: imageURL || '',
    });

    this.saveUserState();
  }

  /**
   * 계정 연결 해제
   * SwiftUI UserStateManager.disconnectAccount와 동일
   */
  disconnectAccount(provider: AuthProviderType): void {
    if (!this.currentUser) return;

    useUserStore.getState().disconnectAccount(provider);
    this.saveUserState();
  }

  /**
   * 계정 연결
   * SwiftUI UserStateManager.connectAccount와 동일
   */
  connectAccount(account: UserAccount): void {
    if (!this.currentUser) return;

    useUserStore.getState().connectAccount(account);
    this.saveUserState();
  }

  /**
   * 포인트 획득
   * SwiftUI UserStateManager.earnPoints와 동일
   */
  earnPoints(points: number): void {
    useUserStore.getState().earnPoints(points);
    this.saveUserState();
  }

  /**
   * 환경설정 설정
   * SwiftUI UserStateManager.setPreferences와 동일
   */
  async setPreferences(preferences: UserPreferences): Promise<void> {
    useUserStore.getState().setUserPreferences(preferences);
    await this.saveUserPreferences();
  }

  /**
   * 토큰 설정
   * SwiftUI UserStateManager.setTokens와 동일
   * Phase 4: SecureStorage에만 저장 (Store에 저장하지 않음)
   */
  async setTokens(accessToken: string, refreshToken?: string): Promise<void> {
    // SecureStorage에 직접 저장
    if (accessToken) {
      if (refreshToken) {
        await tokenStorage.saveTokens(accessToken, refreshToken);
      } else {
        await tokenStorage.updateAccessToken(accessToken);
      }
    } else {
      await tokenStorage.clearTokens();
    }
  }

  /**
   * 계정 연결 해제 (중복 제거용)
   * SwiftUI UserStateManager.removeUserAccount와 동일
   */
  removeUserAccount(provider: AuthProviderType): void {
    this.disconnectAccount(provider);
  }
  
  /**
   * 앱 상태 초기화 (개발/디버그용)
   * SwiftUI UserStateManager.resetAppState와 동일
   */
  async resetAppState(): Promise<void> {
    await this.logout();
    useUserStore.getState().resetAppState();

    // UserDefaults(AsyncStorage) 클리어
    const keysToRemove = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keysToRemove);

    // SecureStorage 클리어
    await tokenStorage.clearTokens();
  }

  // MARK: - 토큰 검증 및 갱신
  /**
   * 토큰 상태 확인 및 갱신
   * SwiftUI UserStateManager.verifyTokens와 동일
   */
  async verifyTokens(): Promise<void> {
    if (!this.isLoggedIn) {
      console.log('⚪ [UserStateManager] No user logged in');
      return;
    }

    // Keychain에서 토큰 로드
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      console.log('⚪ [UserStateManager] No token available');
      return;
    }

    const tokenStatus = tokenUtils.verifyToken(accessToken)

    switch (tokenStatus) {
      case TokenStatus.VALID:
        console.log('🟢 [UserStateManager] Token is valid');
        break;

      case TokenStatus.SOON_EXPIRING:
        console.log('🟡 [UserStateManager] Token expiring soon, performing proactive refresh');
        await this.refreshTokensProactively();
        break;

      case TokenStatus.EXPIRED:
        console.log('🔴 [UserStateManager] Token expired, attempting refresh');
        await this.refreshTokensProactively();
        break;

      case TokenStatus.NO_TOKEN:
        console.log('⚪ [UserStateManager] No token found, user will be logged out');
        await this.logout();
        break;
    }
  }

  /**
   * 토큰 갱신 수행
   * SwiftUI UserStateManager.refreshTokensProactively와 동일
   */
  private async refreshTokensProactively(): Promise<void> {
    // 동시성 가드: 진행 중인 리프레시가 있으면 그걸 기다린다.
    if (this.refreshInFlight) {
      console.log('🔁 [UserStateManager] Token refresh already in progress; awaiting existing task');
      await this.refreshInFlight;
      return;
    }

    this.refreshInFlight = (async () => {
      try {
        console.log('🔄 [UserStateManager] Starting token refresh');

        const refreshService = SilentTokenRefreshService.getInstance();
        const newTokens = await refreshService.performSilentRefresh();

        await this.setTokens(newTokens.accessToken, newTokens.refreshToken);

        console.log('✅ [UserStateManager] Token refresh successful');

        // TODO: NotificationCenter 대신 EventEmitter 또는 Redux action 사용
        // EventEmitter.emit('ProactiveTokenRefreshSuccess');
      } catch (error: any) {
        if (error?.message === 'RefreshTokenExpired') {
          console.log('💀 [UserStateManager] Refresh token expired; logging out');
          await this.logout();
        } else if (error?.message === 'MaxRetryExceeded') {
          console.log('❌ [UserStateManager] Max retry exceeded; logging out');
          await this.logout();
        } else {
          console.log('⚠️ [UserStateManager] Token refresh failed:', error);
        }
        // 주의: 상위 호출부와 이벤트 리스너의 안정성을 위해 여기서 throw하지 않는다.
        // 실패는 로그/로그아웃으로 처리하고, 호출자는 다음 verify 주기에 재평가한다.
      } finally {
        this.refreshInFlight = null; // 반드시 해제하여 다음 시도를 허용
      }
    })();

    await this.refreshInFlight;
  }

  /**
   * 시스템 권한 상태 확인
   * SwiftUI UserStateManager.checkSystemPermissions와 동일
   */
  private async checkSystemPermissions(): Promise<void> {
    console.log('🔐 [UserStateManager] Checking system permissions');

    // 위치 권한 확인 (러닝 앱에 중요)
    await this.checkLocationPermission();

    // 알림 권한 확인
    await this.checkNotificationPermission();
  }

  /**
   * 위치 권한 상태 확인
   * SwiftUI UserStateManager.checkLocationPermission과 동일
   */
  private async checkLocationPermission(): Promise<void> {
    const permissionManager = PermissionManager.getInstance();
    const status = await permissionManager.checkLocationPermission();
    console.log(`📍 [UserStateManager] Location permission: ${status}`);
  }

  /**
   * 알림 권한 상태 확인
   * SwiftUI UserStateManager.checkNotificationPermission과 동일
   */
  private async checkNotificationPermission(): Promise<void> {
    const permissionManager = PermissionManager.getInstance();
    const status = await permissionManager.checkNotificationPermission();
    console.log(`🔔 [UserStateManager] Notification permission: ${status}`);
  }

  /**
   * 대기중인 작업들 처리
   * SwiftUI UserStateManager.handlePendingTasks와 동일
   */
  private async handlePendingTasks(): Promise<void> {
    console.log('📋 [UserStateManager] Handling pending background tasks');
    // 백그라운드에서 실패한 API 호출 재시도 등
  }

  /**
   * 토큰 만료까지 남은 시간
   * SwiftUI UserStateManager.tokenTimeRemaining과 동일
   * ⚠️ Deprecated: async 버전 사용 필요
   */
  async getTokenTimeRemaining(): Promise<number | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    const payload = this.parseTokenPayload(token);
    if (!payload?.exp) return null;

    const currentTime = Date.now() / 1000;
    const remainingTime = payload.exp - currentTime;

    return Math.max(0, remainingTime);
  }

  /**
   * JWT 토큰 페이로드 파싱
   * SwiftUI UserStateManager.parseTokenPayload와 동일
   */
  private parseTokenPayload(token: string): { exp?: number } | null {
    try {
      const components = token.split('.');
      if (components.length !== 3) return null;

      const payload = components[1];
      if (!payload) return null;

      // Base64 URL 디코딩
      let base64 = payload
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const remainder = base64.length % 4;
      if (remainder > 0) {
        base64 = base64.padEnd(base64.length + 4 - remainder, '=');
      }

      const decoded = atob(base64);
      return JSON.parse(decoded) as { exp?: number };
    } catch (error) {
      console.error('Failed to parse token payload:', error);
      return null;
    }
  }

  // MARK: - Private Methods
  
  /**
   * 사용자 상태 로드
   * SwiftUI UserStateManager.loadUserState와 동일
   */
  private async loadUserState(): Promise<void> {
    try {
      // 1) 토큰 로드 (Keychain에서) - access/refreshToken이 Redux에 먼저 들어가야 함
      await this.loadTokensFromKeychain();

      // 2) 사용자 환경설정 로드
      await this.loadUserPreferences();

      // 3) 사용자 정보, 로그인 상태, 포인트, 아바타, 장착 아이템 로드
      const [userDataString, isLoggedInString, totalPointStr, avatarIdStr,equippedItemsStr,] = 
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER),
          AsyncStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN),
          AsyncStorage.getItem(STORAGE_KEYS.TOTAL_POINT),
          AsyncStorage.getItem(STORAGE_KEYS.AVATAR_ID),
          AsyncStorage.getItem(STORAGE_KEYS.EQUIPPED_ITEMS),
        ]);

      // 앱 실행 정보 로드 (기존)
      // const appLaunchCount = await AsyncStorage.getItem(STORAGE_KEYS.APP_LAUNCH_COUNT);
      // const lastAppVersion = await AsyncStorage.getItem(STORAGE_KEYS.LAST_APP_VERSION);

      // 4) Zustand rehydrate: 로그인 상태 체크
      // accessToken/refreshToken은 이미 loadTokensFromKeychain에서 Keychain에 로드됨
      const hasAccessToken = await this.getAccessToken();
      const hasRefreshToken = await this.getRefreshToken();

      if (
        isLoggedInString === 'true' &&
        (userDataString && (hasAccessToken || hasRefreshToken))
      ) {
        let user: User | null = null;
        let totalPoint = 0;
        let avatarId = 0;
        let equippedItems: Record<string, AvatarItem> = {};
        try {
          user = JSON.parse(userDataString) as User;

          if (typeof totalPointStr === 'string') {
            const parsed = Number(totalPointStr);
            if (!isNaN(parsed)) totalPoint = parsed;
          }
          if (typeof avatarIdStr === 'string') {
            const parsed = Number(avatarIdStr);
            if (!isNaN(parsed)) avatarId = parsed;
          }
          if (typeof equippedItemsStr === 'string') {
            try {
              equippedItems = JSON.parse(equippedItemsStr);
            } catch (e) {
              console.error('Failed to parse equippedItems:', e);
              equippedItems = {};
            }
          }
        } catch (e) {
          console.error('Failed to parse user state for rehydration:', e);
        }

        if (!user) {
          return;
        }

        useUserStore.getState().setLoginData({
          user,
          totalPoint,
          avatarId,
          equippedItems,
        });
      }
    } catch (error) {
      console.error('Failed to load user state:', error);
    }
  }

  /**
   * 사용자 상태 저장
   * SwiftUI UserStateManager.saveUserState와 동일
   */
  private async saveUserState(): Promise<void> {
    try {
      // 사용자 정보 저장
      const currentUser = this.currentUser;
      if (currentUser) {
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      }

      // 로그인 상태 저장
      await AsyncStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, String(this.isLoggedIn));

      // 추가: 포인트, 아바타ID, 장착 아이템 저장
      await AsyncStorage.setItem(STORAGE_KEYS.TOTAL_POINT, String(this.totalPoint));
      await AsyncStorage.setItem(STORAGE_KEYS.AVATAR_ID, String(this.avatarId));
      await AsyncStorage.setItem(STORAGE_KEYS.EQUIPPED_ITEMS, JSON.stringify(this.equippedItems));
    } catch (error) {
      console.error('Failed to save user state:', error);
    }
  }

  /**
   * 사용자 상태 클리어
   * SwiftUI UserStateManager.clearUserState와 동일
   */
  private async clearUserState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      await AsyncStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'false');
      // 추가: 포인트/아바타ID/장착아이템 삭제
      await AsyncStorage.removeItem(STORAGE_KEYS.TOTAL_POINT);
      await AsyncStorage.removeItem(STORAGE_KEYS.AVATAR_ID);
      await AsyncStorage.removeItem(STORAGE_KEYS.EQUIPPED_ITEMS);

      // SecureStorage에서 토큰 삭제
      await tokenStorage.clearTokens();
    } catch (error) {
      console.error('Failed to clear user state:', error);
    }
  }

  /**
   * 토큰을 SecureStorage에서 로드
   * SwiftUI UserStateManager.loadTokensFromKeychain과 동일
   * Phase 4: SecureStorage에서만 로드 (Store에 저장하지 않음)
   */
  private async loadTokensFromKeychain(): Promise<void> {
    // SecureStorage에서 로드만 수행 (검증용)
    const { accessToken, refreshToken } = await tokenStorage.loadTokens();

    if (accessToken || refreshToken) {
      console.log('🔐 [UserStateManager] Tokens loaded from SecureStorage');
    }
  }

  /**
   * 사용자 환경설정 로드
   * SwiftUI UserStateManager.loadUserPreferences와 동일
   */
  private async loadUserPreferences(): Promise<void> {
    try {
      const preferencesString = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      if (preferencesString) {
        const preferences = JSON.parse(preferencesString) as UserPreferences;
        useUserStore.getState().setUserPreferences(preferences);
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  }

  /**
   * 사용자 환경설정 저장
   * SwiftUI UserStateManager.saveUserPreferences와 동일
   */
  private async saveUserPreferences(): Promise<void> {
    try {
      const preferences = this.userPreferences;
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  }

  /**
   * 앱 실행 횟수 증가
   * SwiftUI UserStateManager.incrementAppLaunchCount와 동일
   */
  private async incrementAppLaunchCountInternal(): Promise<void> {
    useUserStore.getState().incrementAppLaunchCount();

    const appLaunchCount = this.appLaunchCount;
    await AsyncStorage.setItem(STORAGE_KEYS.APP_LAUNCH_COUNT, String(appLaunchCount));

    // 현재 앱 버전 저장 (SystemInfoManager 사용)
    const fullVersion = systemInfoManager.getFullVersionString();
    useUserStore.getState().setLastAppVersion(fullVersion);
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_APP_VERSION, fullVersion);

    console.log(`📱 [UserStateManager] App version: ${fullVersion}`);
    console.log(`📱 [UserStateManager] Launch count: ${appLaunchCount}`);

    // 개발 환경에서는 시스템 정보 출력
    if (__DEV__ && appLaunchCount === 1) {
      systemInfoManager.printDebugInfo();
    }
  }

  /**
   * EquippedItemDataDto를 AvatarItem으로 변환
   */
  private convertEquippedItems(equippedItems: any[]): Record<string, AvatarItem> {
    // TODO: 실제 ItemType enum 값에 맞게 수정 필요
    const result: Record<string, AvatarItem> = {};
    
    equippedItems.forEach(item => {
      // itemTypeId를 key로 사용 (임시)
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
  }

  /**
   * 클린업 (컴포넌트 unmount 시 호출)
   */
  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
  }
}

// Singleton export
export const userStateManager = UserStateManager.getInstance();