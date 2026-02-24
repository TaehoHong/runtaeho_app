import { renderHook } from '@testing-library/react-native';
import { useUnityCharacterControl } from '~/features/running/viewmodels/hooks/useUnityCharacterControl';
import { RunningState } from '~/stores/app/appStore';

const mockIsReady = jest.fn();
const mockOnReady = jest.fn();
const mockSetCharacterSpeed = jest.fn();
const mockStopCharacter = jest.fn();

jest.mock('~/features/unity/services/UnityService', () => ({
  unityService: {
    isReady: (...args: unknown[]) => mockIsReady(...args),
    onReady: (...args: unknown[]) => mockOnReady(...args),
    setCharacterSpeed: (...args: unknown[]) => mockSetCharacterSpeed(...args),
    stopCharacter: (...args: unknown[]) => mockStopCharacter(...args),
  },
}));

describe('useUnityCharacterControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers onReady when Unity is not ready and cleans up subscriptions on deps change/unmount', () => {
    mockIsReady.mockReturnValue(false);
    const unsubscribeFirst = jest.fn();
    const unsubscribeSecond = jest.fn();

    mockOnReady
      .mockImplementationOnce(() => unsubscribeFirst)
      .mockImplementationOnce(() => unsubscribeSecond);

    const { rerender, unmount } = renderHook(
      (props: { isUnityReady: boolean; runningState: RunningState; speed: number }) =>
        useUnityCharacterControl(props),
      {
        initialProps: {
          isUnityReady: true,
          runningState: RunningState.Running,
          speed: 5.5,
        },
      }
    );

    expect(mockOnReady).toHaveBeenCalledTimes(1);
    expect(unsubscribeFirst).not.toHaveBeenCalled();

    rerender({
      isUnityReady: true,
      runningState: RunningState.Running,
      speed: 6.2,
    });

    expect(unsubscribeFirst).toHaveBeenCalledTimes(1);
    expect(mockOnReady).toHaveBeenCalledTimes(2);

    unmount();
    expect(unsubscribeSecond).toHaveBeenCalledTimes(1);
  });

  it('applies speed control once per state change when Unity is already ready', () => {
    mockIsReady.mockReturnValue(true);

    const { rerender } = renderHook(
      (props: { isUnityReady: boolean; runningState: RunningState; speed: number }) =>
        useUnityCharacterControl(props),
      {
        initialProps: {
          isUnityReady: true,
          runningState: RunningState.Running,
          speed: 6.7,
        },
      }
    );

    expect(mockOnReady).not.toHaveBeenCalled();
    expect(mockSetCharacterSpeed).toHaveBeenCalledTimes(1);
    expect(mockSetCharacterSpeed).toHaveBeenCalledWith(6.7);
    expect(mockStopCharacter).not.toHaveBeenCalled();

    rerender({
      isUnityReady: true,
      runningState: RunningState.Paused,
      speed: 6.7,
    });

    expect(mockSetCharacterSpeed).toHaveBeenCalledTimes(1);
    expect(mockStopCharacter).toHaveBeenCalledTimes(1);
  });
});
