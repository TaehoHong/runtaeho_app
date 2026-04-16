import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { BackgroundOption, PoseOption, ShareRunningData } from '~/features/share/models/types';
import { useShareEditor } from '~/features/share/viewmodels/useShareEditor';
import { useUnityStore } from '~/stores/unity/unityStore';

const mockCaptureAndShare = jest.fn();
const mockSetBackground = jest.fn();
const mockSetBackgroundColor = jest.fn();
const mockSetBackgroundFromPhoto = jest.fn();
const mockSetPoseForSlider = jest.fn();
const mockSetAnimationNormalizedTime = jest.fn();
const mockSetCharacterPosition = jest.fn();
const mockSetCharacterScale = jest.fn();
const mockSetCharacterVisible = jest.fn();
const mockStopCharacter = jest.fn();
const mockRunWhenReady = jest.fn();
const mockUseUnityBootstrap = jest.fn();
const mockStartUnity = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('photo-base64'),
  EncodingType: {
    Base64: 'base64',
  },
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({ uri: 'resized://photo' }),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
  },
}));

jest.mock('~/features/share/services/shareService', () => ({
  captureAndShare: (...args: unknown[]) => mockCaptureAndShare(...args),
}));

jest.mock('~/features/unity/services/UnityService', () => ({
  unityService: {
    setBackground: (...args: unknown[]) => mockSetBackground(...args),
    setBackgroundColor: (...args: unknown[]) => mockSetBackgroundColor(...args),
    setBackgroundFromPhoto: (...args: unknown[]) => mockSetBackgroundFromPhoto(...args),
    setPoseForSlider: (...args: unknown[]) => mockSetPoseForSlider(...args),
    setAnimationNormalizedTime: (...args: unknown[]) => mockSetAnimationNormalizedTime(...args),
    setCharacterPosition: (...args: unknown[]) => mockSetCharacterPosition(...args),
    setCharacterScale: (...args: unknown[]) => mockSetCharacterScale(...args),
    setCharacterVisible: (...args: unknown[]) => mockSetCharacterVisible(...args),
    stopCharacter: (...args: unknown[]) => mockStopCharacter(...args),
    runWhenReady: (...args: unknown[]) => mockRunWhenReady(...args),
  },
}));

jest.mock('~/features/unity/hooks', () => ({
  useUnityBootstrap: (...args: unknown[]) => mockUseUnityBootstrap(...args),
}));

const createRunningData = (): ShareRunningData => ({
  distance: 3000,
  durationSec: 900,
  pace: '5:00',
  startTimestamp: '2026-02-24T00:00:00.000Z',
  earnedPoints: 30,
  locations: [],
});

