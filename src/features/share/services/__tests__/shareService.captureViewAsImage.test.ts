import type { RefObject } from 'react';
import type { View } from 'react-native';
import { Dimensions, Image, NativeModules, Platform } from 'react-native';
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import { ShareService } from '~/features/share/services/shareService';
import { CANVAS_SIZE } from '~/features/share/constants/shareOptions';
import type { AndroidShareDiagnosticMode } from '~/features/share/constants/shareDiagnostics';

const mockCaptureScreen = jest.fn();
const mockCaptureRef = jest.fn();

jest.mock('react-native-view-shot', () => ({
  captureScreen: (...args: unknown[]) => mockCaptureScreen(...args),
  captureRef: (...args: unknown[]) => mockCaptureRef(...args),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: {
    PNG: 'png',
  },
}));

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: jest.fn(),
  },
}));

describe('ShareService.captureViewAsImage', () => {
  const manipulateAsyncMock = manipulateAsync as jest.MockedFunction<typeof manipulateAsync>;
  const shareOpenMock = jest.requireMock('react-native-share').default.open as jest.Mock;
  const originalPlatformOS = Platform.OS;
  const mockGetCaptureRootBounds = jest.fn();
  const mockDetectDiagnosticMarkers = jest.fn();
  const mockAnnotateImageRect = jest.fn();
  const mockCropAndResizeImage = jest.fn();
  const mockComposeDebugComparison = jest.fn();
  const mockComposeShareExportFromUnityAndOverlay = jest.fn();
  let imageGetSizeSpy: jest.SpyInstance;
  let dimensionsGetSpy: jest.SpyInstance;

  const createViewRef = (
    bounds: { x: number; y: number; width: number; height: number }
  ): RefObject<View | null> => ({
    current: {
      measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) =>
        callback(bounds.x, bounds.y, bounds.width, bounds.height),
    } as unknown as View,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockCaptureScreen.mockResolvedValue('file://captured-screen.png');
    mockCaptureRef.mockResolvedValue('file://overlay-stage.png');
    manipulateAsyncMock.mockResolvedValue({ uri: 'file://exported-stage.png' } as never);
    shareOpenMock.mockResolvedValue({ success: true, app: 'com.example.share' });
    mockGetCaptureRootBounds.mockResolvedValue({
      x: 0,
      y: 0,
      width: 360,
      height: 640,
    });
    mockCropAndResizeImage.mockResolvedValue({
      uri: 'file://native-exported-stage.png',
      width: CANVAS_SIZE.width,
      height: CANVAS_SIZE.height,
    });
    mockAnnotateImageRect.mockResolvedValue({
      uri: 'file://annotated-screen.png',
      width: 1080,
      height: 1920,
    });
    mockComposeDebugComparison.mockResolvedValue({
      uri: 'file://surface-comparison.png',
      width: 1128,
      height: 7000,
    });
    mockComposeShareExportFromUnityAndOverlay.mockResolvedValue({
      uri: 'file://native-share-export.png',
      width: CANVAS_SIZE.width,
      height: CANVAS_SIZE.height,
    });
    mockDetectDiagnosticMarkers.mockResolvedValue([]);
    NativeModules.RNUnityBridge = {
      ...NativeModules.RNUnityBridge,
      getCaptureRootBounds: mockGetCaptureRootBounds,
      detectDiagnosticMarkers: mockDetectDiagnosticMarkers,
      annotateImageRect: mockAnnotateImageRect,
      cropAndResizeImage: mockCropAndResizeImage,
      composeDebugComparison: mockComposeDebugComparison,
      composeShareExportFromUnityAndOverlay: mockComposeShareExportFromUnityAndOverlay,
    };

    imageGetSizeSpy = jest
      .spyOn(Image, 'getSize')
      .mockImplementation((uri, success) => {
        if (uri === 'file://overlay-stage.png') {
          success(1080, 1350);
          return;
        }

        success(1080, 1920);
      });
    dimensionsGetSpy = jest.spyOn(Dimensions, 'get').mockReturnValue({
      width: 360,
      height: 640,
      scale: 3,
      fontScale: 1,
    });

    (ShareService as unknown as { androidShareDiagnosticMode: AndroidShareDiagnosticMode })
      .androidShareDiagnosticMode = 'cropped-and-resized';
  });

  afterEach(() => {
    imageGetSizeSpy.mockRestore();
    dimensionsGetSpy.mockRestore();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatformOS });
  });

  it('captures a fully visible export stage and normalizes it to the canvas size on non-Android', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    const service = new ShareService();
    const exportStageRef = createViewRef({ x: 10, y: 20, width: 100, height: 125 });

    const result = await service.captureViewAsImage(exportStageRef);

    expect(mockCaptureScreen).toHaveBeenCalledWith({
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
    expect(manipulateAsyncMock).toHaveBeenCalledWith(
      'file://captured-screen.png',
      [
        { crop: { originX: 30, originY: 60, width: 300, height: 375 } },
        { resize: CANVAS_SIZE },
      ],
      { compress: 1, format: SaveFormat.PNG }
    );
    expect(result).toBe('file://exported-stage.png');
  });

  it('composes the Android share export from the Unity layer and overlay capture', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });

    const service = new ShareService();
    const exportStageRef = createViewRef({ x: 10, y: 20, width: 100, height: 125 });

    const result = await service.captureViewAsImage(exportStageRef);

    expect(mockCaptureRef).toHaveBeenCalledWith(exportStageRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      width: CANVAS_SIZE.width,
      height: CANVAS_SIZE.height,
    });
    expect(mockComposeShareExportFromUnityAndOverlay).toHaveBeenCalledWith(
      'file://overlay-stage.png',
      CANVAS_SIZE.width,
      CANVAS_SIZE.height
    );
    expect(mockCaptureScreen).not.toHaveBeenCalled();
    expect(mockCropAndResizeImage).not.toHaveBeenCalled();
    expect(manipulateAsyncMock).not.toHaveBeenCalled();
    expect(result).toBe('file://native-share-export.png');
  });

  it('shares the Android native composed export by default', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });

    const service = new ShareService();
    const exportStageRef = createViewRef({ x: 10, y: 20, width: 100, height: 125 });

    const result = await service.captureAndShare(exportStageRef, 'Title', 'Message');

    expect(mockComposeShareExportFromUnityAndOverlay).toHaveBeenCalledWith(
      'file://overlay-stage.png',
      CANVAS_SIZE.width,
      CANVAS_SIZE.height
    );
    expect(shareOpenMock).toHaveBeenCalledWith({
      title: 'Title',
      message: 'Message',
      url: 'file://native-share-export.png',
      type: 'image/png',
      failOnCancel: false,
    });
    expect(result).toEqual({
      success: true,
      app: 'com.example.share',
    });
  });

  it('fails when Android native share composition is unavailable', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    NativeModules.RNUnityBridge = {
      ...NativeModules.RNUnityBridge,
      composeShareExportFromUnityAndOverlay: undefined,
    };

    const service = new ShareService();
    const exportStageRef = createViewRef({ x: 20, y: 54, width: 120, height: 140 });

    await expect(service.captureViewAsImage(exportStageRef)).rejects.toThrow(
      'Android native share composition is not available'
    );
  });

  it('fails when the export stage is not fully visible in the window', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const service = new ShareService();
    const exportStageRef = createViewRef({ x: 10, y: 540, width: 100, height: 125 });

    await expect(service.captureViewAsImage(exportStageRef)).rejects.toThrow(
      'export stage가 화면 안에 완전히 보여야 합니다.'
    );

    expect(mockCaptureScreen).not.toHaveBeenCalled();
    expect(manipulateAsyncMock).not.toHaveBeenCalled();
  });

  it('shares the surface composition comparison screenshot on Android when the diagnostic mode is surface-composition-proof', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    (ShareService as unknown as { androidShareDiagnosticMode: AndroidShareDiagnosticMode })
      .androidShareDiagnosticMode = 'surface-composition-proof';
    mockCaptureScreen
      .mockResolvedValueOnce('file://captured-after.png')
      .mockResolvedValueOnce('file://captured-before.png')
      .mockResolvedValueOnce('file://captured-skip.png');

    const service = new ShareService();
    const exportStageRef = createViewRef({ x: 10, y: 20, width: 100, height: 125 });

    const result = await service.captureAndShare(exportStageRef, 'Title', 'Message');

    expect(mockCaptureScreen).toHaveBeenNthCalledWith(1, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      handleGLSurfaceViewOnAndroid: true,
      surfaceViewCompositionMode: 'after',
    });
    expect(mockCaptureScreen).toHaveBeenNthCalledWith(2, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      handleGLSurfaceViewOnAndroid: true,
      surfaceViewCompositionMode: 'before',
    });
    expect(mockCaptureScreen).toHaveBeenNthCalledWith(3, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      handleGLSurfaceViewOnAndroid: true,
      surfaceViewCompositionMode: 'skip',
    });
    expect(mockCaptureRef).toHaveBeenCalledWith(exportStageRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      width: CANVAS_SIZE.width,
      height: CANVAS_SIZE.height,
    });
    expect(mockComposeDebugComparison).toHaveBeenCalledWith(
      'file://captured-after.png',
      'file://captured-before.png',
      'file://captured-skip.png',
      'file://overlay-stage.png'
    );
    expect(mockAnnotateImageRect).not.toHaveBeenCalled();
    expect(mockCropAndResizeImage).not.toHaveBeenCalled();
    expect(shareOpenMock).toHaveBeenCalledWith({
      title: 'Title',
      message: 'Message',
      url: 'file://surface-comparison.png',
      type: 'image/png',
      failOnCancel: false,
    });
    expect(result).toEqual({
      success: true,
      app: 'com.example.share',
    });
  });

  it('shares the cropped export using window-scaled coordinates on Android when the diagnostic mode is window-scaled-crop', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    (ShareService as unknown as { androidShareDiagnosticMode: AndroidShareDiagnosticMode })
      .androidShareDiagnosticMode = 'window-scaled-crop';
    imageGetSizeSpy.mockImplementation((_uri, success) => success(540, 1200));
    dimensionsGetSpy.mockReturnValue({
      width: 360,
      height: 800,
      scale: 3,
      fontScale: 1,
    });
    mockGetCaptureRootBounds.mockResolvedValue({
      x: 0,
      y: 0,
      width: 1080,
      height: 2400,
    });
    const service = new ShareService();
    const exportStageRef = createViewRef({ x: 16, y: 173, width: 328, height: 410 });

    const result = await service.captureAndShare(exportStageRef, 'Title', 'Message');

    expect(mockCaptureScreen).toHaveBeenCalledWith({
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      handleGLSurfaceViewOnAndroid: true,
    });
    expect(mockCropAndResizeImage).toHaveBeenCalledWith(
      'file://captured-screen.png',
      24,
      260,
      492,
      615,
      CANVAS_SIZE.width,
      CANVAS_SIZE.height
    );
    expect(manipulateAsyncMock).not.toHaveBeenCalled();
    expect(shareOpenMock).toHaveBeenCalledWith({
      title: 'Title',
      message: 'Message',
      url: 'file://native-exported-stage.png',
      type: 'image/png',
      failOnCancel: false,
    });
    expect(result).toEqual({
      success: true,
      app: 'com.example.share',
    });
  });

  it('shares the crop-proof diagnostic screenshot with a derived stage rect when marker mapping is consistent', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    (ShareService as unknown as { androidShareDiagnosticMode: AndroidShareDiagnosticMode })
      .androidShareDiagnosticMode = 'crop-proof';
    mockAnnotateImageRect
      .mockResolvedValueOnce({
        uri: 'file://annotated-current.png',
        width: 1080,
        height: 1920,
      })
      .mockResolvedValueOnce({
        uri: 'file://annotated-derived.png',
        width: 1080,
        height: 1920,
      });
    mockDetectDiagnosticMarkers
      .mockResolvedValueOnce([
        { colorHex: '#FF0055', detected: true, x: 50, y: 230, width: 30, height: 30 },
        { colorHex: '#00D1FF', detected: true, x: 500, y: 230, width: 30, height: 30 },
        { colorHex: '#B8FF00', detected: true, x: 50, y: 815, width: 30, height: 30 },
        { colorHex: '#FF8A00', detected: true, x: 500, y: 815, width: 30, height: 30 },
        { colorHex: '#7A00FF', detected: true, x: 275, y: 523, width: 30, height: 30 },
      ])
      .mockResolvedValueOnce([
        { colorHex: '#FF0055', detected: true, x: 60, y: 60, width: 60, height: 60 },
        { colorHex: '#00D1FF', detected: true, x: 960, y: 60, width: 60, height: 60 },
        { colorHex: '#B8FF00', detected: true, x: 60, y: 1230, width: 60, height: 60 },
        { colorHex: '#FF8A00', detected: true, x: 960, y: 1230, width: 60, height: 60 },
        { colorHex: '#7A00FF', detected: true, x: 510, y: 645, width: 60, height: 60 },
      ]);

    const service = new ShareService();
    const exportStageRef = createViewRef({ x: 10, y: 20, width: 100, height: 125 });

    const result = await service.captureAndShare(exportStageRef, 'Title', 'Message');

    expect(mockCaptureRef).toHaveBeenCalledWith(exportStageRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      width: CANVAS_SIZE.width,
      height: CANVAS_SIZE.height,
    });
    expect(mockDetectDiagnosticMarkers).toHaveBeenNthCalledWith(1, 'file://captured-screen.png', [
      '#FF0055',
      '#00D1FF',
      '#B8FF00',
      '#FF8A00',
      '#7A00FF',
    ]);
    expect(mockDetectDiagnosticMarkers).toHaveBeenNthCalledWith(2, 'file://overlay-stage.png', [
      '#FF0055',
      '#00D1FF',
      '#B8FF00',
      '#FF8A00',
      '#7A00FF',
    ]);
    expect(mockAnnotateImageRect).toHaveBeenNthCalledWith(
      1,
      'file://captured-screen.png',
      30,
      60,
      300,
      375,
      '#FF3B30'
    );
    expect(mockAnnotateImageRect).toHaveBeenNthCalledWith(
      2,
      'file://annotated-current.png',
      20,
      200,
      540,
      675,
      '#34C759'
    );
    expect(shareOpenMock).toHaveBeenCalledWith({
      title: 'Title',
      message: 'Message',
      url: 'file://annotated-derived.png',
      type: 'image/png',
      failOnCancel: false,
    });
    expect(result).toEqual({
      success: true,
      app: 'com.example.share',
    });
  });

  it('shares the crop-proof diagnostic screenshot with only the current crop rect when marker mapping is inconsistent', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    (ShareService as unknown as { androidShareDiagnosticMode: AndroidShareDiagnosticMode })
      .androidShareDiagnosticMode = 'crop-proof';
    mockAnnotateImageRect.mockResolvedValueOnce({
      uri: 'file://annotated-current.png',
      width: 1080,
      height: 1920,
    });
    mockDetectDiagnosticMarkers
      .mockResolvedValueOnce([
        { colorHex: '#FF0055', detected: true, x: 50, y: 230, width: 30, height: 30 },
        { colorHex: '#00D1FF', detected: true, x: 620, y: 230, width: 30, height: 30 },
        { colorHex: '#B8FF00', detected: true, x: 50, y: 815, width: 30, height: 30 },
        { colorHex: '#FF8A00', detected: true, x: 500, y: 815, width: 30, height: 30 },
        { colorHex: '#7A00FF', detected: true, x: 275, y: 523, width: 30, height: 30 },
      ])
      .mockResolvedValueOnce([
        { colorHex: '#FF0055', detected: true, x: 60, y: 60, width: 60, height: 60 },
        { colorHex: '#00D1FF', detected: true, x: 960, y: 60, width: 60, height: 60 },
        { colorHex: '#B8FF00', detected: true, x: 60, y: 1230, width: 60, height: 60 },
        { colorHex: '#FF8A00', detected: true, x: 960, y: 1230, width: 60, height: 60 },
        { colorHex: '#7A00FF', detected: true, x: 510, y: 645, width: 60, height: 60 },
      ]);

    const service = new ShareService();
    const exportStageRef = createViewRef({ x: 10, y: 20, width: 100, height: 125 });

    const result = await service.captureAndShare(exportStageRef, 'Title', 'Message');

    expect(mockAnnotateImageRect).toHaveBeenCalledTimes(1);
    expect(mockAnnotateImageRect).toHaveBeenCalledWith(
      'file://captured-screen.png',
      30,
      60,
      300,
      375,
      '#FF3B30'
    );
    expect(shareOpenMock).toHaveBeenCalledWith({
      title: 'Title',
      message: 'Message',
      url: 'file://annotated-current.png',
      type: 'image/png',
      failOnCancel: false,
    });
    expect(result).toEqual({
      success: true,
      app: 'com.example.share',
    });
  });

  it('shares the comparison-annotated screenshot on Android when the diagnostic mode is annotated-comparison', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    (ShareService as unknown as { androidShareDiagnosticMode: AndroidShareDiagnosticMode })
      .androidShareDiagnosticMode = 'annotated-comparison';
    imageGetSizeSpy.mockImplementation((_uri, success) => success(540, 1200));
    dimensionsGetSpy.mockReturnValue({
      width: 360,
      height: 800,
      scale: 3,
      fontScale: 1,
    });
    mockGetCaptureRootBounds.mockResolvedValue({
      x: 0,
      y: 0,
      width: 1080,
      height: 2400,
    });
    mockAnnotateImageRect
      .mockResolvedValueOnce({
        uri: 'file://annotated-current.png',
        width: 540,
        height: 1200,
      })
      .mockResolvedValueOnce({
        uri: 'file://annotated-comparison.png',
        width: 540,
        height: 1200,
      });

    const service = new ShareService();
    const exportStageRef = createViewRef({ x: 16, y: 173, width: 328, height: 410 });

    const result = await service.captureAndShare(exportStageRef, 'Title', 'Message');

    expect(mockAnnotateImageRect).toHaveBeenCalledWith(
      'file://captured-screen.png',
      8,
      87,
      164,
      205,
      '#FF3B30'
    );
    expect(mockAnnotateImageRect).toHaveBeenCalledWith(
      'file://annotated-current.png',
      24,
      260,
      492,
      615,
      '#34C759'
    );
    expect(mockCropAndResizeImage).not.toHaveBeenCalled();
    expect(manipulateAsyncMock).not.toHaveBeenCalled();
    expect(shareOpenMock).toHaveBeenCalledWith({
      title: 'Title',
      message: 'Message',
      url: 'file://annotated-comparison.png',
      type: 'image/png',
      failOnCancel: false,
    });
    expect(result).toEqual({
      success: true,
      app: 'com.example.share',
    });
  });

  it('shares the raw screenshot on Android when the diagnostic mode is raw-screenshot', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    (ShareService as unknown as { androidShareDiagnosticMode: AndroidShareDiagnosticMode })
      .androidShareDiagnosticMode = 'raw-screenshot';

    const service = new ShareService();
    const exportStageRef = createViewRef({ x: 10, y: 20, width: 100, height: 125 });

    const result = await service.captureAndShare(exportStageRef, 'Title', 'Message');

    expect(mockCaptureScreen).toHaveBeenCalledWith({
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      handleGLSurfaceViewOnAndroid: true,
    });
    expect(manipulateAsyncMock).not.toHaveBeenCalled();
    expect(shareOpenMock).toHaveBeenCalledWith({
      title: 'Title',
      message: 'Message',
      url: 'file://captured-screen.png',
      type: 'image/png',
      failOnCancel: false,
    });
    expect(result).toEqual({
      success: true,
      app: 'com.example.share',
    });
  });

  it('shares the cropped export without resize on Android when the diagnostic mode is cropped-no-resize', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    (ShareService as unknown as { androidShareDiagnosticMode: AndroidShareDiagnosticMode })
      .androidShareDiagnosticMode = 'cropped-no-resize';

    const service = new ShareService();
    const exportStageRef = createViewRef({ x: 10, y: 20, width: 100, height: 125 });

    const result = await service.captureAndShare(exportStageRef, 'Title', 'Message');

    expect(mockCropAndResizeImage).toHaveBeenCalledWith(
      'file://captured-screen.png',
      30,
      60,
      300,
      375,
      0,
      0
    );
    expect(shareOpenMock).toHaveBeenCalledWith({
      title: 'Title',
      message: 'Message',
      url: 'file://native-exported-stage.png',
      type: 'image/png',
      failOnCancel: false,
    });
    expect(result).toEqual({
      success: true,
      app: 'com.example.share',
    });
  });

  it('shares the cropped export with resize on Android when the diagnostic mode is cropped-and-resized', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    (ShareService as unknown as { androidShareDiagnosticMode: AndroidShareDiagnosticMode })
      .androidShareDiagnosticMode = 'cropped-and-resized';

    const service = new ShareService();
    const exportStageRef = createViewRef({ x: 10, y: 20, width: 100, height: 125 });

    const result = await service.captureAndShare(exportStageRef, 'Title', 'Message');

    expect(mockComposeShareExportFromUnityAndOverlay).toHaveBeenCalledWith(
      'file://overlay-stage.png',
      CANVAS_SIZE.width,
      CANVAS_SIZE.height
    );
    expect(mockCropAndResizeImage).not.toHaveBeenCalled();
    expect(shareOpenMock).toHaveBeenCalledWith({
      title: 'Title',
      message: 'Message',
      url: 'file://native-share-export.png',
      type: 'image/png',
      failOnCancel: false,
    });
    expect(result).toEqual({
      success: true,
      app: 'com.example.share',
    });
  });
});
