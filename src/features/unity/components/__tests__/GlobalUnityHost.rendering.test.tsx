import React from 'react';
import { act, render } from '@testing-library/react-native';
import { GlobalUnityHost } from '../GlobalUnityHost';
import { useUnityStore } from '~/stores/unity/unityStore';
import { useAuthStore } from '~/features/auth/stores/authStore';

const mockMount = jest.fn();
const mockUnmount = jest.fn();
jest.mock('../UnityView', () => ({
  UnityView: ({ renderingEnabled = true }: { renderingEnabled?: boolean }) => {
    const React = require('react');
    const { View } = require('react-native');
    React.useEffect(() => { mockMount(); return mockUnmount; }, []);
    return <View testID="engine" accessibilityLabel={renderingEnabled ? 'rendering' : 'paused'} />;
  },
}));
jest.mock('../../hooks/useUnitySessionController', () => ({
  useUnitySessionController: () => ({ reattachToken: 0 }),
}));

const viewport = { owner: 'running' as const, frame: { x: 0, y: 0, width: 320, height: 200 } };

describe('global Unity rendering lifetime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ isLoggedIn: true });
    useUnityStore.getState().resetUnityState();
    useUnityStore.setState({ activeViewport: viewport, isGameObjectReady: true, isAvatarReady: true });
  });

  it('pauses a hidden ready engine and resumes the same mounted instance on reentry', () => {
    const view = render(<GlobalUnityHost />);
    expect(view.getByTestId('engine').props.accessibilityLabel).toBe('rendering');
    act(() => useUnityStore.getState().clearActiveViewport());
    expect(view.getByTestId('engine').props.accessibilityLabel).toBe('paused');
    act(() => useUnityStore.getState().setActiveViewport(viewport));
    expect(view.getByTestId('engine').props.accessibilityLabel).toBe('rendering');
    expect(mockMount).toHaveBeenCalledTimes(1);
    expect(mockUnmount).not.toHaveBeenCalled();
  });

  it('keeps the held exit viewport rendering until the native transition finishes', () => {
    const view = render(<GlobalUnityHost />);
    act(() => {
      useUnityStore.getState().beginViewportExit('running', 'source');
      useUnityStore.getState().clearActiveViewport('running');
    });
    expect(view.getByTestId('engine').props.accessibilityLabel).toBe('rendering');
    act(() => useUnityStore.getState().completeViewportExit('source'));
    expect(view.getByTestId('engine').props.accessibilityLabel).toBe('paused');
  });

  it('allows hidden bootstrap and avatar acknowledgements to finish before pausing', () => {
    const view = render(<GlobalUnityHost />);
    act(() => {
      useUnityStore.getState().resetReadyStates();
      useUnityStore.getState().clearActiveViewport();
    });
    expect(view.getByTestId('engine').props.accessibilityLabel).toBe('rendering');
    act(() => useUnityStore.getState().setGameObjectReady(true));
    expect(view.getByTestId('engine').props.accessibilityLabel).toBe('rendering');
    act(() => useUnityStore.getState().setAvatarReady(true));
    expect(view.getByTestId('engine').props.accessibilityLabel).toBe('paused');
    act(() => useUnityStore.getState().setAvatarReady(false));
    expect(view.getByTestId('engine').props.accessibilityLabel).toBe('rendering');
  });

  it('pauses on logout despite readiness reset and allows the next login to bootstrap', () => {
    const view = render(<GlobalUnityHost />);
    act(() => {
      useAuthStore.getState().setLoggedIn(false);
      useUnityStore.getState().resetUnityState();
    });
    expect(view.getByTestId('engine').props.accessibilityLabel).toBe('paused');
    act(() => { useAuthStore.getState().setLoggedIn(true); });
    expect(view.getByTestId('engine').props.accessibilityLabel).toBe('rendering');
    expect(mockMount).toHaveBeenCalledTimes(1);
  });
});
