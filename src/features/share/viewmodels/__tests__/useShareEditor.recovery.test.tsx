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
const mockSetCharacterSpeed = jest.fn();
const mockStopCharacter = jest.fn();
const mockSetCharacterMotion = jest.fn();
const mockUseUnityReadiness = jest.fn();

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
    setCharacterSpeed: (...args: unknown[]) => mockSetCharacterSpeed(...args),
    stopCharacter: (...args: unknown[]) => mockStopCharacter(...args),
    setCharacterMotion: (...args: unknown[]) => mockSetCharacterMotion(...args),
  },
}));

jest.mock('~/features/unity/hooks', () => ({
  useUnityReadiness: (...args: unknown[]) => mockUseUnityReadiness(...args),
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
    readinessState.handleUnityReady = jest.fn();

    mockSetBackground.mockResolvedValue(undefined);
    mockSetBackgroundColor.mockResolvedValue(undefined);
    mockSetBackgroundFromPhoto.mockResolvedValue(undefined);
    mockSetPoseForSlider.mockResolvedValue(undefined);
    mockSetAnimationNormalizedTime.mockResolvedValue(undefined);
    mockSetCharacterPosition.mockResolvedValue(undefined);
    mockSetCharacterScale.mockResolvedValue(undefined);
    mockSetCharacterVisible.mockResolvedValue(undefined);
    mockSetCharacterSpeed.mockResolvedValue(undefined);
    mockStopCharacter.mockResolvedValue(undefined);
    mockSetCharacterMotion.mockResolvedValue(undefined);

    mockUseUnityReadiness.mockImplementation(() => ({
      ...readinessState,
    }));
  });

  it('SHARE-UNITY-001 reapplies latest Unity state when canSendMessage recovers', async () => {
    const { result, rerender } = renderHook(() => useShareEditor({ runningData: createRunningData() }));

    act(() => {
      readinessState.isReady = true;
      readinessState.canSendMessage = true;
    });
    rerender();

    await waitFor(() => {
      expect(mockSetPoseForSlider).toHaveBeenCalledTimes(1);
    });

    mockSetBackgroundColor.mockClear();
    mockSetPoseForSlider.mockClear();
    mockSetCharacterPosition.mockClear();
    mockSetCharacterScale.mockClear();
    mockSetCharacterVisible.mockClear();

    act(() => {
      readinessState.isReady = false;
      readinessState.canSendMessage = false;
    });
    rerender();

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
    });
    rerender();

    await waitFor(() => {
      expect(mockSetBackgroundColor).toHaveBeenCalledWith('#112233');
    });

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
});
