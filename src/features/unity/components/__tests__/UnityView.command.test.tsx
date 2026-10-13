import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

const mockDispatchViewManagerCommand = jest.fn();
const mockGetViewManagerConfig = jest.fn(() => ({
  Commands: {
    reattachUnityView: 4,
  },
}));
const mockFindNodeHandle = jest.fn(() => 101);
const mockSyncReadyState = jest.fn();
const mockResetGameObjectReady = jest.fn();

jest.mock('react-native', () => {
  const React = require('react');

  const MockNativeUnityView = React.forwardRef(
    function MockNativeUnityView(props: Record<string, unknown>, _ref: unknown) {
      return React.createElement('UnityView', props);
    }
  );

  return Object.setPrototypeOf({
    Platform: {
      OS: 'ios',
    },
    findNodeHandle: mockFindNodeHandle,
    requireNativeComponent: () => MockNativeUnityView,
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
    },
    UIManager: {
      dispatchViewManagerCommand: (...args: unknown[]) => mockDispatchViewManagerCommand(...args),
      getViewManagerConfig: mockGetViewManagerConfig,
    },
  }, jest.requireActual('react-native'));
});

jest.mock('~/features/unity/bridge/UnityBridge', () => ({
  UnityBridge: {
    syncReadyState: (...args: unknown[]) => mockSyncReadyState(...args),
  },
}));

jest.mock('~/features/unity/services/UnityService', () => ({
  unityService: {
    resetGameObjectReady: (...args: unknown[]) => mockResetGameObjectReady(...args),
  },
}));

const { UnityView } = require('~/features/unity/components/UnityView');

describe('UnityView reattach command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSyncReadyState.mockResolvedValue(true);
    mockResetGameObjectReady.mockResolvedValue(undefined);
  });

  it('dispatches native reattach command when token changes', async () => {
    const renderer = render(<UnityView reattachToken={0} />);
    await waitFor(() => expect(mockSyncReadyState).toHaveBeenCalled());
    expect(mockDispatchViewManagerCommand).not.toHaveBeenCalled();

    renderer.rerender(<UnityView reattachToken={1} />);
    await waitFor(() => expect(mockDispatchViewManagerCommand).toHaveBeenCalledWith(101, 4, []));
    expect(mockGetViewManagerConfig).toHaveBeenCalledWith('RunTaehoUnityView');
    renderer.unmount();
  });
});
