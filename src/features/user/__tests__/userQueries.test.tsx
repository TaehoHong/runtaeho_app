import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useConnectAccount,
  useDeleteUser,
  useDisconnectAccount,
  useGetCurrentUser,
  useGetUserById,
  useGetUserData,
} from '~/features/user/services/userQueries';
import { userService } from '~/features/user/services/userService';
import { queryKeys } from '~/services/queryClient';
import { createTestQueryClient } from '~/test-utils/queryClient';

jest.mock('~/features/user/services/userService', () => ({
  userService: {
    getUserById: jest.fn(),
    getUserData: jest.fn(),
    getCurrentUser: jest.fn(),
    connectAccount: jest.fn(),
    disconnectAccount: jest.fn(),
    deleteUser: jest.fn(),
  },
}));

describe('useConnectAccount', () => {
  const createWrapper = (queryClient = createTestQueryClient()) => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { wrapper, queryClient };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('USER-QUERY-001 fetches user by id when enabled and skips fetch when disabled', async () => {
    (userService.getUserById as jest.Mock).mockResolvedValue({ id: 10, nickname: 'Runner' });
    const { wrapper } = createWrapper();

    const enabledHook = renderHook(() => useGetUserById(10), { wrapper });
    const disabledHook = renderHook(() => useGetUserById(20, { enabled: false }), { wrapper });

    await waitFor(() => {
      expect(enabledHook.result.current.isSuccess).toBe(true);
    });

    expect(userService.getUserById).toHaveBeenCalledWith(10);
    expect(userService.getUserById).not.toHaveBeenCalledWith(20);
    expect(disabledHook.result.current.fetchStatus).toBe('idle');
  });

  it('fetches user data and transformed current user hooks', async () => {
    (userService.getUserData as jest.Mock).mockResolvedValue({ id: 1, name: 'Runner' });
    (userService.getCurrentUser as jest.Mock).mockResolvedValue({ id: 1, nickname: 'Runner' });
    const { wrapper } = createWrapper();

    const userDataHook = renderHook(() => useGetUserData(), { wrapper });
    const currentUserHook = renderHook(() => useGetCurrentUser(), { wrapper });

    await waitFor(() => {
      expect(userDataHook.result.current.isSuccess).toBe(true);
      expect(currentUserHook.result.current.isSuccess).toBe(true);
    });

    expect(userService.getUserData).toHaveBeenCalledTimes(1);
    expect(userService.getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('USER-QUERY-002 calls connect API and invalidates user query keys', async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    (userService.connectAccount as jest.Mock).mockResolvedValue(undefined);

    const { result, unmount } = renderHook(() => useConnectAccount(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        userId: 10,
        provider: 'GOOGLE',
        code: 'oauth-code',
      });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.user.all });
    });

    expect(userService.connectAccount).toHaveBeenCalledWith(10, 'GOOGLE', 'oauth-code');
    unmount();
    queryClient.clear();
  });

  it('disconnects account and invalidates user cache', async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    (userService.disconnectAccount as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDisconnectAccount(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ accountId: 99 });
    });

    expect(userService.disconnectAccount).toHaveBeenCalledWith(99);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.user.all });
  });

  it('USER-QUERY-003 clears query cache when delete user mutation succeeds', async () => {
    const { queryClient, wrapper } = createWrapper();
    const clearSpy = jest.spyOn(queryClient, 'clear');
    (userService.deleteUser as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteUser(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(userService.deleteUser).toHaveBeenCalledTimes(1);
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });
});
