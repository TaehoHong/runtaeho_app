import type { RefObject } from 'react';
import type { View } from 'react-native';
import { Dimensions, Image, NativeModules, Platform } from 'react-native';
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import {
  captureAndShare,
  captureViewAsImage,
} from '~/features/share/services/shareService';
import { CANVAS_SIZE } from '~/features/share/constants/shareOptions';

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

describe('shareService', () => {
  const manipulateAsyncMock = manipulateAsync as jest.MockedFunction<typeof manipulateAsync>;
  const shareOpenMock = jest.requireMock('react-native-share').default.open as jest.Mock;
  const originalPlatformOS = Platform.OS;
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
    mockComposeShareExportFromUnityAndOverlay.mockResolvedValue({
      uri: 'file://native-share-export.png',
      width: CANVAS_SIZE.width,
      height: CANVAS_SIZE.height,
    });
    NativeModules.RNUnityBridge = {
      ...NativeModules.RNUnityBridge,
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
  });

  afterEach(() => {
    imageGetSizeSpy.mockRestore();
    dimensionsGetSpy.mockRestore();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatformOS });
  });

  it('captures a fully visible export stage and normalizes it to the canvas size on non-Android', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    const exportStageRef = createViewRef({ x: 10, y: 20, width: 100, height: 125 });

    const result = await captureViewAsImage(exportStageRef);

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

  it('fails when the export stage is not fully visible in the window on non-Android', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    const exportStageRef = createViewRef({ x: 10, y: 540, width: 100, height: 125 });

    await expect(captureViewAsImage(exportStageRef)).rejects.toThrow(
      'export stage가 화면 안에 완전히 보여야 합니다.'
    );

    expect(mockCaptureScreen).not.toHaveBeenCalled();
    expect(manipulateAsyncMock).not.toHaveBeenCalled();
  });

  it('composes the Android share export from the Unity layer and overlay capture', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });

    const exportStageRef = createViewRef({ x: 10, y: 20, width: 100, height: 125 });

    const result = await captureViewAsImage(exportStageRef);

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
    expect(manipulateAsyncMock).not.toHaveBeenCalled();
    expect(result).toBe('file://native-share-export.png');
  });

  it('fails when Android native share composition is unavailable', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    NativeModules.RNUnityBridge = {
      ...NativeModules.RNUnityBridge,
      composeShareExportFromUnityAndOverlay: undefined,
    };

    const exportStageRef = createViewRef({ x: 20, y: 54, width: 120, height: 140 });

    await expect(captureViewAsImage(exportStageRef)).rejects.toThrow(
      'Android native share composition is not available'
    );
  });

  it('shares the Android native composed export by default', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });

    const exportStageRef = createViewRef({ x: 10, y: 20, width: 100, height: 125 });

    const result = await captureAndShare(exportStageRef, 'Title', 'Message');

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

  it('returns a failed share result when capture throws', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    mockComposeShareExportFromUnityAndOverlay.mockRejectedValueOnce(new Error('compose failed'));

    const exportStageRef = createViewRef({ x: 10, y: 20, width: 100, height: 125 });

    const result = await captureAndShare(exportStageRef, 'Title', 'Message');

    expect(result).toEqual({
      success: false,
      message: 'compose failed',
    });
    expect(shareOpenMock).not.toHaveBeenCalled();
  });
});
