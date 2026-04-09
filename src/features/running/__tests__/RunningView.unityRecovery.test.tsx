import React from 'react';
import { StyleSheet } from 'react-native';
import { waitFor } from '@testing-library/react-native';
import { RunningView } from '~/features/running/views/RunningView';
import { RunningState, ViewState, useAppStore } from '~/stores/app/appStore';
import { renderWithProviders } from '~/test-utils/renderWithProviders';

const mockUseFocusEffect = jest.fn();
const mockUseIsFocused = jest.fn();
const mockUseUnityBootstrap = jest.fn();
const mockStartUnity = jest.fn();
const mockRunWhenReady = jest.fn();
const mockInitCharacter = jest.fn();
const mockSyncAvatar = jest.fn();
const mockStopCharacter = jest.fn();
const mockCheckUncheckedLeagueResult = jest.fn();
const mockRequestPermissionsOnFirstLogin = jest.fn();
let mockIsLoggedIn = false;

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (...args: unknown[]) => mockUseFocusEffect(...args),
  useIsFocused: () => mockUseIsFocused(),
}));

jest.mock('~/features/unity/hooks', () => ({
  useUnityBootstrap: (...args: unknown[]) => mockUseUnityBootstrap(...args),
}));

jest.mock('~/features', () => ({
  useAuthStore: (selector: (state: { isLoggedIn: boolean }) => unknown) =>
    selector({ isLoggedIn: mockIsLoggedIn }),
}));

jest.mock('~/stores/user/userStore', () => {
  const userState = {
    currentUser: { id: 1 },
    equippedItems: {},
    hairColor: 'black',
  };

  const useUserStore = (
    selector: (state: typeof userState) => unknown
  ) => selector(userState);

  useUserStore.getState = () => userState;

  return { useUserStore };
});

jest.mock('~/features/league/hooks/useLeagueCheck', () => ({
  useLeagueCheck: () => ({
    checkUncheckedLeagueResult: mockCheckUncheckedLeagueResult,
  }),
}));

jest.mock('~/shared/hooks/usePermissionRequest', () => ({
  usePermissionRequest: () => ({
    requestPermissionsOnFirstLogin: mockRequestPermissionsOnFirstLogin,
    isPermissionChecked: true,
  }),
}));

jest.mock('~/features/unity/services/UnityService', () => ({
  unityService: {
    runWhenReady: (...args: unknown[]) => mockRunWhenReady(...args),
    initCharacter: (...args: unknown[]) => mockInitCharacter(...args),
    syncAvatar: (...args: unknown[]) => mockSyncAvatar(...args),
    stopCharacter: (...args: unknown[]) => mockStopCharacter(...args),
  },
}));

jest.mock('~/features/running/contexts/RunningContext', () => ({
  RunningProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('~/features/running/views/components/ControlPanelView', () => ({
  ControlPanelView: () => null,
}));

jest.mock('~/features/unity/components/UnityLoadingState', () => ({
  UnityLoadingState: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('~/shared/components', () => ({
  LoadingView: () => null,
}));

describe('RunningView unity recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetAppState();
    useAppStore.getState().setViewState(ViewState.Loaded);
    useAppStore.getState().setRunningState(RunningState.Stopped);

    mockIsLoggedIn = true;
    mockUseIsFocused.mockReturnValue(true);
    mockUseFocusEffect.mockImplementation((callback: () => void | (() => void)) => {
      callback();
    });
    mockUseUnityBootstrap.mockReturnValue({
      isReady: true,
      isUnityStarted: true,
      isInitialAvatarSynced: true,
      startUnity: mockStartUnity,
    });
    mockRunWhenReady.mockImplementation(async (task?: () => void | Promise<void>) => {
      if (typeof task === 'function') {
        await task();
      }
      return true;
    });
    mockInitCharacter.mockResolvedValue(undefined);
    mockSyncAvatar.mockResolvedValue('applied');
    mockStopCharacter.mockResolvedValue(undefined);
  });

  it('starts Unity when the running screen is focused and the user is logged in', async () => {
    const { getByTestId } = renderWithProviders(<RunningView />);

    await waitFor(() => {
      expect(mockStartUnity).toHaveBeenCalledTimes(1);
    });

    expect(StyleSheet.flatten(getByTestId('running-root').props.style)).toMatchObject({
      backgroundColor: 'transparent',
    });
  });

  it('does not start Unity when the user is logged out', async () => {
    mockIsLoggedIn = false;

    renderWithProviders(<RunningView />);

    await waitFor(() => {
      expect(mockStartUnity).not.toHaveBeenCalled();
    });
  });

  it('applies idle initialization when running has not started yet', async () => {
    renderWithProviders(<RunningView />);

    await waitFor(() => {
      expect(mockStopCharacter).toHaveBeenCalledTimes(1);
    });
    expect(mockRequestPermissionsOnFirstLogin).toHaveBeenCalledTimes(1);
  });

  it('does not override running animation when bootstrap finishes after running starts', async () => {
    useAppStore.getState().setRunningState(RunningState.Running);

    renderWithProviders(<RunningView />);

    await waitFor(() => {
      expect(mockRequestPermissionsOnFirstLogin).toHaveBeenCalledTimes(1);
    });
    expect(mockStopCharacter).not.toHaveBeenCalled();
  });
});
