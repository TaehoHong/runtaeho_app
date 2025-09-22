import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 민감한 데이터를 위한 Secure Storage
export class SecureStorageManager {

  // 토큰 저장/조회
  static async saveToken(key: string, token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, token);
    } catch (error) {
      console.error('Failed to save token:', error);
      throw error;
    }
  }

  static async getToken(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  }

  static async deleteToken(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Failed to delete token:', error);
    }
  }

  // API 키 관리
  static async saveApiKey(service: string, apiKey: string): Promise<void> {
    const key = `api_key_${service}`;
    await this.saveToken(key, apiKey);
  }

  static async getApiKey(service: string): Promise<string | null> {
    const key = `api_key_${service}`;
    return await this.getToken(key);
  }
}

// 일반 설정을 위한 AsyncStorage
export class StorageManager {

  static async saveData(key: string, data: any): Promise<void> {
    try {
      const jsonData = JSON.stringify(data);
      await AsyncStorage.setItem(key, jsonData);
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }

  static async getData(key: string): Promise<any> {
    try {
      const jsonData = await AsyncStorage.getItem(key);
      return jsonData ? JSON.parse(jsonData) : null;
    } catch (error) {
      console.error('Failed to get data:', error);
      return null;
    }
  }

  static async removeData(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove data:', error);
    }
  }
}

// 토큰 키 상수
export const TOKEN_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  GOOGLE_API_KEY: 'google_api_key',
  USER_CREDENTIALS: 'user_credentials',
} as const;