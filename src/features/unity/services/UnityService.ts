/**
 * Unity Bridge Service for React Native
 * Unity와 React Native 간의 통신을 담당하는 서비스
 *
 * UnityBridge의 Push + Pull 패턴을 활용하여
 * Race Condition 없이 안정적으로 Unity 통신 관리
 */

import { UnityBridge } from '../bridge/UnityBridge';
import { type CharacterMotion, type UnityAvatarDtoList } from '../types/UnityTypes';
import type { Item } from '~/features/avatar';
import { getUnityPartName } from '~/features/avatar/models/avatarConstants';

/**
 * Unity Bridge Service 클래스
 * React Native와 Unity 간의 모든 통신을 관리하며 도메인 로직을 포함
 */
export class UnityService {
  private static instance: UnityService;

  private static readonly UNITY_OBJECT_NAME = 'Charactor';
  private static readonly UNITY_SPEED_METHOD = 'SetSpeed';
  private static readonly UNITY_MOTION_METHOD = 'SetTrigger';
  private static readonly CHANGE_AVATAR = 'SetSprites';
  private static readonly MIN_SPEED = 3.0;
  private static readonly MAX_SPEED = 7.0;
  private static readonly VALID_MOTIONS: CharacterMotion[] = ['IDLE', 'MOVE', 'ATTACK', 'DAMAGED'];

  static getInstance = (): UnityService => {
    if (!UnityService.instance) {
      UnityService.instance = new UnityService();
    }
    return UnityService.instance;
  };

  constructor() {
    this.log('Service initialized');
  }

  /**
   * 현재 Ready 상태 (동기)
   */
  isReady(): boolean {
    const ready = UnityBridge.isGameObjectReady();
    this.log(`isReady: ${ready}`);
    return ready;
  }

  /**
   * Ready 상태와 Native 동기화 (비동기)
   * 이벤트를 놓쳤을 수 있으므로 Native에서 확인
   */
  async syncReady(): Promise<boolean> {
    const ready = await UnityBridge.syncReadyState();
    this.log(`syncReady: ${ready}`);
    return ready;
  }

  /**
   * Ready 시 콜백 실행
   * - 이미 ready면 즉시 실행
   * - 아니면 UnityBridge에 구독 (Native 상태도 확인)
   */
  onReady(callback: () => void): () => void {
    return UnityBridge.subscribeToGameObjectReady(callback);
  }

  /**
   * Ready 상태 리셋
   */
  async resetGameObjectReady(): Promise<void> {
    this.log('Resetting Ready state');
    await UnityBridge.resetGameObjectReady();
  }
  
  // ==========================================
  // Unity 화면 제어 (UnityView 컴포넌트에서 처리)
  // ==========================================

  async showUnity(): Promise<void> {
    this.log('Showing Unity (handled by UnityView component)');
    // UnityView 컴포넌트가 직접 Unity를 표시/숨김 처리
  }

  async hideUnity(): Promise<void> {
    this.log('Hiding Unity (handled by UnityView component)');
    // UnityView 컴포넌트가 직접 Unity를 표시/숨김 처리
  }
  
  // ==========================================
  // Unity 제어 메서드들 (도메인 로직 포함)
  // ==========================================

  async initCharacter(items: Item[], hairColor?: string): Promise<void> {
    if (items.length > 0) {
      this.log(`Initializing character with ${items.length} items`);
      await this.changeAvatar(items, hairColor);
    }

    // Unity 캐릭터 초기 속도 설정
    await this.stopCharacter();
  }
  
  async setCharacterSpeed(speed: number): Promise<void> {
    this.log(`Setting character speed: ${speed}`);

    if (!this.isReady()) {
      this.log('⚠️ GameObject not ready, message will be queued');
    }

    try {
      const clampedSpeed = Math.max(UnityService.MIN_SPEED, Math.min(speed, UnityService.MAX_SPEED));

      const speedString = clampedSpeed.toString();
      await UnityBridge.sendUnityMessage(
        UnityService.UNITY_OBJECT_NAME,
        UnityService.UNITY_SPEED_METHOD,
        speedString
      );

      this.log(`Character speed set to ${clampedSpeed}`);
    } catch (error) {
      this.logError('Failed to set character speed', error);
      throw error;
    }
  }
  
