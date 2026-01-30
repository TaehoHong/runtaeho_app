/**
 * Unity Bridge
 * React Native와 Unity 간의 통신을 담당하는 브릿지
 * Swift RNUnityBridge Native Module과 연동
 *
 * Architecture: Push + Pull Pattern
 * - Push: 이벤트 리스너로 Ready 상태 변경 감지
 * - Pull: Native 모듈에 직접 현재 상태 조회
 * - 두 방식 모두 지원하여 Race Condition 해결
 *
 * State Management:
 * - Ready 상태는 unityStore가 Single Source of Truth
 * - UnityBridge는 상태를 저장하지 않고 Store를 통해 읽기/쓰기
 * - 콜백 Set은 UnityBridge에서 관리 (Store에 콜백 저장하지 않음)
 */

import { NativeModules, NativeEventEmitter, Platform, type EmitterSubscription } from 'react-native';
import { useUnityStore } from '../../../stores/unity/unityStore';

if (__DEV__) {
  console.log('[UnityBridge] Module file loading...');
}

const { RNUnityBridge: NativeUnityBridge } = NativeModules;

/**
 * Unity Ready 이벤트 타입
 * Native에서 전달되는 이벤트 구조
 */
export interface UnityReadyEvent {
  nativeEvent: {
    ready?: boolean;
    message?: string;
  };
}

export interface UnityBridgeInterface {
  sendUnityMessage(objectName: string, methodName: string, parameter: string): Promise<void>;
  sendUnityJSON(objectName: string, methodName: string, data: any[]): Promise<void>;
  changeAvatarAndWait(objectName: string, methodName: string, data: string): Promise<boolean>;
  isGameObjectReady(): boolean;
  syncReadyState(): Promise<boolean>;
  subscribeToGameObjectReady(callback: () => void): () => void;
  subscribeToAvatarReady(callback: () => void): () => void;
  validateUnityState(): Promise<boolean>;
  forceResetUnity(): Promise<void>;
}

class UnityBridgeImpl implements UnityBridgeInterface {
  private eventEmitter: NativeEventEmitter | null = null;
  // ★ _isCharactorReady 제거됨 - unityStore.isGameObjectReady가 Single Source of Truth
  private readyCallbacks: Set<() => void> = new Set();
  // ★ Avatar Ready 콜백 관리
  private avatarReadyCallbacks: Set<() => void> = new Set();
  private isInitialized: boolean = false;
  // ★ 이벤트 리스너 subscription 저장 (필요 시 제거 가능)
  private onCharactorReadySubscription: EmitterSubscription | null = null;
  private onAvatarReadySubscription: EmitterSubscription | null = null;

  constructor() {
    if (__DEV__) {
      console.log('[UnityBridge] Initializing...');
      console.log('[UnityBridge] RNUnityBridge available:', !!NativeUnityBridge);
    }

    if (NativeUnityBridge) {
      this.eventEmitter = new NativeEventEmitter(NativeUnityBridge);

      // Push: 이벤트 리스너 등록
      // ★ subscription 저장 (필요 시 제거 가능)
      this.onCharactorReadySubscription = this.eventEmitter.addListener('onCharactorReady', (event) => {
        console.log('[UnityBridge] 🎉 onCharactorReady event received!', event);
        this.setReady(true);
      });

      // ★ Avatar Ready 이벤트 리스너 (SetSprites 완료 후 호출됨)
      this.onAvatarReadySubscription = this.eventEmitter.addListener('onAvatarReady', (event) => {
        console.log('[UnityBridge] 🎉 onAvatarReady event received!', event);
        this.setAvatarReady(true);
      });

      // Pull: 초기화 시 Native 상태와 동기화
      this.syncReadyState().then((ready) => {
        if (__DEV__) {
          console.log('[UnityBridge] ✅ Initial sync complete, ready:', ready);
        }
        this.isInitialized = true;
      });

      if (__DEV__) {
        console.log('[UnityBridge] Event listeners registered (Platform:', Platform.OS, ')');
      }
    } else {
      if (__DEV__) {
        console.warn('[UnityBridge] Native module not available');
      }
      this.isInitialized = true;
    }
  }

