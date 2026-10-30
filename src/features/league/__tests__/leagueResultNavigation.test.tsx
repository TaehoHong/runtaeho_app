import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { routerMock } from '~/test-utils/mocks/native';
import { LeagueView } from '../views/LeagueView';
import { RunningView } from '~/features/running/views/RunningView';
import { useAppStore, RunningState } from '~/stores/app/appStore';
import { useLeagueCheckStore } from '~/stores/league/leagueCheckStore';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { useUserStore } from '~/stores/user/userStore';
import { createUser } from '~/features/user/models/User';
import { apiClient } from '~/services/api/client';
import { LeagueResultStatus, LeagueTierType, type LeagueResult } from '../models';

const mockFocusContext = React.createContext(true);
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => require('react').useContext(mockFocusContext),
  useFocusEffect: (effect: React.EffectCallback) => {
    const React = require('react');
    const focused = React.useContext(mockFocusContext);
    React.useEffect(() => { if (focused) return effect(); }, [focused, effect]);
  },
}));
jest.mock('expo-router', () => ({
  useRouter: () => require('~/test-utils/mocks/native').routerMock,
  useFocusEffect: (effect: React.EffectCallback) => require('@react-navigation/native').useFocusEffect(effect),
}));
jest.mock('~/shared/services/TokenRefreshInterceptor', () => ({
  tokenRefreshInterceptor: {
    validateAndRefreshIfNeeded: jest.fn().mockResolvedValue(undefined),
    handleResponseError: (error: unknown) => Promise.reject(error),
  },
}));
jest.mock('~/features', () => ({ useAuthStore: require('~/features/auth/stores/authStore').useAuthStore }));
jest.mock('~/features/unity/hooks', () => ({
  useUnityBootstrap: () => ({ isReady: false, isUnityStarted: false, isInitialAvatarSynced: false, startUnity: jest.fn() }),
}));
jest.mock('~/features/unity/services/UnityService', () => ({ unityService: {} }));
jest.mock('~/shared/hooks/usePermissionRequest', () => ({
  usePermissionRequest: () => ({ isPermissionChecked: false, requestPermissionsOnFirstLogin: jest.fn() }),
}));
jest.mock('~/features/healthImport/hooks/useHealthPermissionModal', () => ({
  useHealthPermissionModal: () => ({ visible: false, showIfNeeded: jest.fn(), close: jest.fn(), requestPermission: jest.fn() }),
}));
jest.mock('~/features/healthImport/components/HealthPermissionModal', () => ({ HealthPermissionModal: () => null }));
jest.mock('~/features/running/contexts/RunningContext', () => ({ RunningProvider: ({ children }: React.PropsWithChildren) => children }));
jest.mock('~/features/running/views/components/ControlPanelView', () => ({ ControlPanelView: () => null }));
jest.mock('~/features/league/viewmodels', () => ({
  useLeagueViewModel: () => ({ formattedData: null, handleRefresh: mockRefresh }),
}));
const mockRefresh = jest.fn();
const pending: LeagueResult = {
  previousTier: LeagueTierType.BRONZE, currentTier: LeagueTierType.SILVER,
  resultStatus: LeagueResultStatus.PROMOTED, finalRank: 1, totalParticipants: 12,
  totalDistance: 1000, rewardPoints: 100, participants: [],
};
let complete!: (value: LeagueResult | null) => void;
let requestCount = 0;
const originalAdapter = apiClient.defaults.adapter;
function Screens({ focused }: { focused: 'running' | 'league' | 'other' | 'both' }) {
  return <>
    <mockFocusContext.Provider value={focused === 'running' || focused === 'both'}><RunningView /></mockFocusContext.Provider>
    <mockFocusContext.Provider value={focused === 'league' || focused === 'both'}><LeagueView /></mockFocusContext.Provider>
  </>;
}
beforeEach(() => {
  useAppStore.getState().resetAppState();
  useLeagueCheckStore.getState().reset();
  useAuthStore.setState({ isLoggedIn: true, accessToken: 'test-token', tokensRevoked: false });
  useUserStore.setState({ currentUser: createUser({ id: 1, nickname: 'User 1' }) });
  requestCount = 0;
  apiClient.defaults.adapter = async config => {
    requestCount += 1;
    const data = await new Promise<LeagueResult | null>(resolve => { complete = resolve; });
    return { config, data, status: 200, statusText: 'OK', headers: {} };
  };
});
afterEach(() => {
  if (originalAdapter) apiClient.defaults.adapter = originalAdapter;
  else delete apiClient.defaults.adapter;
});

