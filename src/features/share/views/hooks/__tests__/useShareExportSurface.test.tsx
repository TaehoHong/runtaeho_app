import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import type { ViewBounds } from '~/features/share/services/shareService';
import { useShareExportSurface } from '../useShareExportSurface';

const mockSetActiveViewport = jest.fn();
const mockClearActiveViewport = jest.fn();
const mockUseFocusEffect = jest.fn();

const mockUnityStoreState = {
  setActiveViewport: mockSetActiveViewport,
  clearActiveViewport: mockClearActiveViewport,
  renderedViewport: null,
};

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (...args: unknown[]) => mockUseFocusEffect(...args),
}));

jest.mock('~/stores/unity/unityStore', () => ({
  useUnityStore: Object.assign(
    (selector: (state: typeof mockUnityStoreState) => unknown) => selector(mockUnityStoreState),
    {
      getState: () => mockUnityStoreState,
    }
  ),
}));

describe('useShareExportSurface', () => {
  const originalRequestAnimationFrame = global.requestAnimationFrame;
  const originalCancelAnimationFrame = global.cancelAnimationFrame;
  let animationFrameQueue: Map<number, FrameRequestCallback>;
  let nextAnimationFrameId: number;

  const flushAnimationFrame = async () => {
    const queuedEntries = Array.from(animationFrameQueue.entries());
    animationFrameQueue.clear();

    await act(async () => {
      queuedEntries.forEach(([, callback]) => callback(0));
      await Promise.resolve();
    });
  };

  const flushAnimationFrames = async (count: number) => {
    for (let frame = 0; frame < count; frame += 1) {
      await flushAnimationFrame();
    }
  };

  const createPreviewRef = (
    measurements: ViewBounds[],
    options: { asyncCallback?: boolean } = {}
  ): RefObject<View | null> => {
    const fallbackMeasurement = measurements[measurements.length - 1] ?? {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
    const remainingMeasurements = [...measurements];

    return {
      current: {
        measureInWindow: (
          callback: (x: number, y: number, width: number, height: number) => void
        ) => {
          const frame = remainingMeasurements.shift() ?? fallbackMeasurement;
          if (options.asyncCallback) {
            requestAnimationFrame(() => {
              callback(frame.x, frame.y, frame.width, frame.height);
            });
            return;
          }

          callback(frame.x, frame.y, frame.width, frame.height);
        },
      } as View,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    animationFrameQueue = new Map();
    nextAnimationFrameId = 1;

    global.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      const frameId = nextAnimationFrameId;
      nextAnimationFrameId += 1;
      animationFrameQueue.set(frameId, callback);
      return frameId;
    }) as typeof global.requestAnimationFrame;

    global.cancelAnimationFrame = ((frameId: number) => {
      animationFrameQueue.delete(frameId);
    }) as typeof global.cancelAnimationFrame;

    mockUseFocusEffect.mockImplementation(() => {});
  });

  afterEach(() => {
    global.requestAnimationFrame = originalRequestAnimationFrame;
    global.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  it('publishes the stabilized preview viewport after layout settles', async () => {
    const previewRef = createPreviewRef([
      { x: 16, y: 89, width: 398, height: 497.66668701171875 },
      { x: 16, y: 148, width: 398, height: 497.66668701171875 },
      { x: 16, y: 148, width: 398, height: 497.66668701171875 },
    ]);

    renderHook(() => useShareExportSurface({ previewRef, isLoading: false }));

    await flushAnimationFrames(4);
    expect(mockSetActiveViewport).not.toHaveBeenCalled();

    await flushAnimationFrames(1);

    await waitFor(() => {
      expect(mockSetActiveViewport).toHaveBeenCalledTimes(1);
    });

    expect(mockSetActiveViewport).toHaveBeenCalledWith({
      owner: 'share',
      borderRadius: 16,
      frame: { x: 16, y: 148, width: 398, height: 497.66668701171875 },
    });
  });

  it('waits for async measureInWindow callbacks before giving up on the preview viewport', async () => {
    const previewRef = createPreviewRef([
      { x: 16, y: 148, width: 398, height: 497.66668701171875 },
      { x: 16, y: 148, width: 398, height: 497.66668701171875 },
    ], { asyncCallback: true });

    renderHook(() => useShareExportSurface({ previewRef, isLoading: true }));

    await flushAnimationFrames(5);

    await waitFor(() => {
      expect(mockSetActiveViewport).toHaveBeenCalledTimes(1);
    });

    expect(mockSetActiveViewport).toHaveBeenCalledWith({
      owner: 'share',
      borderRadius: 16,
      frame: { x: 16, y: 148, width: 398, height: 497.66668701171875 },
    });
  });
});