  async stopCharacter(): Promise<void> {
    this.log('Stopping character');

    if (!this.isReady()) {
      this.log('⚠️ GameObject not ready, message will be queued');
    }

    try {
      await UnityBridge.sendUnityMessage(
        UnityService.UNITY_OBJECT_NAME,
        UnityService.UNITY_SPEED_METHOD,
        '0'
      );

      this.log('Character stopped');
    } catch (error) {
      this.logError('Failed to stop character', error);
      throw error;
    }
  }
  
  async setCharacterMotion(motion: CharacterMotion): Promise<void> {
    this.log(`Setting character motion: ${motion}`);

    if (!this.isReady()) {
      this.log('⚠️ GameObject not ready, message will be queued');
    }

    try {
      if (!UnityService.VALID_MOTIONS.includes(motion)) {
        throw new Error(`Invalid motion: ${motion}. Valid motions: ${UnityService.VALID_MOTIONS.join(', ')}`);
      }

      await UnityBridge.sendUnityMessage(
        UnityService.UNITY_OBJECT_NAME,
        UnityService.UNITY_MOTION_METHOD,
        motion
      );

      this.log(`Character motion set to ${motion}`);
    } catch (error) {
      this.logError('Failed to set character motion', error);
      throw error;
    }
  }
  
  async changeAvatar(items: Item[], hairColor?: string): Promise<void> {
    this.log(`Changing avatar with ${items.length} items, hairColor: ${hairColor}`);

    if (!this.isReady()) {
      this.log('⚠️ GameObject not ready, message will be queued');
    }

    try {
      const validatedItems = this.validateAvatarItems(items);

      // items가 비어있고 hairColor도 없으면 업데이트할 것이 없음
      if (validatedItems.length === 0 && !hairColor) {
        this.log('No valid avatar items and no hairColor provided, skipping update');
        return;
      }

      const unityData = this.convertToUnityAvatarDtoList(validatedItems, hairColor);
      const jsonString = JSON.stringify(unityData);

      this.log('Unity Avatar Data:', jsonString);

      await UnityBridge.sendUnityMessage(
        UnityService.UNITY_OBJECT_NAME,
        UnityService.CHANGE_AVATAR,
        jsonString
      );

      this.log(`Avatar changed with ${validatedItems.length} items, hairColor: ${hairColor}`);
    } catch (error) {
      this.logError('Failed to change avatar', error);
      throw error;
    }
  }
  
  // ==========================================
  // 도메인 로직 헬퍼 메서드들
  // ==========================================

  /**
   * Item 배열을 Unity가 기대하는 UnityAvatarDtoList로 변환
   * Unity의 SpriteSettingDto 구조에 맞게 각 아이템에 hairColor 포함
   */
  private convertToUnityAvatarDtoList(items: Item[], hairColor?: string): UnityAvatarDtoList {
    const list = items.map(item => {
      const partName = getUnityPartName(item.itemType.id);
      return {
        name: item.name,
        part: partName,
        itemPath: item.unityFilePath + item.name,
        // Hair 파트에만 hairColor 추가 (Unity에서 Hair 파트만 색상 적용)
        ...(partName === 'Hair' && hairColor ? { hairColor } : {}),
      };
    });

    return { list };
  }

  private validateAvatarItems(items: Item[]): Item[] {
    return items.filter(item => {
      // 필수 필드 검증
      if (!item.name || !item.itemType || !item.filePath || !item.unityFilePath) {
        this.log(`Invalid item: missing required fields name: ${item.name}, itemType: ${item.itemType.id}, filePath: ${item.filePath}, unityFilePath: ${item.unityFilePath}`);
        return false;
      }

      return true;
    });
  }
  
  private log(message: string, ...args: any[]): void {
    if (__DEV__) {
      console.log(`[UnityBridgeService] ${message}`, ...args);
    }
  }
  
  private logError(message: string, error: any): void {
    console.error(`[UnityBridgeService] ${message}`, error);
  }
  
}

export const unityService = UnityService.getInstance();