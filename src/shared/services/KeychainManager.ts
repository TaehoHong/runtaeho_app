import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Keychain Manager
 * SwiftUI의 KeychainManager와 동일한 역할
 * 
 * react-native-keychain을 사용하여 보안 저장소 구현
 * iOS: Keychain Services
 * Android: Android Keystore
 */
export class KeychainManager {
  private static instance: KeychainManager;
  
  // 서비스 이름 (iOS Keychain Service로 사용)
  private readonly SERVICE_NAME = 'com.runtaeho.app';
  
  private constructor() {}
  
  static getInstance(): KeychainManager {
    if (!KeychainManager.instance) {
      KeychainManager.instance = new KeychainManager();
    }
    return KeychainManager.instance;
  }
  
  /**
   * 키체인에 값 저장
   * SwiftUI KeychainManager.save와 동일
   */
  async save(key: string, value: string): Promise<void> {
    try {
      // react-native-keychain은 username/password 쌍으로 저장
      // key를 username으로, value를 password로 사용
      const result = await Keychain.setInternetCredentials(
        this.SERVICE_NAME,
        key,
        value,
        {
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          accessGroup: undefined, // iOS only
          service: `${this.SERVICE_NAME}.${key}`, // 각 키마다 고유 서비스
        }
      );
      
      if (result) {
        console.log(`🔐 [KeychainManager] Securely saved ${key}`);
      } else {
        // Fallback to AsyncStorage if Keychain fails
        console.warn(`⚠️ [KeychainManager] Keychain save failed for ${key}, using fallback`);
        await this.saveFallback(key, value);
      }
    } catch (error) {
      console.error(`❌ [KeychainManager] Failed to save ${key}:`, error);
      // Fallback to AsyncStorage
      await this.saveFallback(key, value);
    }
  }
  
  /**
   * 키체인에서 값 로드
   * SwiftUI KeychainManager.load와 동일
   */
  async load(key: string): Promise<string | null> {
    try {
      // 먼저 Keychain에서 시도
      const credentials = await Keychain.getInternetCredentials(
        `${this.SERVICE_NAME}.${key}`
      );
      
      if (credentials) {
        console.log(`🔐 [KeychainManager] Securely loaded ${key}`);
        return credentials.password;
      }
      
      // Keychain에 없으면 fallback 확인
      const fallbackValue = await this.loadFallback(key);
      if (fallbackValue) {
        console.log(`📦 [KeychainManager] Loaded ${key} from fallback`);
        // Keychain으로 마이그레이션
        await this.save(key, fallbackValue);
      }
      
      return fallbackValue;
    } catch (error) {
      console.error(`❌ [KeychainManager] Failed to load ${key}:`, error);
      // Fallback to AsyncStorage
      return await this.loadFallback(key);
    }
  }
  
  /**
   * 키체인에서 값 삭제
   * SwiftUI KeychainManager.delete와 동일
   */
  async delete(key: string): Promise<void> {
    try {
      // Keychain에서 삭제
      const result = await Keychain.resetInternetCredentials(
        `${this.SERVICE_NAME}.${key}`
      );
      
      if (result) {
        console.log(`🔐 [KeychainManager] Securely deleted ${key}`);
      }
      
      // Fallback도 삭제
      await this.deleteFallback(key);
    } catch (error) {
      console.error(`❌ [KeychainManager] Failed to delete ${key}:`, error);
      // Fallback 삭제 시도
      await this.deleteFallback(key);
    }
  }
  
  /**
   * 모든 키체인 데이터 삭제 (디버그용)
   */
  async clearAll(): Promise<void> {
    try {
      // 저장된 모든 키 목록
      const keysToDelete = [
        KeychainKeys.AUTH_TOKEN,
        KeychainKeys.REFRESH_TOKEN,
      ];
      
      // 각 키 삭제
      await Promise.all(
        keysToDelete.map(key => this.delete(key))
      );
      
      console.log(`🔐 [KeychainManager] Cleared all secure storage`);
    } catch (error) {
      console.error('❌ [KeychainManager] Failed to clear all:', error);
    }
  }
  
  /**
   * 디바이스가 생체 인증을 지원하는지 확인
   */
  async getSupportedBiometryType(): Promise<Keychain.BIOMETRY_TYPE | null> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      console.log(`🔐 [KeychainManager] Supported biometry: ${biometryType}`);
      return biometryType;
    } catch (error) {
      console.error('❌ [KeychainManager] Failed to get biometry type:', error);
      return null;
    }
  }
  
  /**
   * 생체 인증으로 보호된 저장
   */
  async saveWithBiometry(key: string, value: string, promptMessage?: string): Promise<void> {
    try {
      const biometryType = await this.getSupportedBiometryType();
      
      if (!biometryType) {
        // 생체 인증 미지원시 일반 저장
        return await this.save(key, value);
      }
      
      const options: Keychain.Options = {
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        authenticatePrompt: promptMessage || '인증이 필요합니다',
        authenticationPrompt: {
          title: '생체 인증',
          subtitle: '안전한 저장을 위해 인증해주세요',
          description: promptMessage,
          cancel: '취소',
        },
        service: `${this.SERVICE_NAME}.${key}.biometric`,
      };
      
      const result = await Keychain.setInternetCredentials(
        this.SERVICE_NAME,
        key,
        value,
        options
      );
      
      if (result) {
        console.log(`🔐 [KeychainManager] Securely saved ${key} with biometry`);
      }
    } catch (error) {
      console.error(`❌ [KeychainManager] Failed to save with biometry:`, error);
      throw error;
    }
  }
  
  /**
   * 생체 인증으로 보호된 로드
   */
  async loadWithBiometry(key: string, promptMessage?: string): Promise<string | null> {
    try {
      const biometryType = await this.getSupportedBiometryType();
      
      if (!biometryType) {
        // 생체 인증 미지원시 일반 로드
        return await this.load(key);
      }
      
      const options: Keychain.Options = {
        authenticationPrompt: {
          title: '생체 인증',
          subtitle: '데이터에 접근하기 위해 인증해주세요',
          description: promptMessage,
          cancel: '취소',
        },
      };
      
      const credentials = await Keychain.getInternetCredentials(
        `${this.SERVICE_NAME}.${key}.biometric`,
        options
      );
      
      if (credentials) {
        console.log(`🔐 [KeychainManager] Securely loaded ${key} with biometry`);
        return credentials.password;
      }
      
      return null;
    } catch (error) {
      console.error(`❌ [KeychainManager] Failed to load with biometry:`, error);
      return null;
    }
  }
  
  // === Fallback Methods (AsyncStorage) ===
  
  private async saveFallback(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(`keychain_fallback_${key}`, value);
  }
  
  private async loadFallback(key: string): Promise<string | null> {
    return await AsyncStorage.getItem(`keychain_fallback_${key}`);
  }
  
  private async deleteFallback(key: string): Promise<void> {
    await AsyncStorage.removeItem(`keychain_fallback_${key}`);
  }
}

// Keys enum (SwiftUI UserStateManager.Keys와 동일)
export enum KeychainKeys {
  AUTH_TOKEN = 'authToken',
  REFRESH_TOKEN = 'refreshToken',
}

// Singleton export
export const keychainManager = KeychainManager.getInstance();