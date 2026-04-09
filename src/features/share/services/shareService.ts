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
import {
  ANDROID_SHARE_DIAGNOSTIC_MODE,
  SHARE_DIAGNOSTIC_MARKERS,
  type AndroidShareDiagnosticMode,
  type ShareDiagnosticMarkerId,
} from '../constants/shareDiagnostics';

// react-native-view-shot은 dynamic import로 사용 (선택적 의존성)
let captureScreen: ((options?: object) => Promise<string>) | null = null;
let captureRef: ((viewRef: RefObject<View | null>, options?: object) => Promise<string>) | null = null;
let Share: { open: (options: object) => Promise<any> } | null = null;
const CROP_PROOF_MAX_RESIDUAL_PX = 6;
type AndroidSurfaceViewCompositionMode = 'after' | 'before' | 'skip';

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
  detectDiagnosticMarkers?: (
    sourceUri: string,
    markerColorHexes: string[]
  ) => Promise<NativeDetectedDiagnosticMarker[]>;
  annotateImageRect?: (
    sourceUri: string,
    originX: number,
    originY: number,
    width: number,
    height: number,
    colorHex: string
  ) => Promise<{
    uri: string;
    width: number;
    height: number;
  }>;
  cropAndResizeImage?: (
    sourceUri: string,
    originX: number,
    originY: number,
    width: number,
    height: number,
    targetWidth: number,
    targetHeight: number
  ) => Promise<{
      uri: string;
      width: number;
      height: number;
  }>;
  composeDebugComparison?: (
    afterUri: string,
    beforeUri: string,
    skipUri: string,
    overlayUri: string
  ) => Promise<{
    uri: string;
    width: number;
    height: number;
  }>;
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

