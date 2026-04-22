import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { RunningStartView } from '~/features/running/views/running-start';
import { RunningState, useAppStore } from '~/stores/app/appStore';
import { useUserStore } from '~/stores/user/userStore';
import { renderWithProviders } from '~/test-utils/renderWithProviders';
import { resetAllStores } from '~/test-utils/resetState';

const mockCheckRequiredPermissions = jest.fn();
const mockStartRunning = jest.fn();
const mockPermissionRequestModal = jest.fn();

jest.mock('~/services/PermissionManager', () => ({
  permissionManager: {
    checkRequiredPermissions: () => mockCheckRequiredPermissions(),
  },
}));

jest.mock('~/features/running/contexts', () => ({
  useRunning: () => ({
    startRunning: () => mockStartRunning(),
  }),
}));

jest.mock('~/features/permissions/views/PermissionRequestModal', () => ({
  PermissionRequestModal: ({ visible }: { visible: boolean }) => {
    const React = require('react');
    const { Text } = require('react-native');
    mockPermissionRequestModal(visible);
    return visible ? React.createElement(Text, null, 'permission-modal-visible') : null;
  },
}));

describe('RunningStartView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAllStores();
    useAppStore.getState().setRunningState(RunningState.Stopped);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('RUN-SCREEN-004 logs haveRunningRecord only when the value changes', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    useUserStore.setState({ haveRunningRecord: true });

    const { rerender } = renderWithProviders(<RunningStartView />);

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith('[RunningStartView] haveRunningRecord: ', true);
    });

    const initialLogCount = consoleLogSpy.mock.calls.filter(
      ([message]) => message === '[RunningStartView] haveRunningRecord: '
    ).length;

    rerender(<RunningStartView />);

    await waitFor(() => {
      const rerenderLogCount = consoleLogSpy.mock.calls.filter(
        ([message]) => message === '[RunningStartView] haveRunningRecord: '
      ).length;
      expect(rerenderLogCount).toBe(initialLogCount);
    });
  });

  it('RUN-SCREEN-001 starts running when required permissions are granted', async () => {
    mockCheckRequiredPermissions.mockResolvedValue({
      canStartRunning: true,
      hasAllPermissions: true,
      location: true,
      locationBackground: true,
      motion: true,
    });
    mockStartRunning.mockResolvedValue(undefined);

    renderWithProviders(<RunningStartView />);
    fireEvent.press(screen.getByText('START !'));

    await waitFor(() => {
      expect(mockStartRunning).toHaveBeenCalledTimes(1);
      expect(useAppStore.getState().runningState).toBe(RunningState.Running);
    });
  });

  it('RUN-SCREEN-002 shows permission modal when required permissions are denied', async () => {
    mockCheckRequiredPermissions.mockResolvedValue({
      canStartRunning: false,
      hasAllPermissions: false,
      location: false,
      locationBackground: false,
      motion: false,
    });

    renderWithProviders(<RunningStartView />);
    fireEvent.press(screen.getByText('START !'));

    await waitFor(() => {
      expect(screen.getByText('permission-modal-visible')).toBeTruthy();
      expect(mockStartRunning).not.toHaveBeenCalled();
      expect(useAppStore.getState().runningState).toBe(RunningState.Stopped);
    });
  });

  it('RUN-SCREEN-003 keeps the stopped state when startRunning throws', async () => {
    mockCheckRequiredPermissions.mockResolvedValue({
      canStartRunning: true,
      hasAllPermissions: true,
      location: true,
      locationBackground: true,
      motion: true,
    });
    mockStartRunning.mockRejectedValue(new Error('start failed'));

    renderWithProviders(<RunningStartView />);
    fireEvent.press(screen.getByText('START !'));

    await waitFor(() => {
      expect(mockStartRunning).toHaveBeenCalledTimes(1);
      expect(useAppStore.getState().runningState).toBe(RunningState.Stopped);
    });
  });
});
