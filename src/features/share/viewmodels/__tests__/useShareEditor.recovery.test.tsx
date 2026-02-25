import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { BackgroundOption, PoseOption, ShareRunningData } from '~/features/share/models/types';
import { useShareEditor } from '~/features/share/viewmodels/useShareEditor';

const mockSetBackground = jest.fn();
const mockSetBackgroundColor = jest.fn();
const mockSetBackgroundFromPhoto = jest.fn();
const mockSetPoseForSlider = jest.fn();
const mockSetAnimationNormalizedTime = jest.fn();
const mockSetCharacterPosition = jest.fn();
const mockSetCharacterScale = jest.fn();
const mockSetCharacterVisible = jest.fn();
const mockRunWhenReady = jest.fn();
const mockUseUnityBootstrap = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('~/features/share/services/shareService', () => ({
  shareService: {
    captureAndShare: jest.fn(),
    captureViewAsImage: jest.fn(),
    saveToGallery: jest.fn(),
  },
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

    readinessState.isReady = false;
    readinessState.canSendMessage = false;
    readinessState.isInitialAvatarSynced = false;
    readinessState.handleUnityReady = jest.fn();

    mockSetBackground.mockResolvedValue(undefined);
    mockSetBackgroundColor.mockResolvedValue(undefined);
    mockSetBackgroundFromPhoto.mockResolvedValue(undefined);
    mockSetPoseForSlider.mockResolvedValue(undefined);
    mockSetAnimationNormalizedTime.mockResolvedValue(undefined);
    mockSetCharacterPosition.mockResolvedValue(undefined);
    mockSetCharacterScale.mockResolvedValue(undefined);
    mockSetCharacterVisible.mockResolvedValue(undefined);
    mockRunWhenReady.mockImplementation(async (task: () => void | Promise<void>) => {
      await task();
      return true;
    });

    mockUseUnityBootstrap.mockImplementation(() => ({
      ...readinessState,
    }));
  });

  it('SHARE-UNITY-001 reapplies latest Unity state when canSendMessage recovers', async () => {
    const { result, rerender } = renderHook(
      (_props: undefined) => useShareEditor({ runningData: createRunningData() }),
      { initialProps: undefined }
    );

    act(() => {
      readinessState.isReady = true;
      readinessState.canSendMessage = true;
      readinessState.isInitialAvatarSynced = true;
    });
    rerender(undefined);

    await waitFor(() => {
      expect(mockSetPoseForSlider).toHaveBeenCalledTimes(1);
    });
    expect(mockRunWhenReady).toHaveBeenCalledTimes(1);

    mockSetBackgroundColor.mockClear();
    mockSetPoseForSlider.mockClear();
    mockSetCharacterPosition.mockClear();
    mockSetCharacterScale.mockClear();
    mockSetCharacterVisible.mockClear();

    act(() => {
      readinessState.isReady = false;
      readinessState.canSendMessage = false;
      readinessState.isInitialAvatarSynced = false;
    });
    rerender(undefined);

    await act(async () => {
      await result.current.setSelectedBackground(customBackground);
    });
    await act(async () => {
      await result.current.setSelectedPose(customPose);
    });
    act(() => {
      result.current.updateCharacterPosition(0.7, 0.8);
      result.current.updateCharacterScale(1.8);
    });
    await act(async () => {
      await result.current.toggleAvatarVisibility();
    });

    expect(mockSetBackgroundColor).not.toHaveBeenCalled();
    expect(mockSetPoseForSlider).not.toHaveBeenCalled();
    expect(mockSetCharacterPosition).not.toHaveBeenCalled();
    expect(mockSetCharacterScale).not.toHaveBeenCalled();
    expect(mockSetCharacterVisible).not.toHaveBeenCalled();

    act(() => {
      readinessState.isReady = true;
      readinessState.canSendMessage = true;
      readinessState.isInitialAvatarSynced = true;
    });
    rerender(undefined);

    await waitFor(() => {
      expect(mockSetBackgroundColor).toHaveBeenCalledWith('#112233');
    });
    expect(mockRunWhenReady).toHaveBeenCalledTimes(2);

    expect(mockSetPoseForSlider).toHaveBeenCalledWith('ATTACK');

    const lastPositionCall = mockSetCharacterPosition.mock.calls.at(-1);
    expect(lastPositionCall).toBeDefined();
    expect(lastPositionCall?.[0]).toBeCloseTo(0.7, 5);
    expect(lastPositionCall?.[1]).toBeCloseTo(0.2, 5);

    const lastScaleCall = mockSetCharacterScale.mock.calls.at(-1);
    expect(lastScaleCall).toBeDefined();
    expect(lastScaleCall?.[0]).toBeCloseTo(1.8, 5);

    expect(mockSetCharacterVisible).toHaveBeenCalledWith(false);
  });

  it('prevents duplicate initialization while staying in the same connected session', async () => {
    const { rerender } = renderHook(
      (_props: undefined) => useShareEditor({ runningData: createRunningData() }),
      { initialProps: undefined }
    );

    act(() => {
      readinessState.isReady = true;
      readinessState.canSendMessage = true;
      readinessState.isInitialAvatarSynced = true;
    });
    rerender(undefined);

    await waitFor(() => {
      expect(mockRunWhenReady).toHaveBeenCalledTimes(1);
    });

    rerender(undefined);
    rerender(undefined);

    await waitFor(() => {
      expect(mockRunWhenReady).toHaveBeenCalledTimes(1);
    });
  });

  it('skips Unity command sync when resetAll is called with syncUnity false', async () => {
    const { result, rerender } = renderHook(
      (_props: undefined) => useShareEditor({ runningData: createRunningData() }),
      { initialProps: undefined }
    );

    act(() => {
      readinessState.isReady = true;
      readinessState.canSendMessage = true;
      readinessState.isInitialAvatarSynced = true;
    });
    rerender(undefined);

    await waitFor(() => {
      expect(mockRunWhenReady).toHaveBeenCalledTimes(1);
    });

    mockSetBackground.mockClear();
    mockSetBackgroundColor.mockClear();
    mockSetBackgroundFromPhoto.mockClear();
    mockSetPoseForSlider.mockClear();
    mockSetAnimationNormalizedTime.mockClear();
    mockSetCharacterPosition.mockClear();
    mockSetCharacterScale.mockClear();
    mockSetCharacterVisible.mockClear();

    await act(async () => {
      await result.current.resetAll({ syncUnity: false });
    });

    expect(mockSetBackground).not.toHaveBeenCalled();
    expect(mockSetBackgroundColor).not.toHaveBeenCalled();
    expect(mockSetBackgroundFromPhoto).not.toHaveBeenCalled();
    expect(mockSetPoseForSlider).not.toHaveBeenCalled();
    expect(mockSetAnimationNormalizedTime).not.toHaveBeenCalled();
    expect(mockSetCharacterPosition).not.toHaveBeenCalled();
    expect(mockSetCharacterScale).not.toHaveBeenCalled();
    expect(mockSetCharacterVisible).not.toHaveBeenCalled();
  });
});
