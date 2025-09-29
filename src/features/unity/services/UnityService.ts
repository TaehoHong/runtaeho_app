/**
 * Unity Service for React Native
 *
 * 기존 Unity Service를 새로운 Unity Bridge와 통합
 * Unity Bridge Service를 사용하여 실제 Unity 통신 구현
 */

import { createUnityBridgeService } from '~/features/unity/bridge/UnityBridgeService';
import type { AvatarItem, CharacterMotion } from '~/features/unity/types/UnityTypes';
import type { UnityAnimationType, UnityAvatarDto, UnityBackgroundDto, UnityRunningDto } from '../types/UnityTypes';

/**
 * Unity Service Interface
 * Swift UnityViewController와 UnityBridge 기능 정의
 */
export interface UnityServiceInterface {
  // 초기화
  init(): Promise<void>;

  // 아바타 관련
  loadCharacter(avatar: UnityAvatarDto): Promise<void>;
  updateAvatar(avatar: UnityAvatarDto): Promise<void>;

  // 러닝 관련
  startRunning(data: UnityRunningDto): Promise<void>;
  updateRunningProgress(data: UnityRunningDto): Promise<void>;
  stopRunning(): Promise<void>;

  // 애니메이션
  playAnimation(type: UnityAnimationType): Promise<void>;
  stopAnimation(): Promise<void>;

  // 배경
  setBackground(background: UnityBackgroundDto): Promise<void>;

  // 화면 제어
  show(): Promise<void>;
  hide(): Promise<void>;

  // 정리
  cleanup(): Promise<void>;
}

/**
 * Unity Service Implementation
 * Unity Bridge Service를 사용하여 실제 Unity 통신 구현
 */
export class UnityService implements UnityServiceInterface {
  private static instance: UnityService;
  private isInitialized = false;
  private isVisible = false;
  private bridgeService: any;

  private constructor() {
    // Unity Bridge Service 초기화
    this.bridgeService = createUnityBridgeService({
      enableDebugLogs: __DEV__,
      autoConnect: true,
    });
  }

  static getInstance(): UnityService {
    if (!UnityService.instance) {
      UnityService.instance = new UnityService();
    }
    return UnityService.instance;
  }

  async init(): Promise<void> {
    try {
      console.log('[Unity] Initializing Unity Service with Bridge...');

      // Unity Bridge 연결 상태 확인
      const isConnected = await this.bridgeService.checkConnection();
      if (!isConnected) {
        console.warn('[Unity] Unity Bridge not connected, but continuing...');
      }

      this.isInitialized = true;
      console.log('[Unity] Unity Service initialized successfully');
    } catch (error) {
      console.error('[Unity] Failed to initialize Unity Service:', error);
      throw error;
    }
  }