describe('useShareEditor recovery', () => {
  const readinessState = {
    isReady: false,
    canSendMessage: false,
    isInitialAvatarSynced: false,
    handleUnityReady: jest.fn(),
    startUnity: mockStartUnity,
  };

  const customBackground: BackgroundOption = {
    id: 'bg_custom_color',
    name: '커스텀 컬러',
    source: '#112233',
    type: 'color',
  };

  const customPose: PoseOption = {
    id: 'jump',
    name: '점프',
    trigger: 'ATTACK',
    icon: 'flash-outline',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useUnityStore.getState().resetUnityState();
    });

    readinessState.isReady = false;
    readinessState.canSendMessage = false;
    readinessState.isInitialAvatarSynced = false;
    readinessState.handleUnityReady = jest.fn();

    mockCaptureAndShare.mockResolvedValue({ success: true });
    mockSetBackground.mockResolvedValue(undefined);
    mockSetBackgroundColor.mockResolvedValue(undefined);
    mockSetBackgroundFromPhoto.mockResolvedValue(undefined);
    mockSetPoseForSlider.mockResolvedValue(undefined);
    mockSetAnimationNormalizedTime.mockResolvedValue(undefined);
    mockSetCharacterPosition.mockResolvedValue(undefined);
    mockSetCharacterScale.mockResolvedValue(undefined);
    mockSetCharacterVisible.mockResolvedValue(undefined);
    mockStopCharacter.mockResolvedValue(undefined);
    mockRunWhenReady.mockImplementation(async (task: () => void | Promise<void>) => {
      try {
        await task();
        return true;
      } catch {
        return false;
      }
    });

    mockUseUnityBootstrap.mockImplementation(() => ({
      ...readinessState,
    }));
  });

  afterEach(() => {
    act(() => {
      useUnityStore.getState().resetUnityState();
    });
  });

  it('replays the latest live Unity state when canSendMessage recovers', async () => {
    const { result, rerender } = renderHook(() =>
      useShareEditor({ runningData: createRunningData() })
    );

    expect(mockStartUnity).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.setSelectedBackground(customBackground);
      await result.current.setSelectedPose(customPose);
    });
    act(() => {
      result.current.setAnimationTime(0.45);
      result.current.updateCharacterPosition(0.7, 0.8);
      result.current.updateCharacterScale(1.8);
    });

    expect(mockSetBackgroundColor).not.toHaveBeenCalled();
    expect(mockSetPoseForSlider).not.toHaveBeenCalled();
    expect(mockSetAnimationNormalizedTime).not.toHaveBeenCalled();
    expect(mockSetCharacterPosition).not.toHaveBeenCalled();
    expect(mockSetCharacterScale).not.toHaveBeenCalled();

    act(() => {
      readinessState.isReady = true;
      readinessState.canSendMessage = true;
      readinessState.isInitialAvatarSynced = true;
    });
    rerender();

    await waitFor(() => {
      expect(mockRunWhenReady).toHaveBeenCalledTimes(1);
    });
    expect(mockSetBackgroundColor).toHaveBeenCalledWith('#112233');
    expect(mockSetPoseForSlider).toHaveBeenCalledWith('ATTACK');
    expect(mockSetAnimationNormalizedTime).toHaveBeenCalledWith(0.45);
    const lastPositionCall = mockSetCharacterPosition.mock.calls.at(-1);
    expect(lastPositionCall?.[0]).toBeCloseTo(0.7);
    expect(lastPositionCall?.[1]).toBeCloseTo(0.2);
    expect(mockSetCharacterScale).toHaveBeenCalledWith(1.8);
    expect(mockSetCharacterVisible).toHaveBeenCalledWith(true);
  });

  it('updates the live Unity scene immediately while connected', async () => {
    readinessState.isReady = true;
    readinessState.canSendMessage = true;
    readinessState.isInitialAvatarSynced = true;

    const { result } = renderHook(() =>
      useShareEditor({ runningData: createRunningData() })
    );

    await waitFor(() => {
      expect(mockRunWhenReady).toHaveBeenCalledTimes(1);
    });

    mockSetBackgroundColor.mockClear();
    mockSetPoseForSlider.mockClear();
    mockSetAnimationNormalizedTime.mockClear();
    mockSetCharacterPosition.mockClear();
    mockSetCharacterScale.mockClear();
    mockSetCharacterVisible.mockClear();

    await act(async () => {
      await result.current.setSelectedBackground(customBackground);
      await result.current.setSelectedPose(customPose);
    });
    act(() => {
      result.current.setAnimationTime(0.6);
      result.current.updateCharacterPosition(0.65, 0.75);
      result.current.updateCharacterScale(1.4);
      result.current.toggleAvatarVisibility();
    });

    await waitFor(() => {
      expect(result.current.avatarVisible).toBe(false);
    });

    act(() => {
      result.current.toggleAvatarVisibility();
    });

    expect(mockSetBackgroundColor).toHaveBeenCalledWith('#112233');
    expect(mockSetPoseForSlider).toHaveBeenCalledWith('ATTACK');
    await waitFor(() => {
      expect(mockSetAnimationNormalizedTime).toHaveBeenCalledWith(0.6);
    });
    const lastPositionCall = mockSetCharacterPosition.mock.calls.at(-1);
    expect(lastPositionCall?.[0]).toBeCloseTo(0.65);
    expect(lastPositionCall?.[1]).toBeCloseTo(0.25);
    expect(mockSetCharacterScale).toHaveBeenCalledWith(1.4);
    expect(mockSetCharacterVisible).toHaveBeenNthCalledWith(1, false);
    expect(mockSetCharacterVisible).toHaveBeenNthCalledWith(2, true);
  });

  it('keeps the editor ready during share viewport drift and returns to loading on real detach', async () => {
    readinessState.isReady = true;
    readinessState.canSendMessage = true;
    readinessState.isInitialAvatarSynced = true;

    const shareFrame = { x: 16, y: 148, width: 398, height: 497.66668701171875 };
    const { result, unmount } = renderHook(() =>
      useShareEditor({ runningData: createRunningData() })
    );

    act(() => {
      useUnityStore.getState().setSurfaceVisible(true);
      useUnityStore.getState().setActiveViewport({
        owner: 'share',
        frame: shareFrame,
        borderRadius: 16,
      });
      useUnityStore.getState().setRenderedViewport({
        owner: 'share',
        frame: shareFrame,
      });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      useUnityStore.getState().setActiveViewport({
        owner: 'share',
        frame: {
          ...shareFrame,
          y: shareFrame.y - 120,
        },
        borderRadius: 16,
      });
    });

    expect(result.current.isLoading).toBe(false);

    act(() => {
      useUnityStore.getState().clearActiveViewport('share');
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    await act(async () => {
      unmount();
      await Promise.resolve();
    });
  });

  it('restores running result defaults once even if requested repeatedly', async () => {
    readinessState.isReady = true;
    readinessState.canSendMessage = true;
    readinessState.isInitialAvatarSynced = true;

    const { result } = renderHook(() =>
      useShareEditor({ runningData: createRunningData() })
    );

    await waitFor(() => {
      expect(mockRunWhenReady).toHaveBeenCalledTimes(1);
    });

    mockRunWhenReady.mockClear();
    mockSetBackground.mockClear();
    mockSetPoseForSlider.mockClear();
    mockSetAnimationNormalizedTime.mockClear();
    mockSetCharacterVisible.mockClear();
    mockSetCharacterScale.mockClear();
    mockSetCharacterPosition.mockClear();
    mockStopCharacter.mockClear();

    await act(async () => {
      await Promise.all([
        result.current.restoreRunningResultDefaults(),
        result.current.restoreRunningResultDefaults(),
      ]);
    });

    expect(mockRunWhenReady).toHaveBeenCalledTimes(1);
    expect(mockSetBackground).toHaveBeenCalledTimes(1);
    expect(mockSetBackground).toHaveBeenCalledWith('river');
    expect(mockSetPoseForSlider).not.toHaveBeenCalled();
    expect(mockSetAnimationNormalizedTime).not.toHaveBeenCalled();
    expect(mockSetCharacterPosition).toHaveBeenCalledTimes(1);
    const restorePositionCall = mockSetCharacterPosition.mock.calls.at(-1);
    expect(restorePositionCall?.[0]).toBeCloseTo(0.5);
    expect(restorePositionCall?.[1]).toBeCloseTo(0.1);
    expect(mockSetCharacterScale).toHaveBeenCalledTimes(1);
    expect(mockSetCharacterScale).toHaveBeenCalledWith(1);
    expect(mockSetCharacterVisible).toHaveBeenCalledTimes(1);
    expect(mockSetCharacterVisible).toHaveBeenCalledWith(true);
    expect(mockStopCharacter).toHaveBeenCalledTimes(1);
  });

  it('replays the running result defaults after resetAll', async () => {
    readinessState.isReady = true;
    readinessState.canSendMessage = true;
    readinessState.isInitialAvatarSynced = true;

    const { result } = renderHook(() =>
      useShareEditor({ runningData: createRunningData() })
    );

    await waitFor(() => {
      expect(mockRunWhenReady).toHaveBeenCalledTimes(1);
    });

    mockRunWhenReady.mockClear();
    mockSetBackground.mockClear();
    mockSetPoseForSlider.mockClear();
    mockSetAnimationNormalizedTime.mockClear();
    mockSetCharacterPosition.mockClear();
    mockSetCharacterScale.mockClear();
    mockSetCharacterVisible.mockClear();
    mockStopCharacter.mockClear();

    await act(async () => {
      await result.current.resetAll();
    });

    expect(mockSetBackground).toHaveBeenCalledWith('river');
    expect(mockSetPoseForSlider).toHaveBeenCalledWith('IDLE');
    expect(mockSetAnimationNormalizedTime).toHaveBeenCalledWith(0);

    mockRunWhenReady.mockClear();
    mockSetBackground.mockClear();
    mockSetPoseForSlider.mockClear();
    mockSetAnimationNormalizedTime.mockClear();
    mockSetCharacterPosition.mockClear();
    mockSetCharacterScale.mockClear();
    mockSetCharacterVisible.mockClear();
    mockStopCharacter.mockClear();

    await act(async () => {
      await result.current.restoreRunningResultDefaults();
    });

    expect(mockRunWhenReady).toHaveBeenCalledTimes(1);
    expect(mockSetBackground).toHaveBeenCalledWith('river');
    expect(mockSetPoseForSlider).not.toHaveBeenCalled();
    expect(mockSetAnimationNormalizedTime).not.toHaveBeenCalled();
    const replayPositionCall = mockSetCharacterPosition.mock.calls.at(-1);
    expect(replayPositionCall?.[0]).toBeCloseTo(0.5);
    expect(replayPositionCall?.[1]).toBeCloseTo(0.1);
    expect(mockSetCharacterScale).toHaveBeenCalledWith(1);
    expect(mockSetCharacterVisible).toHaveBeenCalledWith(true);
    expect(mockStopCharacter).toHaveBeenCalledTimes(1);
  });

  it('rejects when the running result default replay fails', async () => {
    readinessState.isReady = true;
    readinessState.canSendMessage = true;
    readinessState.isInitialAvatarSynced = true;
    mockSetBackground.mockRejectedValue(new Error('background restore failed'));

    const { result } = renderHook(() =>
      useShareEditor({ runningData: createRunningData() })
    );

    await waitFor(() => {
      expect(mockRunWhenReady).toHaveBeenCalledTimes(1);
    });

    mockRunWhenReady.mockClear();
    mockSetBackground.mockClear();
    mockSetPoseForSlider.mockClear();
    mockSetAnimationNormalizedTime.mockClear();
    mockSetCharacterPosition.mockClear();
    mockSetCharacterScale.mockClear();
    mockSetCharacterVisible.mockClear();
    mockStopCharacter.mockClear();

    await expect(
      act(async () => {
        await result.current.restoreRunningResultDefaults();
      })
    ).rejects.toThrow('Failed to restore running result defaults');

    expect(mockRunWhenReady).toHaveBeenCalledTimes(1);
    expect(mockSetBackground).toHaveBeenCalledTimes(1);
    expect(mockSetPoseForSlider).not.toHaveBeenCalled();
    expect(mockSetAnimationNormalizedTime).not.toHaveBeenCalled();
    expect(mockSetCharacterPosition).not.toHaveBeenCalled();
    expect(mockSetCharacterScale).not.toHaveBeenCalled();
    expect(mockSetCharacterVisible).not.toHaveBeenCalled();
    expect(mockStopCharacter).not.toHaveBeenCalled();
  });
});
