import type { RefObject } from 'react';
import type { View } from 'react-native';
import { Dimensions, Image } from 'react-native';
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import { ShareService } from '~/features/share/services/shareService';
import { CANVAS_SIZE } from '~/features/share/constants/shareOptions';

const mockCaptureScreen = jest.fn();

jest.mock('react-native-view-shot', () => ({
  captureScreen: (...args: unknown[]) => mockCaptureScreen(...args),
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
    manipulateAsyncMock.mockResolvedValue({ uri: 'file://exported-stage.png' } as never);

    imageGetSizeSpy = jest
      .spyOn(Image, 'getSize')
      .mockImplementation((_uri, success) => success(1080, 1920));
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
  });

  it('captures a fully visible export stage and normalizes it to the canvas size', async () => {
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

  it('fails when the export stage is not fully visible in the window', async () => {
    const service = new ShareService();
    const exportStageRef = createViewRef({ x: 10, y: 540, width: 100, height: 125 });

    await expect(service.captureViewAsImage(exportStageRef)).rejects.toThrow(
      'export stage가 화면 안에 완전히 보여야 합니다.'
    );

    expect(mockCaptureScreen).not.toHaveBeenCalled();
    expect(manipulateAsyncMock).not.toHaveBeenCalled();
  });
});
