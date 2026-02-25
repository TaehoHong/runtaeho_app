import { renderHook } from '@testing-library/react-native';
import { useUnityCharacterControl } from '~/features/running/viewmodels/hooks/useUnityCharacterControl';
import { RunningState } from '~/stores/app/appStore';

const mockSetCharacterSpeed = jest.fn();
const mockStopCharacter = jest.fn();

jest.mock('~/features/unity/services/UnityService', () => ({
  unityService: {
    setCharacterSpeed: (...args: unknown[]) => mockSetCharacterSpeed(...args),
    stopCharacter: (...args: unknown[]) => mockStopCharacter(...args),
  },
}));

describe('useUnityCharacterControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when isUnityReady is false', () => {
    renderHook(() =>
      useUnityCharacterControl({
        isUnityReady: false,
        runningState: RunningState.Running,
        speed: 6.1,
      })
    );

    expect(mockSetCharacterSpeed).not.toHaveBeenCalled();
    expect(mockStopCharacter).not.toHaveBeenCalled();
  });

  it('applies running speed when Unity is ready and running', () => {
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

    expect(mockSetCharacterSpeed).toHaveBeenCalledTimes(1);
    expect(mockSetCharacterSpeed).toHaveBeenCalledWith(6.7);
    expect(mockStopCharacter).not.toHaveBeenCalled();

    rerender({
      isUnityReady: true,
      runningState: RunningState.Running,
      speed: 5.2,
    });

    expect(mockSetCharacterSpeed).toHaveBeenCalledTimes(2);
    expect(mockSetCharacterSpeed).toHaveBeenLastCalledWith(5.2);
  });

  it('stops character when Unity is ready and not running', () => {
    const { rerender } = renderHook(
      (props: { isUnityReady: boolean; runningState: RunningState; speed: number }) =>
        useUnityCharacterControl(props),
      {
        initialProps: {
          isUnityReady: true,
          runningState: RunningState.Paused,
          speed: 6.7,
        },
      }
    );

    expect(mockStopCharacter).toHaveBeenCalledTimes(1);
    expect(mockSetCharacterSpeed).not.toHaveBeenCalled();

    rerender({
      isUnityReady: true,
      runningState: RunningState.Stopped,
      speed: 6.7,
    });

    expect(mockStopCharacter).toHaveBeenCalledTimes(2);
  });
});
