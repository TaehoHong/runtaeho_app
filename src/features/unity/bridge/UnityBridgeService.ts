/**
 * Unity Bridge Service for React Native
 * Unity와 React Native 간의 통신을 담당하는 서비스
 * 도메인 로직을 포함하여 비즈니스 규칙을 처리
 */

import { EmitterSubscription, NativeEventEmitter, NativeModules } from 'react-native';
import {
  AvatarItem,
  CharacterMotion,
  DEFAULT_UNITY_BRIDGE_CONFIG,
  RNUnityBridgeModule,
  UnityBridge,
  UnityBridgeConfig,
  UnityError,
  UnityEventListener
} from '../../../types/UnityTypes';

// Native Module 가져오기
const { RNUnityBridge } = NativeModules as { RNUnityBridge: RNUnityBridgeModule };

/**
 * Unity Bridge Service 클래스
 * React Native와 Unity 간의 모든 통신을 관리하며 도메인 로직을 포함
 */
class UnityBridgeService implements UnityBridge {
  private eventEmitter: NativeEventEmitter;
  private eventListeners: Map<string, EmitterSubscription> = new Map();
  private config: UnityBridgeConfig;
  private isInitialized = false;

  // 도메인 상수들
  private static readonly UNITY_OBJECT_NAME = 'Charactor';
  private static readonly UNITY_SPEED_METHOD = "SetSpeed"
  private static readonly UNITY_MOTION_MEHOD = "SetTrigger";
  private static readonly MIN_SPEED = 0;
  private static readonly MAX_SPEED = 10;
  private static readonly VALID_MOTIONS: CharacterMotion[] = ['IDLE', 'MOVE', 'ATTACK', 'DAMAGED'];
  private static readonly VALID_AVATAR_PARTS = ['Hair', 'Cloth', 'Pant', 'Shoes', 'Accessory'];

  constructor(config: Partial<UnityBridgeConfig> = {}) {
    this.config = { ...DEFAULT_UNITY_BRIDGE_CONFIG, ...config };

    if (!RNUnityBridge) {
      throw new Error('RNUnityBridge native module is not available');
    }

    this.eventEmitter = new NativeEventEmitter(RNUnityBridge);
    this.initialize();
  }

  // ==========================================
  // 초기화 및 설정
  // ==========================================

  private initialize(): void {
    if (this.isInitialized) return;

    this.log('UnityBridgeService 초기화 중...');

    // 기본 에러 리스너 등록
    this.addEventListener('onUnityError', this.handleUnityError.bind(this));

    this.isInitialized = true;
    this.log('UnityBridgeService 초기화 완료');
  }

  private handleUnityError(error: UnityError): void {
    console.error('[UnityBridgeService] Unity Error:', error);
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
      this.log(`Sending Unity message: ${UnityBridgeService.UNITY_OBJECT_NAME}.SetCharacterSpeed(${speedString})`);

      await RNUnityBridge.sendUnityMessage(UnityBridgeService.UNITY_OBJECT_NAME, UnityBridgeService.UNITY_SPEED_METHOD, speedString);

      this.log(`Unity message sent successfully`);
    } catch (error) {
      this.logError('Failed to set character speed', error);
      throw error;
    }
  }

  async stopCharacter(): Promise<void> {
    this.log('Stopping character');

    try {
      // 도메인 로직: 캐릭터 정지는 속도를 0으로 설정하고 IDLE 상태로 변경
      await RNUnityBridge.sendUnityMessage(UnityBridgeService.UNITY_OBJECT_NAME, UnityBridgeService.UNITY_SPEED_METHOD, '0');
      await RNUnityBridge.sendUnityMessage(UnityBridgeService.UNITY_OBJECT_NAME, UnityBridgeService.UNITY_MOTION_MEHOD, 'IDLE');
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

      await RNUnityBridge.sendUnityMessage(UnityBridgeService.UNITY_OBJECT_NAME, UnityBridgeService.UNITY_MOTION_MEHOD, motion);
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

      // Unity에서 기대하는 형태로 변환
      const nativeItems = validatedItems.map(item => ({
        name: item.name,
        part: item.part,
        itemPath: item.itemPath,
      }));

      await RNUnityBridge.sendUnityJSON(UnityBridgeService.UNITY_OBJECT_NAME, 'ChangeAvatar', nativeItems);
    } catch (error) {
      this.logError('Failed to change avatar', error);
      throw error;
    }
  }

  async getUnityStatus(): Promise<void> {
    this.log('Getting Unity status');

    try {
      await RNUnityBridge.sendUnityMessage(UnityBridgeService.UNITY_OBJECT_NAME, 'GetUnityStatus', '');
    } catch (error) {
      this.logError('Failed to get Unity status', error);
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
  // 편의 메서드들 (도메인 로직 포함)
  // ==========================================

  /**
   * 캐릭터를 특정 속도로 움직이기 시작
   */
  async startMoving(speed: number = 5.0): Promise<void> {
    await this.setCharacterMotion('MOVE');
    await this.setCharacterSpeed(speed);
  }

  /**
   * 캐릭터 완전 정지
   */
  async stopMoving(): Promise<void> {
    await this.stopCharacter();
  }

  /**
   * 캐릭터 공격 액션
   */
  async performAttack(): Promise<void> {
    await this.setCharacterMotion('ATTACK');
  }

  /**
   * 캐릭터 피해 액션
   */
  async takeDamage(): Promise<void> {
    await this.setCharacterMotion('DAMAGED');
  }

  /**
   * 여러 아바타 아이템을 한번에 적용
   */
  async applyAvatarPreset(items: AvatarItem[]): Promise<void> {
    await this.changeAvatar(items);
  }

  // ==========================================
  // 이벤트 관리
  // ==========================================

  addEventListener<T>(eventName: string, listener: UnityEventListener<T>): void {
    this.log(`Adding event listener for: ${eventName}`);

    // 기존 리스너가 있으면 제거
    this.removeEventListener(eventName);

    // 새 리스너 등록
    const subscription = this.eventEmitter.addListener(eventName, listener);
    this.eventListeners.set(eventName, subscription);
  }

  removeEventListener(eventName: string): void {
    const subscription = this.eventListeners.get(eventName);
    if (subscription) {
      subscription.remove();
      this.eventListeners.delete(eventName);
      this.log(`Removed event listener for: ${eventName}`);
    }
  }

  removeAllEventListeners(): void {
    this.log('Removing all event listeners');

    this.eventListeners.forEach(subscription => subscription.remove());
    this.eventListeners.clear();
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
  // 연결 상태 관리
  // ==========================================

  async checkConnection(): Promise<boolean> {
    try {
      await this.getUnityStatus();
      return true;
    } catch (error) {
      this.logError('Unity connection check failed', error);
      return false;
    }
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
    this.removeAllEventListeners();
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