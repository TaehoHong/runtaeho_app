/**
 * Unity Bridge
 *
 * 원칙:
 * - SRP: Unity 통신만 담당
 * - 타입 안정성: TypeScript 타입 정의
 * - 에러 처리: Unity 미지원 환경 대응
 *
 * React Native ↔ Unity 통신
 */

import { NativeModules, Platform } from 'react-native';
import type { AvatarItem, ItemType, EquippedItemsMap } from '~/features/avatar';

/**
 * Unity Native Module 타입 정의
 */
interface UnityNativeModule {
  initialize: () => void;
  changeAvatar: (data: string) => void;
  updateCharacter: (data: string) => void;
}

/**
 * Unity에 전달할 아이템 데이터
 */
interface UnityAvatarData {
  itemType: ItemType;
  unityFilePath: string;
}

/**
 * Unity Bridge 싱글톤
 */
class UnityBridgeService {
  private nativeModule: UnityNativeModule | null = null;
  private isInitialized = false;

  constructor() {
    // Native Module 로드
    if (NativeModules.UnityBridge) {
      this.nativeModule = NativeModules.UnityBridge as UnityNativeModule;
    } else {
      console.warn('[UnityBridge] Unity Native Module not available');
    }
  }

  /**
   * Unity View 초기화
   */
  initialize(): void {
    if (!this.nativeModule) {
      console.warn('[UnityBridge] Cannot initialize - module not available');
      return;
    }

    if (this.isInitialized) {
      console.log('[UnityBridge] Already initialized');
      return;
    }

    try {
      this.nativeModule.initialize();
      this.isInitialized = true;
      console.log('[UnityBridge] Initialized successfully');
    } catch (error) {
      console.error('[UnityBridge] Initialization failed:', error);
    }
  }

  /**
   * 아바타 변경 (단일 아이템)
   *
   * @param itemType - 아이템 타입
   * @param item - 아이템 정보
   */
  changeAvatarItem(itemType: ItemType, item: AvatarItem): void {
    const data: UnityAvatarData = {
      itemType,
      unityFilePath: item.unityFilePath,
    };

    this.sendToUnity('changeAvatar', data);
  }

  /**
   * 아바타 변경 (여러 아이템)
   *
   * @param items - 착용할 아이템 맵
   */
  changeAvatar(items: EquippedItemsMap): void {
    const dataArray: UnityAvatarData[] = [];

    for (const typeKey of Object.keys(items)) {
      const itemType = Number(typeKey) as ItemType;
      const item = items[itemType];
      if (item) {
        dataArray.push({
          itemType,
          unityFilePath: item.unityFilePath,
        });
      }
    }

    this.sendToUnity('changeAvatar', dataArray);
  }

  /**
   * 캐릭터 전체 업데이트
   *
   * @param equippedItems - 전체 착용 아이템
   */
  updateCharacter(equippedItems: EquippedItemsMap): void {
    const dataArray: UnityAvatarData[] = [];

    for (const typeKey of Object.keys(equippedItems)) {
      const itemType = Number(typeKey) as ItemType;
      const item = equippedItems[itemType];
      if (item) {
        dataArray.push({
          itemType,
          unityFilePath: item.unityFilePath,
        });
      }
    }

    this.sendToUnity('updateCharacter', dataArray);
  }

  /**
   * Unity에 데이터 전송 (내부 헬퍼)
   */
  private sendToUnity(method: keyof UnityNativeModule, data: unknown): void {
    if (!this.nativeModule) {
      if (__DEV__) {
        console.warn(`[UnityBridge] ${method} - module not available`);
      }
      return;
    }

    try {
      const jsonData = JSON.stringify(data);

      if (method === 'changeAvatar') {
        this.nativeModule.changeAvatar(jsonData);
      } else if (method === 'updateCharacter') {
        this.nativeModule.updateCharacter(jsonData);
      }

      if (__DEV__) {
        console.log(`[UnityBridge] ${method}:`, data);
      }
    } catch (error) {
      console.error(`[UnityBridge] ${method} failed:`, error);
    }
  }

  /**
   * Unity 사용 가능 여부 확인
   */
  isAvailable(): boolean {
    return this.nativeModule !== null;
  }

  /**
   * 플랫폼별 사용 가능 여부
   */
  get platformSupported(): boolean {
    // iOS와 Android만 지원
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }
}

/**
 * Unity Bridge 싱글톤 인스턴스
 */
export const UnityBridge = new UnityBridgeService();

/**
 * React Hook으로 Unity Bridge 사용
 */
export function useUnityBridge() {
  return {
    initialize: () => UnityBridge.initialize(),
    changeAvatarItem: (itemType: ItemType, item: AvatarItem) =>
      UnityBridge.changeAvatarItem(itemType, item),
    changeAvatar: (items: EquippedItemsMap) => UnityBridge.changeAvatar(items),
    updateCharacter: (items: EquippedItemsMap) => UnityBridge.updateCharacter(items),
    isAvailable: UnityBridge.isAvailable(),
    platformSupported: UnityBridge.platformSupported,
  };
}
