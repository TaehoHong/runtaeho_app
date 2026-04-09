/**
 * Share Service
 * 공유 이미지 캡처와 공유 sheet 호출을 담당한다.
 */

import { Dimensions, Image, NativeModules, Platform } from 'react-native';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { ShareResult } from '../models/types';
import { CANVAS_SIZE } from '../constants/shareOptions';

let captureScreen: ((options?: object) => Promise<string>) | null = null;
let captureRef: ((viewRef: RefObject<View | null>, options?: object) => Promise<string>) | null = null;
let Share: { open: (options: object) => Promise<any> } | null = null;

export interface ViewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface NativeCaptureRootBridge {
  composeShareExportFromUnityAndOverlay?: (
    overlayUri: string,
    targetWidth: number,
    targetHeight: number
  ) => Promise<{
    uri: string;
    width: number;
    height: number;
  }>;
}

const ensureShareDependenciesLoaded = async () => {
  if (!captureScreen) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const viewShot = await import('react-native-view-shot').catch(() => require('react-native-view-shot'));
      captureScreen = viewShot.captureScreen;
      captureRef = viewShot.captureRef;
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

const measureViewInWindow = async (
  viewRef: RefObject<View | null>
): Promise<ViewBounds> => {
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
};

const isViewFullyVisibleInWindow = (bounds: ViewBounds): boolean => {
  const windowSize = Dimensions.get('window');
  return (
    bounds.x >= 0
    && bounds.y >= 0
    && bounds.x + bounds.width <= windowSize.width
    && bounds.y + bounds.height <= windowSize.height
  );
};

const getImageSize = async (uri: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject
    );
  });

const captureOverlaySnapshot = async (
  viewRef: RefObject<View | null>
): Promise<{ uri: string; size: { width: number; height: number } }> => {
  if (!captureRef) {
    throw new Error('View capture is not available');
  }

  const overlayUri = await captureRef(viewRef, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
    width: CANVAS_SIZE.width,
    height: CANVAS_SIZE.height,
  });

  return {
    uri: overlayUri,
    size: await getImageSize(overlayUri),
  };
};

const captureStageImageAndroid = async (
  viewRef: RefObject<View | null>
): Promise<string> => {
  const nativeBridge = NativeModules.RNUnityBridge as NativeCaptureRootBridge | undefined;
  if (Platform.OS !== 'android' || !nativeBridge?.composeShareExportFromUnityAndOverlay) {
    throw new Error('Android native share composition is not available');
  }

  const overlayCapture = await captureOverlaySnapshot(viewRef);
  const composedImage = await nativeBridge.composeShareExportFromUnityAndOverlay(
    overlayCapture.uri,
    overlayCapture.size.width,
    overlayCapture.size.height
  );

  return composedImage.uri;
};

const captureStageImageIOS = async (
  viewRef: RefObject<View | null>,
  boundsOverride?: ViewBounds
): Promise<string> => {
  if (!captureScreen) {
    throw new Error('Screen capture is not available');
  }

  const bounds = boundsOverride ?? await measureViewInWindow(viewRef);
  if (!isViewFullyVisibleInWindow(bounds)) {
    throw new Error('공유 이미지를 캡처하려면 export stage가 화면 안에 완전히 보여야 합니다.');
  }

  const windowSize = Dimensions.get('window');
  const screenshotUri = await captureScreen({
    format: 'png',
    quality: 1,
    result: 'tmpfile',
  });
  const screenshotSize = await getImageSize(screenshotUri);
  const scaleX = screenshotSize.width / windowSize.width;
  const scaleY = screenshotSize.height / windowSize.height;
  const originX = Math.min(
    Math.max(0, Math.round(bounds.x * scaleX)),
    Math.max(0, screenshotSize.width - 1)
  );
  const originY = Math.min(
    Math.max(0, Math.round(bounds.y * scaleY)),
    Math.max(0, screenshotSize.height - 1)
  );
  const width = Math.max(
    1,
    Math.min(screenshotSize.width - originX, Math.round(bounds.width * scaleX))
  );
  const height = Math.max(
    1,
    Math.min(screenshotSize.height - originY, Math.round(bounds.height * scaleY))
  );

  const exportedImage = await manipulateAsync(
    screenshotUri,
    [
      { crop: { originX, originY, width, height } },
      { resize: CANVAS_SIZE },
    ],
    { compress: 1, format: SaveFormat.PNG }
  );

  return exportedImage.uri;
};

export const captureViewAsImage = async (
  viewRef: RefObject<View | null>,
  boundsOverride?: ViewBounds
): Promise<string> => {
  await ensureShareDependenciesLoaded();

  try {
    if (Platform.OS === 'android') {
      return await captureStageImageAndroid(viewRef);
    }

    return await captureStageImageIOS(viewRef, boundsOverride);
  } catch (error) {
    console.error('[ShareService] Failed to capture view:', error);
    throw error;
  }
};

export const shareImage = async (
  imageUri: string,
  title: string = 'RunTaeho 러닝 기록',
  message: string = '오늘도 달렸어요!'
): Promise<ShareResult> => {
  await ensureShareDependenciesLoaded();

  if (!Share) {
    throw new Error('react-native-share is not available');
  }

  try {
    const result = await Share.open({
      title,
      message,
      url: imageUri,
      type: 'image/png',
      failOnCancel: false,
    });

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
};

export const captureAndShare = async (
  viewRef: RefObject<View | null>,
  title?: string,
  message?: string,
  boundsOverride?: ViewBounds
): Promise<ShareResult> => {
  try {
    const imageUri = await captureViewAsImage(viewRef, boundsOverride);
    return await shareImage(imageUri, title, message);
  } catch (error: any) {
    console.error('[ShareService] captureAndShare failed:', error);
    return {
      success: false,
      message: error.message || '캡처 및 공유에 실패했습니다.',
    };
  }
};

export const shareService = {
  captureViewAsImage,
  shareImage,
  captureAndShare,
} as const;
