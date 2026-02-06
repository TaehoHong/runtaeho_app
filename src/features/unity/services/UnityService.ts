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

  // Avatar 변경 Lock 메커니즘 - 동시 호출로 인한 CANCELLED 에러 방지
  private isChangingAvatar: boolean = false;
  private pendingAvatarChange: { items: Item[]; hairColor?: string } | null = null;

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
   * ★ Avatar Ready 시 콜백 실행
   * Unity에서 SetSprites() 완료 후 호출됨
   * 아바타 아이템이 완전히 적용된 후에 콜백 실행
   */
  onAvatarReady(callback: () => void): () => void {
    return UnityBridge.subscribeToAvatarReady(callback);
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
  
  /**
   * ★ 아바타 변경 (Native Promise Hold 방식 + Lock 메커니즘)
   *
   * Lock 메커니즘:
   * - 동시에 여러 곳에서 changeAvatar가 호출되면 CANCELLED 에러 발생
   * - 진행 중인 요청이 있으면 대기열에 추가하고 순차 처리
   * - SetSprites 중복 실행 방지
   */
  async changeAvatar(items: Item[], hairColor?: string): Promise<void> {
    // 진행 중이면 대기열에 추가하고 리턴 (최신 요청만 유지)
    if (this.isChangingAvatar) {
      this.log('⏳ Avatar change in progress, queueing request');
      this.pendingAvatarChange = { items, hairColor };
      return;
    }

    this.isChangingAvatar = true;

    try {
      await this.executeChangeAvatar(items, hairColor);

      // 대기 중인 요청 처리 (while loop로 연속 요청 처리)
      while (this.pendingAvatarChange) {
        const pending = this.pendingAvatarChange;
        this.pendingAvatarChange = null;
        this.log('📋 Processing queued avatar change request');
        await this.executeChangeAvatar(pending.items, pending.hairColor);
      }
    } finally {
      this.isChangingAvatar = false;
    }
  }

  /**
   * 실제 아바타 변경 로직 (내부 메서드)
   * SetSprites 완료까지 대기 후 resolve되므로 깜빡임 없음
   */
  private async executeChangeAvatar(items: Item[], hairColor?: string): Promise<void> {
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

      // ★ Native Promise Hold: SetSprites 완료까지 대기
      const success = await UnityBridge.changeAvatarAndWait(
        UnityService.UNITY_OBJECT_NAME,
        UnityService.CHANGE_AVATAR,
        jsonString
      );

      if (!success) {
        this.log('⚠️ Avatar change timeout or failed (5s)');
      }

      this.log(`Avatar changed with ${validatedItems.length} items, hairColor: ${hairColor}, success: ${success}`);
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
  
  // ==========================================
  // 배경 제어 기능 (공유 에디터용)
  // ==========================================

  /**
   * ★ Unity 배경 이미지 변경
   * @param backgroundId 배경 ID
   */
  async setBackground(backgroundId: string): Promise<void> {
    this.log(`Setting background: ${backgroundId}`);

    try {
      await UnityBridge.setBackground(backgroundId);
      this.log(`Background set to ${backgroundId}`);
    } catch (error) {
      this.logError('Failed to set background', error);
      throw error;
    }
  }

  /**
   * ★ Unity 배경 색상 변경 (단색)
   * @param colorHex 색상 Hex 값 (예: "#45DA31")
   */
  async setBackgroundColor(colorHex: string): Promise<void> {
    this.log(`Setting background color: ${colorHex}`);

    try {
      await UnityBridge.setBackgroundColor(colorHex);
      this.log(`Background color set to ${colorHex}`);
    } catch (error) {
      this.logError('Failed to set background color', error);
      throw error;
    }
  }

  /**
   * ★ Unity 배경을 사용자 사진으로 변경
   * @param base64Image Base64 인코딩된 이미지 문자열 (리사이즈 권장)
   */
  async setBackgroundFromPhoto(base64Image: string): Promise<void> {
    this.log(`Setting background from photo (length: ${base64Image.length})`);

    try {
      await UnityBridge.setBackgroundFromPhoto(base64Image);
      this.log('Background photo set successfully');
    } catch (error) {
      this.logError('Failed to set background from photo', error);
      throw error;
    }
  }

  // ==========================================
  // 캐릭터 위치/스케일 제어 (공유 에디터용)
  // ==========================================

  /**
   * ★ Unity 캐릭터 위치 설정 (정규화 좌표)
   * @param x 0~1 범위 (0=좌측, 1=우측)
   * @param y 0~1 범위 (0=상단, 1=하단)
   */
  async setCharacterPosition(x: number, y: number): Promise<void> {
    this.log(`Setting character position: (${x}, ${y})`);

    try {
      await UnityBridge.setCharacterPosition(x, y);
      this.log(`Character position set to (${x}, ${y})`);
    } catch (error) {
      this.logError('Failed to set character position', error);
      throw error;
    }
  }

  /**
   * ★ Unity 캐릭터 스케일 설정
   * @param scale 0.5~2.5 범위
   */
  async setCharacterScale(scale: number): Promise<void> {
    this.log(`Setting character scale: ${scale}`);

    try {
      await UnityBridge.setCharacterScale(scale);
      this.log(`Character scale set to ${scale}`);
    } catch (error) {
      this.logError('Failed to set character scale', error);
      throw error;
    }
  }

  // ==========================================
  // 캐릭터 캡처 기능 (공유 기능용)
  // ==========================================

  /**
   * ★ 현재 캐릭터를 PNG 이미지로 캡처
   * 착용 중인 아이템이 반영된 상태로 캡처됨
   * @returns Base64 인코딩된 PNG 이미지 문자열
   */
  async captureAvatar(): Promise<string> {
    this.log('Capturing avatar image...');

    if (!this.isReady()) {
      this.log('⚠️ GameObject not ready, capture may fail');
    }

    try {
      const base64Image = await UnityBridge.captureCharacter();
      this.log(`Avatar captured successfully (length: ${base64Image.length})`);
      return base64Image;
    } catch (error) {
      this.logError('Failed to capture avatar', error);
      throw error;
    }
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