  async loadCharacter(avatar: UnityAvatarDto): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Unity Service not initialized');
    }

    try {
      console.log('[Unity] Loading character:', avatar);

      // UnityAvatarDto를 새로운 AvatarItem 형식으로 변환
      const avatarItems = this.convertToAvatarItems(avatar);

      // Unity Bridge를 통해 아바타 변경
      await this.bridgeService.changeAvatar(avatarItems);

      console.log('[Unity] Character loaded successfully');
    } catch (error) {
      console.error('[Unity] Failed to load character:', error);
      throw error;
    }
  }

  async updateAvatar(avatar: UnityAvatarDto): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Unity Service not initialized');
    }

    try {
      console.log('[Unity] Updating avatar:', avatar);

      // UnityAvatarDto를 새로운 AvatarItem 형식으로 변환
      const avatarItems = this.convertToAvatarItems(avatar);

      // Unity Bridge를 통해 아바타 변경
      await this.bridgeService.changeAvatar(avatarItems);

      console.log('[Unity] Avatar updated successfully');
    } catch (error) {
      console.error('[Unity] Failed to update avatar:', error);
      throw error;
    }
  }

  async startRunning(data: UnityRunningDto): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Unity Service not initialized');
    }

    try {
      console.log('[Unity] Starting running animation:', data);

      // 러닝 시작 - MOVE 모션으로 변경
      await this.bridgeService.setCharacterMotion('MOVE');

      // 초기 속도 설정 (speed는 km/h에서 Unity 단위로 변환)
      const unitySpeed = this.convertSpeedToUnity(data.speed);
      await this.bridgeService.setCharacterSpeed(unitySpeed);

      console.log('[Unity] Running animation started successfully');
    } catch (error) {
      console.error('[Unity] Failed to start running:', error);
      throw error;
    }
  }

  async updateRunningProgress(data: UnityRunningDto): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Unity Service not initialized');
    }

    try {
      console.log('[Unity] Updating running progress:', data);

      // 속도 업데이트
      const unitySpeed = this.convertSpeedToUnity(data.speed);
      await this.bridgeService.setCharacterSpeed(unitySpeed);

      // 일시정지 상태 처리
      if (data.isPaused) {
        await this.bridgeService.setCharacterMotion('IDLE');
      } else if (data.isRunning) {
        await this.bridgeService.setCharacterMotion('MOVE');
      }

      console.log('[Unity] Running progress updated successfully');
    } catch (error) {
      console.error('[Unity] Failed to update running progress:', error);
      throw error;
    }
  }

  async stopRunning(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Unity Service not initialized');
    }

    try {
      console.log('[Unity] Stopping running animation');

      // 캐릭터 정지
      await this.bridgeService.stopCharacter();
      await this.bridgeService.setCharacterMotion('IDLE');

      console.log('[Unity] Running animation stopped successfully');
    } catch (error) {
      console.error('[Unity] Failed to stop running:', error);
      throw error;
    }
  }

  async playAnimation(type: UnityAnimationType): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Unity Service not initialized');
    }

    try {
      console.log(`[Unity] Playing animation: ${type}`);

      // Unity 애니메이션 타입을 CharacterMotion으로 변환
      const motion = this.convertAnimationToMotion(type);
      await this.bridgeService.setCharacterMotion(motion);

      console.log(`[Unity] Animation ${type} played successfully`);
    } catch (error) {
      console.error('[Unity] Failed to play animation:', error);
      throw error;
    }
  }

  async stopAnimation(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Unity Service not initialized');
    }

    try {
      console.log('[Unity] Stopping animation');

      // IDLE 모션으로 변경하여 애니메이션 정지
      await this.bridgeService.setCharacterMotion('IDLE');

      console.log('[Unity] Animation stopped successfully');
    } catch (error) {
      console.error('[Unity] Failed to stop animation:', error);
      throw error;
    }
  }

  async setBackground(background: UnityBackgroundDto): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Unity Service not initialized');
    }

    try {
      console.log('[Unity] Setting background:', background);

      // 현재 Unity Bridge에서는 배경 설정 기능이 없으므로 로그만 출력
      console.warn('[Unity] Background setting not implemented in Unity Bridge yet');

      console.log('[Unity] Background setting attempted');
    } catch (error) {
      console.error('[Unity] Failed to set background:', error);
      throw error;
    }
  }

  async show(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Unity Service not initialized');
    }

    try {
      console.log('[Unity] Showing Unity view');

      // Unity 상태 확인
      await this.bridgeService.getUnityStatus();
      this.isVisible = true;

      console.log('[Unity] Unity view shown successfully');
    } catch (error) {
      console.error('[Unity] Failed to show Unity view:', error);
      throw error;
    }
  }

  async hide(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Unity Service not initialized');
    }

    try {
      console.log('[Unity] Hiding Unity view');

      // Unity 캐릭터 정지
      await this.bridgeService.stopCharacter();
      this.isVisible = false;

      console.log('[Unity] Unity view hidden successfully');
    } catch (error) {
      console.error('[Unity] Failed to hide Unity view:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      console.log('[Unity] Cleaning up Unity Service');

      await this.hide();
      await this.stopAnimation();
      await this.stopRunning();

      this.isInitialized = false;
      this.isVisible = false;

      console.log('[Unity] Unity Service cleaned up successfully');
    } catch (error) {
      console.error('[Unity] Failed to cleanup Unity Service:', error);
      throw error;
    }
  }

  // ==========================================
  // 유틸리티 메서드들
  // ==========================================

  /**
   * UnityAvatarDto를 새로운 AvatarItem 배열로 변환
   */
  private convertToAvatarItems(avatar: UnityAvatarDto): AvatarItem[] {
    const items: AvatarItem[] = [];

    if (avatar.hair) {
      items.push({
        name: avatar.hair.name,
        part: 'Hair',
        itemPath: avatar.hair.unityFilePath || `Assets/05.Resource/Hair/${avatar.hair.name}`,
      });
    }

    if (avatar.top) {
      items.push({
        name: avatar.top.name,
        part: 'Cloth',
        itemPath: avatar.top.unityFilePath || `Assets/05.Resource/Cloth/${avatar.top.name}`,
      });
    }

    if (avatar.bottom) {
      items.push({
        name: avatar.bottom.name,
        part: 'Pant',
        itemPath: avatar.bottom.unityFilePath || `Assets/05.Resource/Pant/${avatar.bottom.name}`,
      });
    }

    if (avatar.shoes) {
      items.push({
        name: avatar.shoes.name,
        part: 'Shoes',
        itemPath: avatar.shoes.unityFilePath || `Assets/05.Resource/Shoes/${avatar.shoes.name}`,
      });
    }

    if (avatar.accessory) {
      items.push({
        name: avatar.accessory.name,
        part: 'Accessory',
        itemPath: avatar.accessory.unityFilePath || `Assets/05.Resource/Accessory/${avatar.accessory.name}`,
      });
    }

    return items;
  }

  /**
   * UnityAnimationType을 CharacterMotion으로 변환
   */
  private convertAnimationToMotion(type: UnityAnimationType): CharacterMotion {
    switch (type) {
      case 'IDLE':
        return 'IDLE';
      case 'WALK':
      case 'RUN':
      case 'SPRINT':
        return 'MOVE';
      case 'JUMP':
      case 'CELEBRATE':
      case 'VICTORY':
        return 'ATTACK'; // 일단 ATTACK으로 매핑
      case 'TIRED':
      case 'STRETCH':
      case 'DRINK':
      case 'WIPE_SWEAT':
        return 'DAMAGED'; // 일단 DAMAGED로 매핑
      default:
        return 'IDLE';
    }
  }

  /**
   * km/h 속도를 Unity 단위로 변환
   */
  private convertSpeedToUnity(speedKmh: number): number {
    // km/h를 Unity에서 사용하는 단위로 변환
    // 일반적으로 Unity에서는 0-10 범위의 값을 사용
    const maxSpeedKmh = 20; // 최대 속도 20km/h로 가정
    const maxUnitySpeed = 10; // Unity 최대 속도 10

    const normalizedSpeed = Math.min(speedKmh / maxSpeedKmh, 1.0);
    return normalizedSpeed * maxUnitySpeed;
  }

  // Getter methods
  get initialized(): boolean {
    return this.isInitialized;
  }

  get visible(): boolean {
    return this.isVisible;
  }

  get bridgeConnected(): boolean {
    return this.bridgeService !== null;
  }
}

// Unity Service 싱글톤 인스턴스
export const unityService = UnityService.getInstance();