import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * System Info Utility
 * 앱과 디바이스 정보를 제공하는 유틸리티
 */

export interface SystemInfo {
  // 앱 정보
  appVersion: string;
  buildNumber: string;
  bundleId: string;
  appName: string;
  
  // 디바이스 정보
  deviceModel: string;
  deviceName: string;
  osName: string;
  osVersion: string;
  isDevice: boolean;
  
  // 환경 정보
  isProduction: boolean;
  isDevelopment: boolean;
  expoVersion: string;
}

export class SystemInfoManager {
  private static instance: SystemInfoManager;
  private cachedInfo: SystemInfo | null = null;
  
  private constructor() {}
  
  static getInstance(): SystemInfoManager {
    if (!SystemInfoManager.instance) {
      SystemInfoManager.instance = new SystemInfoManager();
    }
    return SystemInfoManager.instance;
  }
  
  /**
   * 전체 시스템 정보 가져오기
   */
  getSystemInfo(): SystemInfo {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }
    
    const info: SystemInfo = {
      // 앱 정보
      appVersion: this.getAppVersion(),
      buildNumber: this.getBuildNumber(),
      bundleId: this.getBundleId(),
      appName: this.getAppName(),
      
      // 디바이스 정보
      deviceModel: this.getDeviceModel(),
      deviceName: this.getDeviceName(),
      osName: Platform.OS,
      osVersion: this.getOSVersion(),
      isDevice: Device.isDevice ?? true,
      
      // 환경 정보
      isProduction: this.isProduction(),
      isDevelopment: this.isDevelopment(),
      expoVersion: this.getExpoVersion(),
    };
    
    this.cachedInfo = info;
    return info;
  }
  
  /**
   * 앱 버전
   */
  getAppVersion(): string {
    const platformConfig = Platform.OS === 'ios' ? Constants.expoConfig?.ios : Constants.expoConfig?.android;
    if (platformConfig?.version) return platformConfig.version;
    return Constants.expoConfig?.version || '1.0.0';
  }
  
  /**
   * 빌드 번호
   */
  getBuildNumber(): string {
    if (Platform.OS === 'ios') {
      return Constants.expoConfig?.ios?.buildNumber || '1';
    } else {
      const versionCode = Constants.expoConfig?.android?.versionCode || 1;
      return String(versionCode);
    }
  }
  
  /**
   * 전체 버전 문자열 (SwiftUI와 동일 형식)
   */
  getFullVersionString(): string {
    const version = this.getAppVersion();
    const build = this.getBuildNumber();
    return `${version} (${build})`;
  }
  
  /**
   * 번들 ID / Package Name
   */
  getBundleId(): string {
    if (Platform.OS === 'ios') {
      return Constants.expoConfig?.ios?.bundleIdentifier || 'com.runtaeho.app';
    } else {
      return Constants.expoConfig?.android?.package || 'com.runtaeho.app';
    }
  }
  
  /**
   * 앱 이름
   */
  getAppName(): string {
    return Constants.expoConfig?.name || 'RunTaeho';
  }
  
  /**
   * 디바이스 모델
   */
  getDeviceModel(): string {
    if (Device.modelName) {
      return Device.modelName;
    }
    return Platform.OS === 'ios' ? 'iPhone' : 'Android Device';
  }
  
  /**
   * 디바이스 이름
   */
  getDeviceName(): string {
    return Device.deviceName || 'Unknown Device';
  }
  
  /**
   * OS 버전
   */
  getOSVersion(): string {
    return Device.osVersion || Platform.Version.toString();
  }
  
  /**
   * Expo SDK 버전
   */
  getExpoVersion(): string {
    return Constants.expoConfig?.sdkVersion || 'Unknown';
  }
  
  /**
   * 프로덕션 환경 여부
   */
  isProduction(): boolean {
    return Constants.executionEnvironment === 'standalone' || 
           Constants.executionEnvironment === 'storeClient';
  }
  
  /**
   * 개발 환경 여부
   */
  isDevelopment(): boolean {
    return __DEV__;
  }
  
  /**
   * 시뮬레이터/에뮬레이터 여부
   */
  isSimulator(): boolean {
    return !Device.isDevice;
  }
  
  /**
   * 태블릿 여부
   */
  isTablet(): boolean {
    return Device.deviceType === Device.DeviceType.TABLET;
  }
  
  /**
   * 디바이스 연도 (iOS only)
   */
  getDeviceYearClass(): number | null {
    return Device.deviceYearClass || null;
  }
  
  /**
   * 메모리 크기 (bytes)
   */
  getTotalMemory(): number | null {
    return Device.totalMemory || null;
  }
  
  /**
   * 메모리 크기 (human readable)
   */
  getTotalMemoryFormatted(): string {
    const memory = this.getTotalMemory();
    if (!memory) return 'Unknown';
    
    const gb = memory / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  }
  
  /**
   * 사용자 에이전트 문자열 생성
   */
  getUserAgent(): string {
    const info = this.getSystemInfo();
    return `RunTaeho/${info.appVersion} (${info.osName}/${info.osVersion}; ${info.deviceModel})`;
  }
  
  /**
   * 디버그용 전체 정보 출력
   */
  printDebugInfo(): void {
    const info = this.getSystemInfo();
    
    console.log('========================================');
    console.log('📱 System Information');
    console.log('========================================');
    console.log('App Info:');
    console.log(`  Name: ${info.appName}`);
    console.log(`  Version: ${info.appVersion}`);
    console.log(`  Build: ${info.buildNumber}`);
    console.log(`  Bundle ID: ${info.bundleId}`);
    console.log('');
    console.log('Device Info:');
    console.log(`  Model: ${info.deviceModel}`);
    console.log(`  Name: ${info.deviceName}`);
    console.log(`  OS: ${info.osName} ${info.osVersion}`);
    console.log(`  Is Device: ${info.isDevice}`);
    console.log(`  Memory: ${this.getTotalMemoryFormatted()}`);
    console.log('');
    console.log('Environment:');
    console.log(`  Production: ${info.isProduction}`);
    console.log(`  Development: ${info.isDevelopment}`);
    console.log(`  Expo SDK: ${info.expoVersion}`);
    console.log('========================================');
  }
  
  /**
   * 캐시 클리어 (앱 업데이트 후 등)
   */
  clearCache(): void {
    this.cachedInfo = null;
  }
}

// Singleton export
export const systemInfoManager = SystemInfoManager.getInstance();
