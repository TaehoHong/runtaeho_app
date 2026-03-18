import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

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

  return {
    findNodeHandle: (...args: unknown[]) => mockFindNodeHandle(...args),
    requireNativeComponent: () => MockNativeUnityView,
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
    },
    UIManager: {
      dispatchViewManagerCommand: (...args: unknown[]) => mockDispatchViewManagerCommand(...args),
      getViewManagerConfig: (...args: unknown[]) => mockGetViewManagerConfig(...args),
    },
  };
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
    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<UnityView reattachToken={0} />);
      await Promise.resolve();
    });

    expect(mockSyncReadyState).toHaveBeenCalled();
    expect(mockDispatchViewManagerCommand).not.toHaveBeenCalled();

    await act(async () => {
      renderer!.update(<UnityView reattachToken={1} />);
      await Promise.resolve();
    });

    expect(mockDispatchViewManagerCommand).toHaveBeenCalledWith(101, 4, []);
  });
});
