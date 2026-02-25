import React from 'react';
import { BackHandler, Platform, type NativeEventSubscription } from 'react-native';
import { screen } from '@testing-library/react-native';
import { RunningView } from '~/features/running/views/RunningView';
import { RunningState, ViewState, useAppStore } from '~/stores/app/appStore';
import { renderWithProviders } from '~/test-utils/renderWithProviders';

const mockOnReady = jest.fn((..._args: unknown[]) => () => {});
const mockUseFocusEffect = jest.fn();
const mockUseIsFocused = jest.fn();
const mockUseUnityBootstrap = jest.fn();
const mockStartUnity = jest.fn();
const mockHandleUnityReady = jest.fn();
const mockRunWhenReady = jest.fn();
const mockInitCharacter = jest.fn();
const mockSyncAvatar = jest.fn();
const mockCheckUncheckedLeagueResult = jest.fn();
const mockBackHandlerRemove = jest.fn();
let hardwareBackPressHandler: (() => boolean | null | undefined) | null = null;
let mockIsLoggedIn = false;
const readinessState = {
  isReady: false,
  isUnityStarted: false,
  isInitialAvatarSynced: false,
};

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

jest.mock('~/stores/user/userStore', () => ({
  useUserStore: (
    selector: (state: { equippedItems: Record<string, unknown>; hairColor: string }) => unknown
  ) => selector({ equippedItems: {}, hairColor: 'black' }),
}));

jest.mock('~/features/league/hooks/useLeagueCheck', () => ({
  useLeagueCheck: () => ({
    checkUncheckedLeagueResult: mockCheckUncheckedLeagueResult,
  }),
}));

jest.mock('~/shared/hooks/usePermissionRequest', () => ({
  usePermissionRequest: () => ({
    requestPermissionsOnFirstLogin: jest.fn(),
    isPermissionChecked: true,
  }),
}));

jest.mock('~/features/unity/services/UnityService', () => ({
  unityService: {
    onReady: (...args: unknown[]) => mockOnReady(...args),
    runWhenReady: (...args: unknown[]) => mockRunWhenReady(...args),
    initCharacter: (...args: unknown[]) => mockInitCharacter(...args),
    syncAvatar: (...args: unknown[]) => mockSyncAvatar(...args),
  },
}));

jest.mock('../contexts/RunningContext', () => {
  return {
    RunningProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('../views/components/ControlPanelView', () => ({
  ControlPanelView: () => null,
}));

jest.mock('~/features/unity/components/UnityView', () => ({
  UnityView: () => {
    const { View: MockView } = require('react-native');
    return <MockView testID="running-unity-view" />;
  },
}));

jest.mock('~/features/unity/components/UnityLoadingState', () => ({
  UnityLoadingState: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('~/shared/components', () => ({
  LoadingView: () => null,
}));

describe('RunningView android back handler', () => {
  const originalPlatformOS = Platform.OS;

  const renderRunningView = () => renderWithProviders(<RunningView />);

  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetAppState();
    useAppStore.getState().setViewState(ViewState.Loaded);
    useAppStore.getState().setRunningState(RunningState.Stopped);

    mockIsLoggedIn = false;
    readinessState.isReady = false;
    readinessState.isUnityStarted = false;
    readinessState.isInitialAvatarSynced = false;
    mockUseFocusEffect.mockReset();
    mockUseIsFocused.mockReturnValue(true);
    mockUseUnityBootstrap.mockImplementation(() => ({
      isReady: readinessState.isReady,
      isUnityStarted: readinessState.isUnityStarted,
      isInitialAvatarSynced: readinessState.isInitialAvatarSynced,
      startUnity: mockStartUnity,
      handleUnityReady: mockHandleUnityReady,
    }));
    mockRunWhenReady.mockResolvedValue(true);
    mockInitCharacter.mockResolvedValue(undefined);
    mockSyncAvatar.mockResolvedValue('empty');

    hardwareBackPressHandler = null;
    mockBackHandlerRemove.mockReset();

    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });

    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((eventName, handler) => {
      if (eventName === 'hardwareBackPress') {
        hardwareBackPressHandler = handler;
      }
      return { remove: mockBackHandlerRemove } as NativeEventSubscription;
    });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatformOS });
    jest.restoreAllMocks();
  });

  it('returns true on hardware back press when running state is Running', () => {
    useAppStore.getState().setRunningState(RunningState.Running);

    renderRunningView();

    expect(hardwareBackPressHandler).not.toBeNull();
    expect(hardwareBackPressHandler?.()).toBe(true);
  });

  it('returns true on hardware back press when running state is Paused', () => {
    useAppStore.getState().setRunningState(RunningState.Paused);

    renderRunningView();

    expect(hardwareBackPressHandler).not.toBeNull();
    expect(hardwareBackPressHandler?.()).toBe(true);
  });

  it('returns false on hardware back press when running state is Stopped', () => {
    useAppStore.getState().setRunningState(RunningState.Stopped);

    renderRunningView();

    expect(hardwareBackPressHandler).not.toBeNull();
    expect(hardwareBackPressHandler?.()).toBe(false);
  });

  it('removes hardware back handler listener on unmount', () => {
    useAppStore.getState().setRunningState(RunningState.Running);

    const { unmount } = renderRunningView();

    expect(mockBackHandlerRemove).not.toHaveBeenCalled();
    unmount();
    expect(mockBackHandlerRemove).toHaveBeenCalledTimes(1);
  });

  it('does not trigger unity controls when screen is unfocused', () => {
    mockIsLoggedIn = true;
    readinessState.isReady = true;
    readinessState.isUnityStarted = true;
    readinessState.isInitialAvatarSynced = true;
    mockUseIsFocused.mockReturnValue(false);

    renderRunningView();

    expect(mockStartUnity).not.toHaveBeenCalled();
    expect(mockRunWhenReady).not.toHaveBeenCalled();
    expect(screen.queryByTestId('running-unity-view')).toBeNull();
  });
});