  /**
   * Ready 상태 설정 및 콜백 실행
   * ★ Store를 Single Source of Truth로 사용
   */
  private setReady(ready: boolean): void {
    const wasReady = useUnityStore.getState().isGameObjectReady;

    // Store 업데이트
    useUnityStore.getState().setGameObjectReady(ready);

    // false → true 변경 시에만 콜백 실행
    if (!wasReady && ready) {
      console.log('[UnityBridge] 🔔 Notifying', this.readyCallbacks.size, 'callbacks');
      this.readyCallbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('[UnityBridge] Callback error:', error);
        }
      });
    }
  }

  /**
   * Avatar Ready 상태 설정 및 콜백 실행
   * ★ Store를 Single Source of Truth로 사용
   */
  private setAvatarReady(ready: boolean): void {
    const wasReady = useUnityStore.getState().isAvatarReady;

    // Store 업데이트
    useUnityStore.getState().setAvatarReady(ready);

    // false → true 변경 시에만 콜백 실행
    if (!wasReady && ready) {
      console.log('[UnityBridge] 🔔 Notifying', this.avatarReadyCallbacks.size, 'avatar callbacks');
      this.avatarReadyCallbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('[UnityBridge] Avatar callback error:', error);
        }
      });
    }
  }

  /**
   * 현재 Ready 상태 반환 (동기)
   * ★ Store에서 읽기 (Single Source of Truth)
   */
  isGameObjectReady(): boolean {
    return useUnityStore.getState().isGameObjectReady;
  }

  /**
   * Native에서 현재 상태 조회 (비동기, Pull 패턴)
   * Race Condition 해결의 핵심
   * ★ Store를 Single Source of Truth로 사용
   */
  async syncReadyState(): Promise<boolean> {
    const currentReady = useUnityStore.getState().isGameObjectReady;

    if (!NativeUnityBridge?.isCharactorReady) {
      console.log('[UnityBridge] syncReadyState: Native method not available');
      return currentReady;
    }

    try {
      const nativeReady = await NativeUnityBridge.isCharactorReady();
      console.log('[UnityBridge] syncReadyState: Native says', nativeReady);

      if (nativeReady && !currentReady) {
        // Native는 ready인데 Store는 아님 = 이벤트 놓침
        console.log('[UnityBridge] 🔄 Syncing missed ready state from Native');
        this.setReady(true);
      }

      return nativeReady;
    } catch (error) {
      console.error('[UnityBridge] syncReadyState error:', error);
      return currentReady;
    }
  }

  /**
   * Ready 상태 리셋 (Unity View 재마운트 시)
   * Reset 후 즉시 실제 상태 동기화하여 Unity 재사용 시 문제 해결
   * ★ Store를 통해 상태 리셋
   * ★ isGameObjectReady와 isAvatarReady 모두 리셋하여 깜빡임 방지
   */
  async resetGameObjectReady(): Promise<void> {
    console.log('[UnityBridge] Resetting Ready state (GameObject + Avatar)');
    useUnityStore.getState().setGameObjectReady(false);
    // ★ 핵심 수정: isAvatarReady도 함께 리셋
    // 이전에는 isAvatarReady가 리셋되지 않아 화면 전환 시 기본→착용 아바타 깜빡임 발생
    useUnityStore.getState().setAvatarReady(false);

    if (NativeUnityBridge?.resetCharactorReady) {
      try {
        await NativeUnityBridge.resetCharactorReady();

        // ★ 핵심: Reset 후 즉시 실제 상태 동기화
        // Unity가 이미 준비된 상태라면 다시 true로 동기화되어 콜백 실행
        await this.syncReadyState();
      } catch (error) {
        console.error('[UnityBridge] resetCharactorReady error:', error);
      }
    }
  }

  /**
   * Ready 이벤트 구독
   * - 이미 ready면 즉시 콜백 실행
   * - 아니면 Native 상태 확인 후 구독
   * ★ Store 상태 기준으로 판단
   */
  subscribeToGameObjectReady(callback: () => void): () => void {
    // 이미 ready면 즉시 실행 (Store에서 확인)
    if (useUnityStore.getState().isGameObjectReady) {
      console.log('[UnityBridge] Already ready, executing callback immediately');
      callback();
      return () => {};
    }

    // 콜백 등록
    this.readyCallbacks.add(callback);
    console.log('[UnityBridge] Callback registered, total:', this.readyCallbacks.size);

    // Native 상태 확인 (이벤트 놓쳤을 수 있으므로)
    this.syncReadyState();

    // 구독 해제 함수 반환
    return () => {
      this.readyCallbacks.delete(callback);
      console.log('[UnityBridge] Callback unregistered, remaining:', this.readyCallbacks.size);
    };
  }

  /**
   * Avatar Ready 이벤트 구독
   * - 이미 avatar ready면 즉시 콜백 실행
   * - Unity에서 SetSprites() 완료 후 호출됨
   * ★ Store 상태 기준으로 판단
   */
  subscribeToAvatarReady(callback: () => void): () => void {
    // 이미 avatar ready면 즉시 실행 (Store에서 확인)
    if (useUnityStore.getState().isAvatarReady) {
      console.log('[UnityBridge] Avatar already ready, executing callback immediately');
      callback();
      return () => {};
    }

    // 콜백 등록
    this.avatarReadyCallbacks.add(callback);
    console.log('[UnityBridge] Avatar callback registered, total:', this.avatarReadyCallbacks.size);

    // 구독 해제 함수 반환
    return () => {
      this.avatarReadyCallbacks.delete(callback);
      console.log('[UnityBridge] Avatar callback unregistered, remaining:', this.avatarReadyCallbacks.size);
    };
  }

  async sendUnityMessage(objectName: string, methodName: string, parameter: string): Promise<void> {
    if (!NativeUnityBridge) {
      throw new Error('RNUnityBridge native module not available');
    }

    if (!useUnityStore.getState().isGameObjectReady) {
      console.warn(`[UnityBridge] ⚠️ GameObject not ready: ${objectName}.${methodName}(${parameter})`);
    }

    try {
      await NativeUnityBridge.sendUnityMessage(objectName, methodName, parameter);
      console.log(`[UnityBridge] Message sent: ${objectName}.${methodName}(${parameter})`);
    } catch (error) {
      console.error('[UnityBridge] Failed to send Unity message:', error);
      throw error;
    }
  }

  async sendUnityJSON(objectName: string, methodName: string, data: any[]): Promise<void> {
    if (!NativeUnityBridge) {
      throw new Error('RNUnityBridge native module not available');
    }

    if (!useUnityStore.getState().isGameObjectReady) {
      console.warn(`[UnityBridge] ⚠️ GameObject not ready: ${objectName}.${methodName} (JSON)`);
    }

    try {
      await NativeUnityBridge.sendUnityJSON(objectName, methodName, data);
      console.log(`[UnityBridge] JSON sent: ${objectName}.${methodName} with ${data.length} items`);
    } catch (error) {
      console.error('[UnityBridge] Failed to send Unity JSON:', error);
      throw error;
    }
  }

  /**
   * ★ 아바타 변경 후 완료까지 대기 (Native Promise Hold 방식)
   * Native에서 SetSprites 완료 시 resolve
   * @param objectName Unity GameObject 이름
   * @param methodName Unity 메서드 이름 (SetSprites)
   * @param data JSON 문자열 데이터
   * @returns 성공 시 true, 타임아웃 시 false
   */
  async changeAvatarAndWait(
    objectName: string,
    methodName: string,
    data: string
  ): Promise<boolean> {
    if (!NativeUnityBridge) {
      throw new Error('RNUnityBridge native module not available');
    }

    if (!useUnityStore.getState().isGameObjectReady) {
      console.warn(`[UnityBridge] ⚠️ GameObject not ready: ${objectName}.${methodName} (changeAvatarAndWait)`);
    }

    try {
      console.log(`[UnityBridge] changeAvatarAndWait: ${objectName}.${methodName}`);
      const result = await NativeUnityBridge.changeAvatarAndWait(objectName, methodName, data);
      console.log(`[UnityBridge] Avatar change completed: ${result}`);
      return result;
    } catch (error) {
      console.error('[UnityBridge] Avatar change failed:', error);
      throw error;
    }
  }

  /**
   * Unity 상태 유효성 검사
   * Stale 상태 감지 (앱 업데이트 후)
   */
  async validateUnityState(): Promise<boolean> {
    if (!NativeUnityBridge?.validateUnityState) {
      console.log('[UnityBridge] validateUnityState: Native method not available');
      return true; // 네이티브 없으면 true 가정
    }

    try {
      return await NativeUnityBridge.validateUnityState();
    } catch (error) {
      console.error('[UnityBridge] validateUnityState error:', error);
      return true;
    }
  }

  /**
   * Unity 강제 리셋 (stale 상태 복구용)
   * ★ Store를 통해 상태 리셋
   */
  async forceResetUnity(): Promise<void> {
    if (!NativeUnityBridge?.forceResetUnity) {
      console.log('[UnityBridge] forceResetUnity: Native method not available');
      return;
    }

    try {
      useUnityStore.getState().setGameObjectReady(false);
      await NativeUnityBridge.forceResetUnity();
    } catch (error) {
      console.error('[UnityBridge] forceResetUnity error:', error);
    }
  }
}

export const UnityBridge = new UnityBridgeImpl();