/**
 * Unity Service for React Native
 *
 * 기존 Unity Service를 새로운 Unity Bridge와 통합
 * Unity Bridge Service를 사용하여 실제 Unity 통신 구현
 */

import { createUnityBridgeService } from '~/features/unity/bridge/UnityBridgeService';
import type { AvatarItem, CharacterMotion } from '~/features/unity/types/UnityTypes';
import type { UnityAnimationType, UnityAvatarDto } from '../types/UnityTypes';


/**
 * Unity Service Implementation
 * Unity Bridge Service를 사용하여 실제 Unity 통신 구현
 */
export class UnityService {
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

  async updateAvatars(avatars: [UnityAvatarDto]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Unity Service not initialized');
    }

    try {
      console.log('[Unity] Updating avatar:', avatars);

      // Unity Bridge를 통해 아바타 변경
      await this.bridgeService.changeAvatar(avatars);

      console.log('[Unity] Avatar updated successfully');
    } catch (error) {
      console.error('[Unity] Failed to update avatar:', error);
      throw error;
    }
  }

  async changeSpeed(speed: number): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Unity Service not initialized');
    }

    try {
      console.log('[Unity] Updating running progress:', speed);

      // 속도 업데이트
      const unitySpeed = this.convertSpeedToUnity(speed);
      await this.bridgeService.setCharacterSpeed(unitySpeed);

      // 일시정지 상태 처리
      if (speed <= 0) {
        await this.bridgeService.setCharacterMotion('IDLE');
      } else {
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