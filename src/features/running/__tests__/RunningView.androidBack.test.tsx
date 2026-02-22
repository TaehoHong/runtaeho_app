import React from 'react';
import { BackHandler, Platform, type NativeEventSubscription } from 'react-native';
import { RunningView } from '~/features/running/views/RunningView';
import { RunningState, ViewState, useAppStore } from '~/stores/app/appStore';
import { renderWithProviders } from '~/test-utils/renderWithProviders';

const mockOnReady = jest.fn(() => () => {});
const mockCheckUncheckedLeagueResult = jest.fn();
const mockBackHandlerRemove = jest.fn();
let hardwareBackPressHandler: (() => boolean) | null = null;

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('~/features', () => ({
  useAuthStore: (selector: (state: { isLoggedIn: boolean }) => unknown) =>
    selector({ isLoggedIn: false }),
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
  UnityView: () => null,
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
});
