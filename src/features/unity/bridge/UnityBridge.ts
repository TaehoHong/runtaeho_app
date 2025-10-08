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
}

class UnityBridgeImpl implements UnityBridgeInterface {
  private eventEmitter: NativeEventEmitter | null = null;

  constructor() {
    console.log('[UnityBridge] Available native modules:', Object.keys(NativeModules));
    console.log('[UnityBridge] RNUnityBridge available:', !!NativeModules.RNUnityBridge);

    if (NativeUnityBridge) {
      console.log('[UnityBridge] Creating event emitter for RNUnityBridge...');
      this.eventEmitter = new NativeEventEmitter(NativeUnityBridge);
      console.log('[UnityBridge] Event listeners setup completed');
    } else {
      console.warn('[UnityBridge] RNUnityBridge native module not available');
      console.warn('[UnityBridge] Available modules:', Object.keys(NativeModules));
    }
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
}

// 싱글톤 인스턴스
export const UnityBridge = new UnityBridgeImpl();