interface NativeDetectedDiagnosticMarker {
  colorHex: string;
  detected: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface DetectedDiagnosticMarker {
  id: ShareDiagnosticMarkerId;
  colorHex: string;
  detected: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface MarkerCenterPoint {
  id: ShareDiagnosticMarkerId;
  x: number;
  y: number;
}

interface CropProofAnalysis {
  overlayUri: string;
  overlaySize: { width: number; height: number };
  rawMarkers: DetectedDiagnosticMarker[];
  overlayMarkers: DetectedDiagnosticMarker[];
  derivedStageRect: CapturedStageSnapshot['cropRect'] | null;
  maxResidualPx: number | null;
  isConsistentTransform: boolean;
}

interface CapturedStageSnapshot {
  screenshotUri: string;
  screenshotSize: { width: number; height: number };
  stageBounds: ViewBounds;
  captureRootBounds: CaptureRootBounds;
  cropBounds: ViewBounds;
  cropRect: {
    originX: number;
    originY: number;
    width: number;
    height: number;
  };
}

interface SurfaceCompositionCapture {
  mode: AndroidSurfaceViewCompositionMode;
  uri: string;
  size: { width: number; height: number };
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

/**
 * Share Service 클래스
 */
export class ShareService {
  private static instance: ShareService;
  private static androidShareDiagnosticMode: AndroidShareDiagnosticMode = ANDROID_SHARE_DIAGNOSTIC_MODE;

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
    if (Platform.OS !== 'android') {
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
    if (Platform.OS !== 'android') {
      return;
    }

    console.log('[ShareService] Android export result:', {
      screenshotUri,
      exportedImageUri,
    });
  }

  private logAndroidShareSourceDebug(
    source: AndroidShareDiagnosticMode,
    imageUri: string
  ): void {
    if (Platform.OS !== 'android') {
      return;
    }

    console.log('[ShareService] Android share source:', {
      source,
      imageUri,
    });
  }

  private getAndroidShareDiagnosticMode(): AndroidShareDiagnosticMode | null {
    if (Platform.OS !== 'android') {
      return null;
    }

    return ShareService.androidShareDiagnosticMode;
  }

  private async captureOverlaySnapshot(
    viewRef: RefObject<View | null>
  ): Promise<{ uri: string; size: { width: number; height: number } }> {
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
    const overlaySize = await this.getImageSize(overlayUri);

    return {
      uri: overlayUri,
      size: overlaySize,
    };
  }

  private async exportAndroidComposedStageSnapshot(
    viewRef: RefObject<View | null>
  ): Promise<string> {
    const nativeBridge = NativeModules.RNUnityBridge as NativeCaptureRootBridge | undefined;
    if (Platform.OS !== 'android' || !nativeBridge?.composeShareExportFromUnityAndOverlay) {
      throw new Error('Android native share composition is not available');
    }

    const overlayCapture = await this.captureOverlaySnapshot(viewRef);
    const composedImage = await nativeBridge.composeShareExportFromUnityAndOverlay(
      overlayCapture.uri,
      overlayCapture.size.width,
      overlayCapture.size.height
    );

    this.logAndroidExportResultDebug(overlayCapture.uri, composedImage.uri);
    console.log('[ShareService] Android composed share export:', {
      overlayUri: overlayCapture.uri,
      exportedImageUri: composedImage.uri,
      overlaySize: overlayCapture.size,
    });

    return composedImage.uri;
  }

  private async captureScreenWithCompositionMode(
    compositionMode: AndroidSurfaceViewCompositionMode
  ): Promise<SurfaceCompositionCapture> {
    if (!captureScreen) {
      throw new Error('Screen capture is not available');
    }

    const uri = await captureScreen({
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      ...(Platform.OS === 'android' && {
        handleGLSurfaceViewOnAndroid: true,
        surfaceViewCompositionMode: compositionMode,
      }),
    });
    const size = await this.getImageSize(uri);

    return {
      mode: compositionMode,
      uri,
      size,
    };
  }

  private async exportSurfaceCompositionProofSnapshot(
    viewRef: RefObject<View | null>,
    boundsOverride?: ViewBounds
  ): Promise<string> {
    const stageBounds = boundsOverride ?? await this.measureViewInWindow(viewRef);
    if (!this.isViewFullyVisibleInWindow(stageBounds)) {
      throw new Error('공유 이미지를 캡처하려면 export stage가 화면 안에 완전히 보여야 합니다.');
    }

    const nativeBridge = NativeModules.RNUnityBridge as NativeCaptureRootBridge | undefined;
    if (Platform.OS !== 'android' || !nativeBridge?.composeDebugComparison) {
      throw new Error('Android surface composition comparison is not available');
    }

    const afterCapture = await this.captureScreenWithCompositionMode('after');
    const beforeCapture = await this.captureScreenWithCompositionMode('before');
    const skipCapture = await this.captureScreenWithCompositionMode('skip');
    const overlayCapture = await this.captureOverlaySnapshot(viewRef);

    console.log('[ShareService] Android surface composition proof captures:', {
      stageBounds,
      afterCapture,
      beforeCapture,
      skipCapture,
      overlayCapture,
    });

    const comparisonImage = await nativeBridge.composeDebugComparison(
      afterCapture.uri,
      beforeCapture.uri,
      skipCapture.uri,
      overlayCapture.uri
    );

    this.logAndroidExportResultDebug(afterCapture.uri, comparisonImage.uri);
    console.log('[ShareService] Screen annotated with surface composition comparison:', comparisonImage.uri);
    return comparisonImage.uri;
  }

  private async detectDiagnosticMarkers(sourceUri: string): Promise<DetectedDiagnosticMarker[]> {
    const nativeBridge = NativeModules.RNUnityBridge as NativeCaptureRootBridge | undefined;
    if (Platform.OS !== 'android' || !nativeBridge?.detectDiagnosticMarkers) {
      throw new Error('Android diagnostic marker detection is not available');
    }

    const detectedMarkers = await nativeBridge.detectDiagnosticMarkers(
      sourceUri,
      SHARE_DIAGNOSTIC_MARKERS.map((marker) => marker.colorHex)
    );
    const detectedByColor = new Map(
      detectedMarkers.map((marker) => [marker.colorHex.toLowerCase(), marker])
    );

    return SHARE_DIAGNOSTIC_MARKERS.map((marker) => {
      const detected = detectedByColor.get(marker.colorHex.toLowerCase());

      return {
        id: marker.id,
        colorHex: marker.colorHex,
        detected: detected?.detected ?? false,
        x: detected?.x,
        y: detected?.y,
        width: detected?.width,
        height: detected?.height,
      };
    });
  }

  private getDetectedMarkerCenters(markers: DetectedDiagnosticMarker[]): MarkerCenterPoint[] {
    return markers.flatMap((marker) => {
      if (
        !marker.detected
        || typeof marker.x !== 'number'
        || typeof marker.y !== 'number'
        || typeof marker.width !== 'number'
        || typeof marker.height !== 'number'
      ) {
        return [];
      }

      return [{
        id: marker.id,
        x: marker.x + marker.width / 2,
        y: marker.y + marker.height / 2,
      }];
    });
  }

  private analyzeCropProofTransform(
    snapshot: CapturedStageSnapshot,
    overlayUri: string,
    overlaySize: { width: number; height: number },
    rawMarkers: DetectedDiagnosticMarker[],
    overlayMarkers: DetectedDiagnosticMarker[]
  ): CropProofAnalysis {
    const rawCenters = new Map(
      this.getDetectedMarkerCenters(rawMarkers).map((center) => [center.id, center])
    );
    const overlayCenters = new Map(
      this.getDetectedMarkerCenters(overlayMarkers).map((center) => [center.id, center])
    );

    const topLeftRaw = rawCenters.get('topLeft');
    const topRightRaw = rawCenters.get('topRight');
    const bottomLeftRaw = rawCenters.get('bottomLeft');
    const topLeftOverlay = overlayCenters.get('topLeft');
    const topRightOverlay = overlayCenters.get('topRight');
    const bottomLeftOverlay = overlayCenters.get('bottomLeft');

    if (
      !topLeftRaw
      || !topRightRaw
      || !bottomLeftRaw
      || !topLeftOverlay
      || !topRightOverlay
      || !bottomLeftOverlay
    ) {
      return {
        overlayUri,
        overlaySize,
        rawMarkers,
        overlayMarkers,
        derivedStageRect: null,
        maxResidualPx: null,
        isConsistentTransform: false,
      };
    }

    const overlayDeltaX = topRightOverlay.x - topLeftOverlay.x;
    const overlayDeltaY = bottomLeftOverlay.y - topLeftOverlay.y;
    if (overlayDeltaX <= 0 || overlayDeltaY <= 0) {
      return {
        overlayUri,
        overlaySize,
        rawMarkers,
        overlayMarkers,
        derivedStageRect: null,
        maxResidualPx: null,
        isConsistentTransform: false,
      };
    }

    const scaleX = (topRightRaw.x - topLeftRaw.x) / overlayDeltaX;
    const scaleY = (bottomLeftRaw.y - topLeftRaw.y) / overlayDeltaY;
    if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY) || scaleX <= 0 || scaleY <= 0) {
      return {
        overlayUri,
        overlaySize,
        rawMarkers,
        overlayMarkers,
        derivedStageRect: null,
        maxResidualPx: null,
        isConsistentTransform: false,
      };
    }

    const translateX = topLeftRaw.x - topLeftOverlay.x * scaleX;
    const translateY = topLeftRaw.y - topLeftOverlay.y * scaleY;
    const residuals = this.getDetectedMarkerCenters(overlayMarkers).flatMap((overlayCenter) => {
      const rawCenter = rawCenters.get(overlayCenter.id);
      if (!rawCenter) {
        return [];
      }

      const predictedX = translateX + overlayCenter.x * scaleX;
      const predictedY = translateY + overlayCenter.y * scaleY;
      return [Math.max(Math.abs(rawCenter.x - predictedX), Math.abs(rawCenter.y - predictedY))];
    });
    const maxResidualPx = residuals.length > 0 ? Math.max(...residuals) : null;
    const isConsistentTransform = typeof maxResidualPx === 'number'
      && maxResidualPx <= CROP_PROOF_MAX_RESIDUAL_PX;
    const derivedStageRect = isConsistentTransform
      ? this.buildClampedCropRect(
        snapshot.screenshotSize,
        translateX,
        translateY,
        overlaySize.width * scaleX,
        overlaySize.height * scaleY
      )
      : null;

    console.log('[ShareService] Android crop proof analysis:', {
      screenshotUri: snapshot.screenshotUri,
      overlayUri,
      screenshotSize: snapshot.screenshotSize,
      overlaySize,
      currentCropRect: snapshot.cropRect,
      rawMarkers,
      overlayMarkers,
      derivedStageRect,
      scaleX,
      scaleY,
      translateX,
      translateY,
      maxResidualPx,
      isConsistentTransform,
    });

    return {
      overlayUri,
      overlaySize,
      rawMarkers,
      overlayMarkers,
      derivedStageRect,
      maxResidualPx,
      isConsistentTransform,
    };
  }

  private async exportCropProofSnapshot(
    viewRef: RefObject<View | null>,
    snapshot: CapturedStageSnapshot
  ): Promise<string> {
    const overlaySnapshot = await this.captureOverlaySnapshot(viewRef);
    const [rawMarkers, overlayMarkers] = await Promise.all([
      this.detectDiagnosticMarkers(snapshot.screenshotUri),
      this.detectDiagnosticMarkers(overlaySnapshot.uri),
    ]);
    const analysis = this.analyzeCropProofTransform(
      snapshot,
      overlaySnapshot.uri,
      overlaySnapshot.size,
      rawMarkers,
      overlayMarkers
    );
    let annotatedUri = await this.exportAnnotatedRawSnapshot(snapshot);

    if (!analysis.derivedStageRect) {
      return annotatedUri;
    }

    const nativeBridge = NativeModules.RNUnityBridge as NativeCaptureRootBridge | undefined;
    if (Platform.OS === 'android' && nativeBridge?.annotateImageRect) {
      const annotatedDerivedStage = await nativeBridge.annotateImageRect(
        annotatedUri,
        analysis.derivedStageRect.originX,
        analysis.derivedStageRect.originY,
        analysis.derivedStageRect.width,
        analysis.derivedStageRect.height,
        '#34C759'
      );
      annotatedUri = annotatedDerivedStage.uri;
    }

    return annotatedUri;
  }

  private async captureStageSnapshot(
    viewRef: RefObject<View | null>,
    boundsOverride?: ViewBounds
  ): Promise<CapturedStageSnapshot> {
    const stageBounds = boundsOverride ?? await this.measureViewInWindow(viewRef);
    if (!this.isViewFullyVisibleInWindow(stageBounds)) {
      throw new Error('공유 이미지를 캡처하려면 export stage가 화면 안에 완전히 보여야 합니다.');
    }

    const captureRootBounds = await this.resolveCaptureRootBounds();
    const cropBounds = this.normalizeCropBounds(stageBounds, captureRootBounds);

    const screenshotUri = await captureScreen!({
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      ...(Platform.OS === 'android' && { handleGLSurfaceViewOnAndroid: true }),
    });
    const screenshotSize = await this.getImageSize(screenshotUri);
    const scaleX = screenshotSize.width / captureRootBounds.width;
    const scaleY = screenshotSize.height / captureRootBounds.height;
    const cropRect = {
      originX: Math.min(
        Math.max(0, Math.round(cropBounds.x * scaleX)),
        Math.max(0, screenshotSize.width - 1)
      ),
      originY: Math.min(
        Math.max(0, Math.round(cropBounds.y * scaleY)),
        Math.max(0, screenshotSize.height - 1)
      ),
      width: 1,
      height: 1,
    };

    cropRect.width = Math.max(1, Math.min(
      screenshotSize.width - cropRect.originX,
      Math.round(cropBounds.width * scaleX)
    ));
    cropRect.height = Math.max(1, Math.min(
      screenshotSize.height - cropRect.originY,
      Math.round(cropBounds.height * scaleY)
    ));

    this.logAndroidCropDebug(
      stageBounds,
      captureRootBounds,
      cropBounds,
      cropRect,
      screenshotSize,
      screenshotUri
    );

    return {
      screenshotUri,
      screenshotSize,
      stageBounds,
      captureRootBounds,
      cropBounds,
      cropRect,
    };
  }

  private async exportCapturedStage(
    snapshot: CapturedStageSnapshot,
    options: { resizeToCanvas: boolean } = { resizeToCanvas: true }
  ): Promise<string> {
    const nativeBridge = NativeModules.RNUnityBridge as NativeCaptureRootBridge | undefined;
    const targetWidth = options.resizeToCanvas ? CANVAS_SIZE.width : 0;
    const targetHeight = options.resizeToCanvas ? CANVAS_SIZE.height : 0;

    if (Platform.OS === 'android' && nativeBridge?.cropAndResizeImage) {
      const exportedImage = await nativeBridge.cropAndResizeImage(
        snapshot.screenshotUri,
        snapshot.cropRect.originX,
        snapshot.cropRect.originY,
        snapshot.cropRect.width,
        snapshot.cropRect.height,
        targetWidth,
        targetHeight
      );

      this.logAndroidExportResultDebug(snapshot.screenshotUri, exportedImage.uri);
      console.log('[ShareService] Screen cropped to export stage:', exportedImage.uri);
      return exportedImage.uri;
    }

    const actions: (
      | { crop: CapturedStageSnapshot['cropRect'] }
      | { resize: typeof CANVAS_SIZE }
    )[] = [{ crop: snapshot.cropRect }];

    if (options.resizeToCanvas) {
      actions.push({ resize: CANVAS_SIZE });
    }

    const exportedImage = await manipulateAsync(
      snapshot.screenshotUri,
      actions,
      { compress: 1, format: SaveFormat.PNG }
    );

    this.logAndroidExportResultDebug(snapshot.screenshotUri, exportedImage.uri);
    console.log('[ShareService] Screen cropped to export stage:', exportedImage.uri);
    return exportedImage.uri;
  }

  private async exportAnnotatedRawSnapshot(snapshot: CapturedStageSnapshot): Promise<string> {
    const nativeBridge = NativeModules.RNUnityBridge as NativeCaptureRootBridge | undefined;

    if (Platform.OS === 'android' && nativeBridge?.annotateImageRect) {
      const annotatedImage = await nativeBridge.annotateImageRect(
        snapshot.screenshotUri,
        snapshot.cropRect.originX,
        snapshot.cropRect.originY,
        snapshot.cropRect.width,
        snapshot.cropRect.height,
        '#FF3B30'
      );

      this.logAndroidExportResultDebug(snapshot.screenshotUri, annotatedImage.uri);
      console.log('[ShareService] Screen annotated with export stage:', annotatedImage.uri);
      return annotatedImage.uri;
    }

    return snapshot.screenshotUri;
  }

  private buildClampedCropRect(
    screenshotSize: { width: number; height: number },
    originX: number,
    originY: number,
    width: number,
    height: number
  ): CapturedStageSnapshot['cropRect'] {
    const clampedOriginX = Math.min(
      Math.max(0, Math.round(originX)),
      Math.max(0, screenshotSize.width - 1)
    );
    const clampedOriginY = Math.min(
      Math.max(0, Math.round(originY)),
      Math.max(0, screenshotSize.height - 1)
    );

    return {
      originX: clampedOriginX,
      originY: clampedOriginY,
      width: Math.max(1, Math.min(
        screenshotSize.width - clampedOriginX,
        Math.round(width)
      )),
      height: Math.max(1, Math.min(
        screenshotSize.height - clampedOriginY,
        Math.round(height)
      )),
    };
  }

  private buildWindowScaledCropRect(
    snapshot: CapturedStageSnapshot
  ): CapturedStageSnapshot['cropRect'] {
    const windowSize = Dimensions.get('window');
    const scaleX = snapshot.screenshotSize.width / windowSize.width;
    const scaleY = snapshot.screenshotSize.height / windowSize.height;

    return this.buildClampedCropRect(
      snapshot.screenshotSize,
      snapshot.stageBounds.x * scaleX,
      snapshot.stageBounds.y * scaleY,
      snapshot.stageBounds.width * scaleX,
      snapshot.stageBounds.height * scaleY
    );
  }

  private async exportWindowScaledCapturedStage(
    snapshot: CapturedStageSnapshot,
    options: { resizeToCanvas: boolean } = { resizeToCanvas: true }
  ): Promise<string> {
    const windowScaledCropRect = this.buildWindowScaledCropRect(snapshot);
    const adjustedSnapshot: CapturedStageSnapshot = {
      ...snapshot,
      cropRect: windowScaledCropRect,
    };

    console.log('[ShareService] Android window-scaled crop debug:', {
      screenshotUri: snapshot.screenshotUri,
      originalCropRect: snapshot.cropRect,
      windowScaledCropRect,
      windowSize: Dimensions.get('window'),
    });

    return this.exportCapturedStage(adjustedSnapshot, options);
  }

  private async exportAnnotatedComparisonSnapshot(snapshot: CapturedStageSnapshot): Promise<string> {
    const nativeBridge = NativeModules.RNUnityBridge as NativeCaptureRootBridge | undefined;
    const windowScaledCropRect = this.buildWindowScaledCropRect(snapshot);

    console.log('[ShareService] Android crop comparison debug:', {
      screenshotUri: snapshot.screenshotUri,
      currentCropRect: snapshot.cropRect,
      windowScaledCropRect,
      windowSize: Dimensions.get('window'),
    });

    if (Platform.OS === 'android' && nativeBridge?.annotateImageRect) {
      const currentAnnotatedImage = await nativeBridge.annotateImageRect(
        snapshot.screenshotUri,
        snapshot.cropRect.originX,
        snapshot.cropRect.originY,
        snapshot.cropRect.width,
        snapshot.cropRect.height,
        '#FF3B30'
      );

      const comparisonAnnotatedImage = await nativeBridge.annotateImageRect(
        currentAnnotatedImage.uri,
        windowScaledCropRect.originX,
        windowScaledCropRect.originY,
        windowScaledCropRect.width,
        windowScaledCropRect.height,
        '#34C759'
      );

      this.logAndroidExportResultDebug(snapshot.screenshotUri, comparisonAnnotatedImage.uri);
      console.log('[ShareService] Screen annotated with crop comparison:', comparisonAnnotatedImage.uri);
      return comparisonAnnotatedImage.uri;
    }

    return snapshot.screenshotUri;
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

    if (Platform.OS === 'android') {
      return await this.exportAndroidComposedStageSnapshot(viewRef);
    }

    if (!captureScreen) {
      throw new Error('Screen capture is not available');
    }

    try {
      const snapshot = await this.captureStageSnapshot(viewRef, boundsOverride);
      return await this.exportCapturedStage(snapshot);
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
      await loadDependencies();
      const androidShareDiagnosticMode = this.getAndroidShareDiagnosticMode();
      if (androidShareDiagnosticMode === 'surface-composition-proof') {
        const imageUri = await this.exportSurfaceCompositionProofSnapshot(viewRef, boundsOverride);
        this.logAndroidShareSourceDebug('surface-composition-proof', imageUri);
        return await this.shareImage(imageUri, title, message);
      }

      if (androidShareDiagnosticMode === 'crop-proof') {
        const snapshot = await this.captureStageSnapshot(viewRef, boundsOverride);
        const imageUri = await this.exportCropProofSnapshot(viewRef, snapshot);
        this.logAndroidShareSourceDebug('crop-proof', imageUri);
        return await this.shareImage(imageUri, title, message);
      }

      if (androidShareDiagnosticMode === 'window-scaled-crop') {
        const snapshot = await this.captureStageSnapshot(viewRef, boundsOverride);
        const imageUri = await this.exportWindowScaledCapturedStage(snapshot);
        this.logAndroidShareSourceDebug('window-scaled-crop', imageUri);
        return await this.shareImage(imageUri, title, message);
      }

      if (androidShareDiagnosticMode === 'annotated-comparison') {
        const snapshot = await this.captureStageSnapshot(viewRef, boundsOverride);
        const imageUri = await this.exportAnnotatedComparisonSnapshot(snapshot);
        this.logAndroidShareSourceDebug('annotated-comparison', imageUri);
        return await this.shareImage(imageUri, title, message);
      }

      if (androidShareDiagnosticMode === 'annotated-raw') {
        const snapshot = await this.captureStageSnapshot(viewRef, boundsOverride);
        const imageUri = await this.exportAnnotatedRawSnapshot(snapshot);
        this.logAndroidShareSourceDebug('annotated-raw', imageUri);
        return await this.shareImage(imageUri, title, message);
      }

      if (androidShareDiagnosticMode === 'raw-screenshot') {
        const snapshot = await this.captureStageSnapshot(viewRef, boundsOverride);
        this.logAndroidShareSourceDebug('raw-screenshot', snapshot.screenshotUri);
        return await this.shareImage(snapshot.screenshotUri, title, message);
      }

      if (androidShareDiagnosticMode === 'cropped-no-resize') {
        const snapshot = await this.captureStageSnapshot(viewRef, boundsOverride);
        const imageUri = await this.exportCapturedStage(snapshot, { resizeToCanvas: false });
        this.logAndroidShareSourceDebug('cropped-no-resize', imageUri);
        return await this.shareImage(imageUri, title, message);
      }

      if (androidShareDiagnosticMode === 'cropped-and-resized') {
        const imageUri = await this.captureViewAsImage(viewRef, boundsOverride);
        this.logAndroidShareSourceDebug('cropped-and-resized', imageUri);
        return await this.shareImage(imageUri, title, message);
      }

      const imageUri = await this.captureViewAsImage(viewRef, boundsOverride);
      this.logAndroidShareSourceDebug('cropped-and-resized', imageUri);
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
