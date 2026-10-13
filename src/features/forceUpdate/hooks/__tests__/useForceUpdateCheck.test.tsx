import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { useForceUpdateCheck } from '../useForceUpdateCheck';
import { checkVersionFromServer } from '../../services/forceUpdateService';
import { useForceUpdateStore } from '../../stores/forceUpdateStore';
import { ForceUpdateStatus } from '../../models/ForceUpdateState';
import { RunningState, useAppStore } from '~/stores/app/appStore';
jest.mock('../../services/forceUpdateService', () => ({ checkVersionFromServer: jest.fn() }));
const check = jest.mocked(checkVersionFromServer);

describe('foreground version check race', () => {
  let listener: (state: AppStateStatus) => void;
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
    useForceUpdateStore.getState().reset();
    useAppStore.getState().resetAppState();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, callback) => {
      listener = callback;
      return { remove: jest.fn() };
    });
  });
  afterEach(() => jest.restoreAllMocks());
  it('discards a late foreground error and checks once again when running stops', async () => {
    let reject!: (error: Error) => void;
    check.mockReturnValueOnce(new Promise((_resolve, fail) => { reject = fail; }));
    check.mockResolvedValue({ forceUpdate: false, minimumVersion: null, message: null });
    const { unmount } = renderHook(() => useForceUpdateCheck({ checkOnLaunch: false }));
    act(() => { listener('background'); listener('active'); });
    act(() => useAppStore.getState().setRunningState(RunningState.Running));
    await act(async () => reject(new Error('offline')));
    expect(useForceUpdateStore.getState().status).not.toBe(ForceUpdateStatus.ERROR);
    await act(async () => useAppStore.getState().setRunningState(RunningState.Stopped));
    expect(check).toHaveBeenCalledTimes(2);
    expect(useForceUpdateStore.getState().status).toBe(ForceUpdateStatus.UP_TO_DATE);
    unmount();
  });
  it('preserves manual error behavior while running and invalidates the deferred recheck', async () => {
    let resolve!: (value: { forceUpdate: boolean; minimumVersion: null; message: null }) => void;
    check.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    check.mockRejectedValueOnce(new Error('manual offline'));
    const { result, unmount } = renderHook(() => useForceUpdateCheck({ checkOnLaunch: false }));
    act(() => { listener('background'); listener('active'); });
    act(() => useAppStore.getState().setRunningState(RunningState.Running));
    await act(async () => result.current.checkForUpdate(true));
    await act(async () => resolve({ forceUpdate: false, minimumVersion: null, message: null }));
    expect(useForceUpdateStore.getState().status).toBe(ForceUpdateStatus.ERROR);
    expect(useForceUpdateStore.getState().checkSource).toBe('manual');
    await act(async () => useAppStore.getState().setRunningState(RunningState.Stopped));
    expect(check).toHaveBeenCalledTimes(2);
    unmount();
  });
});
