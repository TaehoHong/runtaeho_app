/**
 * Unity Bridge
 * React Native와 Unity 간의 통신을 담당하는 브릿지
 * Swift RNUnityBridge Native Module과 연동
 *
 * Architecture: Push + Pull Pattern
 * - Push: 이벤트 리스너로 Ready 상태 변경 감지
 * - Pull: Native 모듈에 직접 현재 상태 조회
 * - 두 방식 모두 지원하여 Race Condition 해결
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

console.log('[UnityBridge] Module file loading...');

const { RNUnityBridge: NativeUnityBridge } = NativeModules;

export interface UnityBridgeInterface {
  sendUnityMessage(objectName: string, methodName: string, parameter: string): Promise<void>;
  sendUnityJSON(objectName: string, methodName: string, data: any[]): Promise<void>;
  isGameObjectReady(): boolean;
  syncReadyState(): Promise<boolean>;
  subscribeToGameObjectReady(callback: () => void): () => void;
}

class UnityBridgeImpl implements UnityBridgeInterface {
  private eventEmitter: NativeEventEmitter | null = null;
  private _isCharactorReady: boolean = false;
  private readyCallbacks: Set<() => void> = new Set();
  private isInitialized: boolean = false;

  constructor() {
    console.log('[UnityBridge] Initializing...');
    console.log('[UnityBridge] RNUnityBridge available:', !!NativeUnityBridge);

    if (NativeUnityBridge && Platform.OS === 'ios') {
      this.eventEmitter = new NativeEventEmitter(NativeUnityBridge);

      // Push: 이벤트 리스너 등록
      this.eventEmitter.addListener('onCharactorReady', (event) => {
        console.log('[UnityBridge] 🎉 onCharactorReady event received!', event);
        this.setReady(true);
      });

      // Pull: 초기화 시 Native 상태와 동기화
      this.syncReadyState().then((ready) => {
        console.log('[UnityBridge] ✅ Initial sync complete, ready:', ready);
        this.isInitialized = true;
      });

      console.log('[UnityBridge] Event listeners registered');
    } else {
      console.warn('[UnityBridge] Native module not available (Platform:', Platform.OS, ')');
      this.isInitialized = true;
    }
  }

  /**
   * Ready 상태 설정 및 콜백 실행
   */
  private setReady(ready: boolean): void {
    const wasReady = this._isCharactorReady;
    this._isCharactorReady = ready;

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
   * 현재 Ready 상태 반환 (동기, 캐시된 값)
   */
  isGameObjectReady(): boolean {
    return this._isCharactorReady;
  }

  /**
   * Native에서 현재 상태 조회 (비동기, Pull 패턴)
   * Race Condition 해결의 핵심
   */
  async syncReadyState(): Promise<boolean> {
    if (!NativeUnityBridge?.isCharactorReady) {
      console.log('[UnityBridge] syncReadyState: Native method not available');
      return this._isCharactorReady;
    }

    try {
      const nativeReady = await NativeUnityBridge.isCharactorReady();
      console.log('[UnityBridge] syncReadyState: Native says', nativeReady);

      if (nativeReady && !this._isCharactorReady) {
        // Native는 ready인데 로컬은 아님 = 이벤트 놓침
        console.log('[UnityBridge] 🔄 Syncing missed ready state from Native');
        this.setReady(true);
      }

      return nativeReady;
    } catch (error) {
      console.error('[UnityBridge] syncReadyState error:', error);
      return this._isCharactorReady;
    }
  }

  /**
   * Ready 상태 리셋 (Unity View 재마운트 시)
   */
  async resetGameObjectReady(): Promise<void> {
    console.log('[UnityBridge] Resetting Ready state');
    this._isCharactorReady = false;

    if (NativeUnityBridge?.resetCharactorReady) {
      try {
        await NativeUnityBridge.resetCharactorReady();
      } catch (error) {
        console.error('[UnityBridge] resetCharactorReady error:', error);
      }
    }
  }

  /**
   * Ready 이벤트 구독
   * - 이미 ready면 즉시 콜백 실행
   * - 아니면 Native 상태 확인 후 구독
   */
  subscribeToGameObjectReady(callback: () => void): () => void {
    // 이미 ready면 즉시 실행
    if (this._isCharactorReady) {
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

  async sendUnityMessage(objectName: string, methodName: string, parameter: string): Promise<void> {
    if (!NativeUnityBridge) {
      throw new Error('RNUnityBridge native module not available');
    }

    if (!this._isCharactorReady) {
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

    if (!this._isCharactorReady) {
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
}

export const UnityBridge = new UnityBridgeImpl();