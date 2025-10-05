/**
 * Unity Bridge
 * React Native와 Unity 간의 통신을 담당하는 브릿지
 * Swift RNUnityBridge Native Module과 연동
 */

import { NativeModules, NativeEventEmitter } from 'react-native';

console.log('[UnityBridge] Module file loading...');

// Unity Native Module (Swift) - RNUnityBridge가 실제 모듈 이름
const { RNUnityBridge: NativeUnityBridge } = NativeModules;

// Unity Bridge 인터페이스 (iOS RNUnityBridge와 일치)
export interface UnityBridgeInterface {
  // Unity로 메시지 전송 (순수 브리지 메서드)
  sendUnityMessage(objectName: string, methodName: string, parameter: string): Promise<void>;
  sendUnityJSON(objectName: string, methodName: string, data: any[]): Promise<void>;

  // 이벤트 리스너
  addEventListener(eventType: string, listener: (data: any) => void): () => void;
}

class UnityBridgeImpl implements UnityBridgeInterface {
  private eventEmitter: NativeEventEmitter | null = null;
  private eventListeners = new Map<string, any>();

  constructor() {
    console.log('[UnityBridge] Available native modules:', Object.keys(NativeModules));
    console.log('[UnityBridge] RNUnityBridge available:', !!NativeModules.RNUnityBridge);

    if (NativeUnityBridge) {
      console.log('[UnityBridge] Creating event emitter for RNUnityBridge...');
      this.eventEmitter = new NativeEventEmitter(NativeUnityBridge);
      this.setupEventListeners();
      console.log('[UnityBridge] Event listeners setup completed');
    } else {
      console.warn('[UnityBridge] RNUnityBridge native module not available');
      console.warn('[UnityBridge] Available modules:', Object.keys(NativeModules));
    }
  }

  private setupEventListeners(): void {
    if (!this.eventEmitter) return;

    // RNUnityBridge에서 지원하는 이벤트들
    const supportedEvents = [
      'onCharacterStateChanged',
      'onAvatarChanged',
      'onAvatarChangeError',
      'onAnimationComplete',
      'onUnityStatus',
      'onUnityError'
    ];

    supportedEvents.forEach(eventName => {
      this.eventEmitter!.addListener(eventName, (data) => {
        console.log(`[UnityBridge] Event received: ${eventName}`, data);
      });
    });
  }

  // iOS RNUnityBridge의 실제 메서드와 일치
  async sendUnityMessage(objectName: string, methodName: string, parameter: string): Promise<void> {
    if (!NativeUnityBridge) {
      throw new Error('RNUnityBridge native module not available');
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

    try {
      await NativeUnityBridge.sendUnityJSON(objectName, methodName, data);
      console.log(`[UnityBridge] JSON sent: ${objectName}.${methodName} with ${data.length} items`);
    } catch (error) {
      console.error('[UnityBridge] Failed to send Unity JSON:', error);
      throw error;
    }
  }
  
  addEventListener(eventType: string, listener: (data: any) => void): () => void {
    if (!this.eventEmitter) {
      console.warn('[UnityBridge] Event emitter not available');
      return () => {};
    }
    
    const subscription = this.eventEmitter.addListener(eventType, listener);
    this.eventListeners.set(eventType, subscription);
    
    // 구독 해제 함수 반환
    return () => {
      subscription.remove();
      this.eventListeners.delete(eventType);
    };
  }
  
  dispose(): void {
    // 모든 이벤트 리스너 정리
    this.eventListeners.forEach((subscription) => {
      subscription.remove();
    });
    this.eventListeners.clear();

    // Event Emitter 정리 (RNUnityBridge 이벤트들)
    if (this.eventEmitter) {
      const supportedEvents = [
        'onCharacterStateChanged',
        'onAvatarChanged',
        'onAvatarChangeError',
        'onAnimationComplete',
        'onUnityStatus',
        'onUnityError'
      ];

      supportedEvents.forEach(eventName => {
        this.eventEmitter!.removeAllListeners(eventName);
      });
    }

    console.log('[UnityBridge] Disposed');
  }
}

// 싱글톤 인스턴스
export const UnityBridge = new UnityBridgeImpl();