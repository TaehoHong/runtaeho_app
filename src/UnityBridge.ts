// UnityBridge.ts
import { NativeModules, NativeEventEmitter, requireNativeComponent, ViewProps } from 'react-native';

// Native Module
const { RNUnityBridge } = NativeModules;
const unityEventEmitter = new NativeEventEmitter(RNUnityBridge);

// Unity View Component
export const UnityView = requireNativeComponent<ViewProps>('UnityView');

// Unity Bridge Interface
export interface UnityBridge {
  // 초기화
  initialize(): Promise<boolean>;
  
  // Unity에 메시지 전송
  sendMessage(objectName: string, methodName: string, parameter: string): Promise<boolean>;
  
  // Unity 일시정지/재개
  pause(isPause: boolean): void;
  
  // 이벤트 리스너
  addEventListener(eventName: 'UnityReady' | 'UnityEvent' | 'UnityError', callback: (event: any) => void): any;
  removeEventListener(subscription: any): void;
}

// Unity Bridge 구현
class UnityBridgeImpl implements UnityBridge {
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }
    
    try {
      const result = await RNUnityBridge.initializeUnity();
      this.isInitialized = true;
      return result;
    } catch (error) {
      console.error('Failed to initialize Unity:', error);
      throw error;
    }
  }

  async sendMessage(objectName: string, methodName: string, parameter: string = ''): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      return await RNUnityBridge.sendMessage(objectName, methodName, parameter);
    } catch (error) {
      console.error('Failed to send message to Unity:', error);
      throw error;
    }
  }

  pause(isPause: boolean): void {
    RNUnityBridge.pauseUnity(isPause);
  }

  addEventListener(eventName: string, callback: (event: any) => void) {
    return unityEventEmitter.addListener(eventName, callback);
  }

  removeEventListener(subscription: any): void {
    subscription?.remove();
  }
}

// Export singleton instance
export const UnityBridge = new UnityBridgeImpl();

// Export types
export interface UnityEventData {
  eventName: string;
  data: any;
}
