/**
 * Share Service
 * 이미지 캡처 및 공유 기능 서비스
 */

import { Platform, PermissionsAndroid, Alert } from 'react-native';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import type { ShareResult } from '../models/types';

// react-native-view-shot은 dynamic import로 사용 (선택적 의존성)
let captureRef: ((view: RefObject<View | null>, options?: object) => Promise<string>) | null = null;
let Share: { open: (options: object) => Promise<any> } | null = null;

/**
 * 의존성 동적 로드
 */
const loadDependencies = async () => {
  if (!captureRef) {
    try {
      const viewShot = await import('react-native-view-shot');
      captureRef = viewShot.captureRef;
    } catch (error) {
      console.warn('[ShareService] react-native-view-shot not available:', error);
    }
  }

  if (!Share) {
    try {
      const shareModule = await import('react-native-share');
      Share = shareModule.default;
    } catch (error) {
      console.warn('[ShareService] react-native-share not available:', error);
    }
  }
};

/**
 * Share Service 클래스
 */
export class ShareService {
  private static instance: ShareService;

  static getInstance(): ShareService {
    if (!ShareService.instance) {
      ShareService.instance = new ShareService();
    }
    return ShareService.instance;
  }

  constructor() {
    // 의존성 미리 로드
    loadDependencies();
  }

  /**
   * View를 이미지로 캡처
   * @param viewRef 캡처할 View의 ref
   * @returns 캡처된 이미지의 URI
   */
  async captureViewAsImage(viewRef: RefObject<View | null>): Promise<string> {
    await loadDependencies();

    if (!captureRef) {
      throw new Error('react-native-view-shot is not available');
    }

    if (!viewRef.current) {
      throw new Error('View ref is not available');
    }

    try {
      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      console.log('[ShareService] View captured:', uri);
      return uri;
    } catch (error) {
      console.error('[ShareService] Failed to capture view:', error);
      throw error;
    }
  }

  /**
   * 이미지를 공유
   * @param imageUri 공유할 이미지 URI
   * @param title 공유 제목
   * @param message 공유 메시지
   */
  async shareImage(
    imageUri: string,
    title: string = 'RunTaeho 러닝 기록',
    message: string = '오늘도 달렸어요!'
  ): Promise<ShareResult> {
    await loadDependencies();

    if (!Share) {
      throw new Error('react-native-share is not available');
    }

    try {
      const shareOptions = {
        title,
        message,
        url: imageUri,
        type: 'image/png',
        failOnCancel: false,
      };

      const result = await Share.open(shareOptions);
      console.log('[ShareService] Share result:', result);

      // 사용자가 공유를 취소한 경우 (iOS에서 공유 시트를 닫은 경우)
      if (result.dismissedAction) {
        return {
          success: false,
          message: '공유가 취소되었습니다.',
        };
      }

      return {
        success: true,
        app: result.app,
      };
    } catch (error: any) {
      // 사용자가 공유를 취소한 경우
      if (error.message?.includes('User did not share')) {
        return {
          success: false,
          message: '공유가 취소되었습니다.',
        };
      }

      console.error('[ShareService] Failed to share:', error);
      return {
        success: false,
        message: error.message || '공유에 실패했습니다.',
      };
    }
  }

  /**
   * 이미지를 갤러리에 저장
   * @param imageUri 저장할 이미지 URI
   */
  async saveToGallery(imageUri: string): Promise<boolean> {
    try {
      // Android 권한 확인
      if (Platform.OS === 'android') {
        const granted = await this.requestAndroidStoragePermission();
        if (!granted) {
          Alert.alert('권한 필요', '갤러리에 저장하려면 저장소 접근 권한이 필요합니다.');
          return false;
        }
      }

      // CameraRoll API 사용 (expo-media-library 또는 react-native-cameraroll)
      // 현재는 react-native-share를 통한 저장으로 대체
      await loadDependencies();

      if (Share) {
        await Share.open({
          url: imageUri,
          saveToFiles: true,
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('[ShareService] Failed to save to gallery:', error);
      return false;
    }
  }

  /**
   * Android 저장소 권한 요청
   */
  private async requestAndroidStoragePermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: '저장소 접근 권한',
          message: '이미지를 갤러리에 저장하려면 저장소 접근 권한이 필요합니다.',
          buttonNeutral: '나중에',
          buttonNegative: '취소',
          buttonPositive: '확인',
        }
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('[ShareService] Permission request failed:', error);
      return false;
    }
  }

  /**
   * 캡처 후 바로 공유
   * @param viewRef 캡처할 View의 ref
   * @param title 공유 제목
   * @param message 공유 메시지
   */
  async captureAndShare(
    viewRef: RefObject<View | null>,
    title?: string,
    message?: string
  ): Promise<ShareResult> {
    try {
      const imageUri = await this.captureViewAsImage(viewRef);
      return await this.shareImage(imageUri, title, message);
    } catch (error: any) {
      console.error('[ShareService] captureAndShare failed:', error);
      return {
        success: false,
        message: error.message || '캡처 및 공유에 실패했습니다.',
      };
    }
  }
}

export const shareService = ShareService.getInstance();
