/**
 * Unity Bridge
 * React Native와 Unity 간의 통신을 담당하는 브릿지
 * Swift Native Module과 연동
 */

import { NativeModules, NativeEventEmitter } from 'react-native';

// Unity Native Module (Swift)
const { UnityBridge: NativeUnityBridge } = NativeModules;

// Unity Bridge 인터페이스
export interface UnityBridgeInterface {
  // Unity 초기화
  initialize(): Promise<void>;
  
  // Unity 화면 제어
  showUnity(): Promise<void>;
  hideUnity(): Promise<void>;
  
  // Unity로 메시지 전송
  sendMessage(gameObject: string, methodName: string, message: string): Promise<void>;
  
  // 이벤트 리스너
  addEventListener(eventType: string, listener: (data: any) => void): () => void;
  
  // Unity 상태
  isReady: boolean;
}

class UnityBridgeImpl implements UnityBridgeInterface {
  private eventEmitter: NativeEventEmitter | null = null;
  private eventListeners = new Map<string, any>();
  private _isReady = false;
  
  constructor() {
    if (NativeUnityBridge) {
      this.eventEmitter = new NativeEventEmitter(NativeUnityBridge);
      this.setupEventListeners();
    } else {
      console.warn('[UnityBridge] Native Unity Bridge module not available');
    }
  }
  
  private setupEventListeners(): void {
    if (!this.eventEmitter) return;
    
    // Unity Ready 이벤트
    this.eventEmitter.addListener('UnityReady', (data) => {
      console.log('[UnityBridge] Unity is ready:', data);
      this._isReady = true;
    });
    
    // Unity Error 이벤트
    this.eventEmitter.addListener('UnityError', (error) => {
      console.error('[UnityBridge] Unity error:', error);
    });
  }
  
  get isReady(): boolean {
    return this._isReady;
  }
  
  async initialize(): Promise<void> {
    if (!NativeUnityBridge) {
      throw new Error('Unity Native Module not available');
    }
    
    try {
      await NativeUnityBridge.initialize();
      console.log('[UnityBridge] Unity initialized');
    } catch (error) {
      console.error('[UnityBridge] Failed to initialize Unity:', error);
      throw error;
    }
  }
  
  async showUnity(): Promise<void> {
    if (!NativeUnityBridge) {
      throw new Error('Unity Native Module not available');
    }
    
    try {
      await NativeUnityBridge.showUnity();
      console.log('[UnityBridge] Unity shown');
    } catch (error) {
      console.error('[UnityBridge] Failed to show Unity:', error);
      throw error;
    }
  }
  
  async hideUnity(): Promise<void> {
    if (!NativeUnityBridge) {
      throw new Error('Unity Native Module not available');
    }
    
    try {
      await NativeUnityBridge.hideUnity();
      console.log('[UnityBridge] Unity hidden');
    } catch (error) {
      console.error('[UnityBridge] Failed to hide Unity:', error);
      throw error;
    }
  }
  
  async sendMessage(gameObject: string, methodName: string, message: string = ''): Promise<void> {
    if (!NativeUnityBridge) {
      throw new Error('Unity Native Module not available');
    }
    
    try {
      await NativeUnityBridge.sendMessage(gameObject, methodName, message);
      console.log(`[UnityBridge] Message sent to ${gameObject}.${methodName}`);
    } catch (error) {
      console.error('[UnityBridge] Failed to send message to Unity:', error);
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
    
    // Event Emitter 정리
    if (this.eventEmitter) {
      this.eventEmitter.removeAllListeners('UnityReady');
      this.eventEmitter.removeAllListeners('UnityMessage');
      this.eventEmitter.removeAllListeners('UnityError');
    }
    
    console.log('[UnityBridge] Disposed');
  }
}

// 싱글톤 인스턴스
export const UnityBridge = new UnityBridgeImpl();