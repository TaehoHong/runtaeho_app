/**
 * Unity Bridge Service for React Native
 * Unity와 React Native 간의 통신을 담당하는 서비스
 */

import { UnityBridge } from '../bridge/UnityBridge';
import { type CharacterMotion, type UnityAvatarDto, type UnityAvatarDtoList } from '../types/UnityTypes';
import type { Item } from '~/features/avatar';
import { getUnityPartName } from '~/features/avatar/models/avatarConstants';

/**
 * Unity Bridge Service 클래스
 * React Native와 Unity 간의 모든 통신을 관리하며 도메인 로직을 포함
 */
export class UnityService {
  private static instance: UnityService
  
  // 도메인 상수들
  private static readonly UNITY_OBJECT_NAME = 'Charactor';
  private static readonly UNITY_SPEED_METHOD = 'SetSpeed';
  private static readonly UNITY_MOTION_METHOD = 'SetTrigger';
  private static readonly CHANGE_AVATAR = 'SetSprites';
  private static readonly MIN_SPEED = 3.0;
  private static readonly MAX_SPEED = 7.0;
  private static readonly VALID_MOTIONS: CharacterMotion[] = ['IDLE', 'MOVE', 'ATTACK', 'DAMAGED'];
  
  static getInstance = (): UnityService => {
    if(!UnityService.instance) {
      UnityService.instance = new UnityService()
    }
    return UnityService.instance;
  };
  
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
  
  async setCharacterSpeed(speed: number): Promise<void> {
    this.log(`Setting character speed: ${speed}`);

    try {
      // 도메인 로직: 속도 범위 검증 및 변환
      let clampedSpeed
      if (speed >= UnityService.MAX_SPEED) {
        clampedSpeed = UnityService.MAX_SPEED
      } else if (speed <= UnityService.MIN_SPEED) {
        clampedSpeed = UnityService.MIN_SPEED
      } else {
        clampedSpeed = UnityService.MIN_SPEED + (speed - UnityService.MAX_SPEED) * 0.4
      }

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

    try {
      // 도메인 로직: 캐릭터 정지는 속도를 0으로 설정하고 IDLE 상태로 변경
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

    try {
      // 도메인 로직: 모션 타입 검증
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
  
  async changeAvatar(items: Item[]): Promise<void> {
    this.log(`Changing avatar with ${items.length} items`);
    this.log(`Changing avatar items:  ${items}`);

    try {
      // 1. 도메인 로직: 아바타 아이템 검증
      const validatedItems = this.validateAvatarItems(items);

      if (validatedItems.length === 0) {
        throw new Error('No valid avatar items provided');
      }

      // 2. Unity 형식으로 변환
      const unityData = this.convertToUnityAvatarDtoList(validatedItems);

      // 3. JSON 문자열로 변환 (Swift와 동일)
      const jsonString = JSON.stringify(unityData);

      this.log('Unity Avatar Data:', jsonString);

      // 4. Unity로 전송 (Swift와 동일하게 sendUnityMessage 사용)
      await UnityBridge.sendUnityMessage(
        UnityService.UNITY_OBJECT_NAME,  // "Charactor"
        UnityService.CHANGE_AVATAR,       // "SetSprites"
        jsonString                         // {"list":[...]}
      );

      this.log(`Avatar changed with ${validatedItems.length} items`);
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
   * Swift UnityService.changeAvatar의 변환 로직과 동일
   *
   * @param items - 변환할 아이템 배열
   * @returns Unity가 기대하는 {"list": [...]} 구조
   */
  private convertToUnityAvatarDtoList(items: Item[]): UnityAvatarDtoList {
    const unityAvatarDtos: UnityAvatarDto[] = items.map(item => {
      // Swift: itemType.unityName
      const part = getUnityPartName(item.itemType.id);

      // Swift: avatarItem.unityFilePath + avatarItem.name
      const itemPath = item.unityFilePath + item.name;

      return {
        name: item.name,           // 예: "New_Armor_01.png"
        part,                       // 예: "Hair", "Cloth", "Pant"
        itemPath,                   // 예: "Sprites/Hair/New_Armor_01.png"
      };
    });

    // Swift: UnityAvatarDtoList(list: unityAvatarDtos)
    return {
      list: unityAvatarDtos,
    };
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