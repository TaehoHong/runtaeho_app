/**
 * Unity Bridge Service for React Native
 * Unity와 React Native 간의 통신을 담당하는 서비스
 */

import { UnityBridge } from './UnityBridge';
import { type AvatarItem, type CharacterMotion, type UnityBridgeConfig,DEFAULT_UNITY_BRIDGE_CONFIG } from '../types/UnityTypes';

/**
 * Unity Bridge Service 클래스
 * React Native와 Unity 간의 모든 통신을 관리하며 도메인 로직을 포함
 */
class UnityBridgeService {
  private config: UnityBridgeConfig;
  private isInitialized = false;
  
  // 도메인 상수들
  private static readonly UNITY_OBJECT_NAME = 'Charactor';
  private static readonly UNITY_SPEED_METHOD = 'SetSpeed';
  private static readonly UNITY_MOTION_METHOD = 'SetTrigger';
  private static readonly MIN_SPEED = 0;
  private static readonly MAX_SPEED = 10;
  private static readonly VALID_MOTIONS: CharacterMotion[] = ['IDLE', 'MOVE', 'ATTACK', 'DAMAGED'];
  private static readonly VALID_AVATAR_PARTS = ['Hair', 'Cloth', 'Pant', 'Shoes', 'Accessory'];
  
  constructor(config: Partial<UnityBridgeConfig> = {}) {
    this.config = { ...DEFAULT_UNITY_BRIDGE_CONFIG, ...config };
    this.initialize();
  }
  
  // ==========================================
  // 초기화 및 설정
  // ==========================================

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.log('UnityBridgeService 초기화 중...');

    try {

      this.isInitialized = true;
      this.log('UnityBridgeService 초기화 완료');
    } catch (error) {
      this.logError('Failed to initialize UnityBridgeService', error);
      throw error;
    }
  }
  
  private handleUnityError(error: any): void {
    console.error('[UnityBridgeService] Unity Error:', error);
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
  
  async setCharacterSpeed(speed: number): Promise<void> {
    this.log(`Setting character speed: ${speed}`);

    try {
      // 도메인 로직: 속도 범위 검증 및 변환
      const clampedSpeed = Math.max(UnityBridgeService.MIN_SPEED, Math.min(speed, UnityBridgeService.MAX_SPEED));

      if (speed !== clampedSpeed) {
        this.log(`Speed clamped from ${speed} to ${clampedSpeed}`);
      }

      const speedString = clampedSpeed.toString();
      await UnityBridge.sendUnityMessage(
        UnityBridgeService.UNITY_OBJECT_NAME,
        UnityBridgeService.UNITY_SPEED_METHOD,
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
        UnityBridgeService.UNITY_OBJECT_NAME,
        UnityBridgeService.UNITY_SPEED_METHOD,
        '0'
      );
      await UnityBridge.sendUnityMessage(
        UnityBridgeService.UNITY_OBJECT_NAME,
        UnityBridgeService.UNITY_MOTION_METHOD,
        'IDLE'
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
      if (!UnityBridgeService.VALID_MOTIONS.includes(motion)) {
        throw new Error(`Invalid motion: ${motion}. Valid motions: ${UnityBridgeService.VALID_MOTIONS.join(', ')}`);
      }

      await UnityBridge.sendUnityMessage(
        UnityBridgeService.UNITY_OBJECT_NAME,
        UnityBridgeService.UNITY_MOTION_METHOD,
        motion
      );

      this.log(`Character motion set to ${motion}`);
    } catch (error) {
      this.logError('Failed to set character motion', error);
      throw error;
    }
  }
  
  async changeAvatar(items: AvatarItem[]): Promise<void> {
    this.log(`Changing avatar with ${items.length} items`);

    try {
      // 도메인 로직: 아바타 아이템 검증 및 변환
      const validatedItems = this.validateAvatarItems(items);

      if (validatedItems.length === 0) {
        throw new Error('No valid avatar items provided');
      }

      // Unity에서 기대하는 형태로 변환 (sendUnityJSON 사용)
      await UnityBridge.sendUnityJSON(
        UnityBridgeService.UNITY_OBJECT_NAME,
        'ChangeAvatar',
        validatedItems as any[]
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
  
  private validateAvatarItems(items: AvatarItem[]): AvatarItem[] {
    return items.filter(item => {
      // 필수 필드 검증
      if (!item.name || !item.part || !item.itemPath) {
        this.log(`Invalid item: missing required fields`, item);
        return false;
      }
      
      // 아바타 파트 검증
      if (!UnityBridgeService.VALID_AVATAR_PARTS.includes(item.part)) {
        this.log(`Invalid avatar part: ${item.part}, skipping item: ${item.name}`);
        return false;
      }
      
      return true;
    });
  }
  
  // ==========================================
  // 설정 관리
  // ==========================================
  
  updateConfig(newConfig: Partial<UnityBridgeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('Config updated:', this.config);
  }
  
  getConfig(): UnityBridgeConfig {
    return { ...this.config };
  }
  
  // ==========================================
  // 로깅
  // ==========================================
  
  private log(message: string, ...args: any[]): void {
    if (this.config.enableDebugLogs) {
      console.log(`[UnityBridgeService] ${message}`, ...args);
    }
  }
  
  private logError(message: string, error: any): void {
    console.error(`[UnityBridgeService] ${message}`, error);
  }
  
  // ==========================================
  // 정리
  // ==========================================
  
  dispose(): void {
    this.log('Disposing UnityBridgeService');
    this.isInitialized = false;
  }
}

// ==========================================
// 싱글톤 인스턴스
// ==========================================

let unityBridgeInstance: UnityBridgeService | null = null;

export const createUnityBridgeService = (config?: Partial<UnityBridgeConfig>): UnityBridgeService => {
  if (!unityBridgeInstance) {
    unityBridgeInstance = new UnityBridgeService(config);
  }
  return unityBridgeInstance;
};

export const getUnityBridgeService = (): UnityBridgeService | null => {
  return unityBridgeInstance;
};

export const disposeUnityBridgeService = (): void => {
  if (unityBridgeInstance) {
    unityBridgeInstance.dispose();
    unityBridgeInstance = null;
  }
};

export default UnityBridgeService;