it.each(['running', 'league', 'both'] as const)('delivers one result with both screens mounted and %s focused', async focused => {
  const view = render(<Screens focused="league" />);
  await waitFor(() => expect(requestCount).toBe(1));
  view.rerender(<Screens focused={focused} />);
  await act(async () => { complete(pending); });
  expect(routerMock.push).toHaveBeenCalledTimes(1);
  expect(routerMock.push).toHaveBeenCalledWith({ pathname: '/league/result', params: { resultData: JSON.stringify(pending) } });
  expect(useLeagueCheckStore.getState().pendingResult).toBeNull();
});

it('preserves the result while both tabs are hidden and consumes it on focus once', async () => {
  const view = render(<Screens focused="league" />);
  await waitFor(() => expect(requestCount).toBe(1));
  view.rerender(<Screens focused="other" />);
  await act(async () => { complete(pending); });
  expect(routerMock.push).not.toHaveBeenCalled();
  expect(useLeagueCheckStore.getState().pendingResult).toEqual(pending);
  view.rerender(<Screens focused="running" />);
  expect(routerMock.push).toHaveBeenCalledTimes(1);
  view.rerender(<Screens focused="league" />);
  expect(routerMock.push).toHaveBeenCalledTimes(1);
});

it('drops the previous session pending result on reset and delivers the new result after focus', async () => {
  const view = render(<Screens focused="league" />);
  await waitFor(() => expect(requestCount).toBe(1));
  view.rerender(<Screens focused="other" />);
  await act(async () => { complete(pending); });
  act(() => {
    useAuthStore.getState().logout();
    useAuthStore.setState({ isLoggedIn: true, tokensRevoked: false, accessToken: 'next-token' });
    useUserStore.setState({ currentUser: createUser({ id: 2, nickname: 'User 2' }) });
    useLeagueCheckStore.getState().reset();
  });
  view.rerender(<Screens focused="league" />);
  await waitFor(() => expect(requestCount).toBe(2));
  expect(routerMock.push).not.toHaveBeenCalled();
  const nextResult = { ...pending, finalRank: 2, totalDistance: 2000 };
  await act(async () => { complete(nextResult); });
  expect(routerMock.push).toHaveBeenCalledTimes(1);
  expect(routerMock.push).toHaveBeenCalledWith({ pathname: '/league/result', params: { resultData: JSON.stringify(nextResult) } });
});

it.each([RunningState.Running, RunningState.Paused, RunningState.Finished])('preserves the result in %s until a focused screen is Stopped', async runningState => {
  useAppStore.getState().setRunningState(runningState);
  const view = render(<Screens focused="league" />);
  await waitFor(() => expect(requestCount).toBe(1));
  await act(async () => { complete(pending); });
  expect(routerMock.push).not.toHaveBeenCalled();
  expect(useLeagueCheckStore.getState().pendingResult).toEqual(pending);
  view.rerender(<Screens focused="running" />);
  expect(routerMock.push).not.toHaveBeenCalled();
  act(() => useAppStore.getState().setRunningState(RunningState.Stopped));
  expect(routerMock.push).toHaveBeenCalledTimes(1);
  expect(useLeagueCheckStore.getState().pendingResult).toBeNull();
});
