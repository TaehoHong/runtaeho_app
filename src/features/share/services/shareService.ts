/**
 * Share Service
 * 이미지 캡처 및 공유 기능 서비스
 */

import { Platform, PermissionsAndroid, Alert, Dimensions, Image, NativeModules } from 'react-native';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { ShareResult } from '../models/types';
import { CANVAS_SIZE } from '../constants/shareOptions';

// react-native-view-shot은 dynamic import로 사용 (선택적 의존성)
let captureScreen: ((options?: object) => Promise<string>) | null = null;
let Share: { open: (options: object) => Promise<any> } | null = null;

export interface ViewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CaptureRootBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface NativeCaptureRootBridge {
  getCaptureRootBounds?: () => Promise<CaptureRootBounds>;
}

/**
 * 의존성 동적 로드
 */
const loadDependencies = async () => {
  if (!captureScreen) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const viewShot = await import('react-native-view-shot').catch(() => require('react-native-view-shot'));
      captureScreen = viewShot.captureScreen;
    } catch (error) {
      console.warn('[ShareService] react-native-view-shot not available:', error);
    }
  }

  if (!Share) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const shareModule = await import('react-native-share').catch(() => require('react-native-share'));
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

  private async measureViewInWindow(viewRef: RefObject<View | null>): Promise<ViewBounds> {
    if (!viewRef.current) {
      throw new Error('View ref is not available');
    }

    return new Promise((resolve, reject) => {
      viewRef.current?.measureInWindow((x, y, width, height) => {
        if (width <= 0 || height <= 0) {
          reject(new Error('View bounds are invalid'));
          return;
        }

        resolve({ x, y, width, height });
      });
    });
  }

  private isViewFullyVisibleInWindow(bounds: ViewBounds): boolean {
    const windowSize = Dimensions.get('window');
    return (
      bounds.x >= 0
      && bounds.y >= 0
      && bounds.x + bounds.width <= windowSize.width
      && bounds.y + bounds.height <= windowSize.height
    );
  }

  private async getImageSize(uri: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        reject
      );
    });
  }

  private async resolveCaptureRootBounds(): Promise<CaptureRootBounds> {
    const windowSize = Dimensions.get('window');

    if (Platform.OS !== 'android') {
      return {
        x: 0,
        y: 0,
        width: windowSize.width,
        height: windowSize.height,
      };
    }

    const nativeBridge = NativeModules.RNUnityBridge as NativeCaptureRootBridge | undefined;
    if (!nativeBridge?.getCaptureRootBounds) {
      throw new Error('Android capture root lookup is not available');
    }

    const bounds = await nativeBridge.getCaptureRootBounds();
    if (bounds.width <= 0 || bounds.height <= 0) {
      throw new Error('Android capture root bounds are invalid');
    }

    return bounds;
  }

  private normalizeCropBounds(
    bounds: ViewBounds,
    captureRootBounds: CaptureRootBounds
  ): ViewBounds {
    if (Platform.OS !== 'android') {
      return bounds;
    }

    // Android captureScreen() snapshots the activity content root, not full window coordinates.
    return {
      x: bounds.x - captureRootBounds.x,
      y: bounds.y - captureRootBounds.y,
      width: bounds.width,
      height: bounds.height,
    };
  }

  private logAndroidCropDebug(
    stageBounds: ViewBounds,
    captureRootBounds: CaptureRootBounds,
    cropBounds: ViewBounds,
    cropRect: { originX: number; originY: number; width: number; height: number },
    screenshotSize: { width: number; height: number },
    screenshotUri: string
  ): void {
    if (!__DEV__ || Platform.OS !== 'android') {
      return;
    }

    console.log('[ShareService] Android crop debug:', {
      screenshotUri,
      rootBounds: captureRootBounds,
      stageBounds,
      cropBounds,
      cropRect,
      screenshotSize,
    });
  }

  private logAndroidExportResultDebug(
    screenshotUri: string,
    exportedImageUri: string
  ): void {
    if (!__DEV__ || Platform.OS !== 'android') {
      return;
    }

    console.log('[ShareService] Android export result:', {
      screenshotUri,
      exportedImageUri,
    });
  }

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
  async captureViewAsImage(
    viewRef: RefObject<View | null>,
    boundsOverride?: ViewBounds
  ): Promise<string> {
    await loadDependencies();

    if (!captureScreen) {
      throw new Error('Screen capture is not available');
    }

    try {
      const bounds = boundsOverride ?? await this.measureViewInWindow(viewRef);
      if (!this.isViewFullyVisibleInWindow(bounds)) {
        throw new Error('공유 이미지를 캡처하려면 export stage가 화면 안에 완전히 보여야 합니다.');
      }
      const captureRootBounds = await this.resolveCaptureRootBounds();
      const cropBounds = this.normalizeCropBounds(bounds, captureRootBounds);

      const screenshotUri = await captureScreen({
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        ...(Platform.OS === 'android' && { handleGLSurfaceViewOnAndroid: true }),
      });
      const screenshotSize = await this.getImageSize(screenshotUri);
      const scaleX = screenshotSize.width / captureRootBounds.width;
      const scaleY = screenshotSize.height / captureRootBounds.height;
      const originX = Math.min(
        Math.max(0, Math.round(cropBounds.x * scaleX)),
        Math.max(0, screenshotSize.width - 1)
      );
      const originY = Math.min(
        Math.max(0, Math.round(cropBounds.y * scaleY)),
        Math.max(0, screenshotSize.height - 1)
      );
      const width = Math.max(1, Math.min(
        screenshotSize.width - originX,
        Math.round(cropBounds.width * scaleX)
      ));
      const height = Math.max(1, Math.min(
        screenshotSize.height - originY,
        Math.round(cropBounds.height * scaleY)
      ));
      this.logAndroidCropDebug(bounds, captureRootBounds, cropBounds, {
        originX,
        originY,
        width,
        height,
      }, screenshotSize, screenshotUri);
      const exportedImage = await manipulateAsync(
        screenshotUri,
        [
          { crop: { originX, originY, width, height } },
          { resize: CANVAS_SIZE },
        ],
        { compress: 1, format: SaveFormat.PNG }
      );

      this.logAndroidExportResultDebug(screenshotUri, exportedImage.uri);
      console.log('[ShareService] Screen cropped to export stage:', exportedImage.uri);
      return exportedImage.uri;
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
    message?: string,
    boundsOverride?: ViewBounds
  ): Promise<ShareResult> {
    try {
      const imageUri = await this.captureViewAsImage(viewRef, boundsOverride);
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
