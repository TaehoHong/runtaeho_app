import { createElement } from 'react';
import { View } from 'react-native';
import { act, render, renderHook, waitFor } from '@testing-library/react-native';
import type { Item } from '~/features/avatar';
import { UnityLoadingState } from '../components/UnityLoadingState';
import type { InitialAvatarPayload } from './useUnityBootstrap';
import { useUnityBootstrap } from './useUnityBootstrap';

const mockSyncAvatar = jest.fn();
const mockUseUnityReadiness = jest.fn();
const mockBaseHandleUnityReady = jest.fn();
const mockStartUnity = jest.fn();
const mockReset = jest.fn();
const mockResetGameObjectReady = jest.fn();
const mockSyncReadyState = jest.fn();

jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (callback: (...args: unknown[]) => void, ...args: unknown[]) => callback(...args),
  createSerializable: <T>(value: T) => value,
  serializableMappingCache: new Map(),
  isWorkletFunction: () => true,
  runOnUI: (callback: (...args: unknown[]) => void) => callback,
  RuntimeKind: {
    ReactNative: 'react-native',
  },
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  const AnimatedView = React.forwardRef(function MockAnimatedView(props: any, ref: any) {
    return React.createElement(View, { ...props, ref }, props.children);
  });
  return {
    __esModule: true,
    default: {
      View: AnimatedView,
    },
    View: AnimatedView,
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useAnimatedStyle: (updater: () => Record<string, unknown>) => updater(),
    withTiming: (
      toValue: unknown,
      _config?: unknown,
      callback?: (finished?: boolean) => void
    ) => {
      callback?.(true);
      return toValue;
    },
    Easing: {
      out: (value: unknown) => value,
      ease: () => 0,
    },
  };
});

jest.mock('../services/UnityService', () => ({
  unityService: {
    syncAvatar: (...args: unknown[]) => mockSyncAvatar(...args),
    resetGameObjectReady: (...args: unknown[]) => mockResetGameObjectReady(...args),
  },
}));

jest.mock('./useUnityReadiness', () => ({
  useUnityReadiness: (...args: unknown[]) => mockUseUnityReadiness(...args),
}));

jest.mock('../bridge/UnityBridge', () => ({
  UnityBridge: {
    syncReadyState: (...args: unknown[]) => mockSyncReadyState(...args),
  },
}));

afterEach(() => {
  jest.useRealTimers();
});

function createItem(id: number): Item {
  return {
    id,
    itemType: {
      id: 1,
      name: '머리',
    },
    name: `New_Hair_${id}`,
    unityFilePath: `Assets/05.Resource/Hair/New_Hair_${id}.png`,
    filePath: `/assets/items/Hair/New_Hair_${id}.png`,
    point: 100,
    createdAt: new Date().toISOString(),
    isOwned: true,
  };
}

describe('useUnityBootstrap', () => {
  const readinessState = {
    isReady: false,
    isAvatarApplied: false,
    canSendMessage: false,
    isUnityStarted: false,
    isUnityAvailable: true,
    handleUnityReady: mockBaseHandleUnityReady,
    startUnity: mockStartUnity,
    reset: mockReset,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSyncAvatar.mockReset();
    mockUseUnityReadiness.mockReset();
    mockResetGameObjectReady.mockReset();
    mockSyncReadyState.mockReset();
    readinessState.isReady = false;
    readinessState.isAvatarApplied = false;
    readinessState.canSendMessage = false;
    readinessState.isUnityStarted = false;
    readinessState.isUnityAvailable = true;

    mockSyncAvatar.mockResolvedValue('applied');
    mockResetGameObjectReady.mockResolvedValue(undefined);
    mockSyncReadyState.mockResolvedValue(false);
    mockUseUnityReadiness.mockImplementation(() => ({
      ...readinessState,
    }));
  });

  it('calls syncAvatar once even when onUnityReady is fired multiple times', async () => {
    const payload: InitialAvatarPayload = {
      items: [createItem(1)],
      hairColor: '#000000',
    };

    const { result, rerender } = renderHook(
      (_props: undefined) =>
        useUnityBootstrap({
          getInitialAvatarPayload: () => payload,
        }),
      { initialProps: undefined }
    );

    act(() => {
      result.current.handleUnityReady({ nativeEvent: { ready: true } });
      result.current.handleUnityReady({ nativeEvent: { ready: true } });
    });

    expect(mockBaseHandleUnityReady).toHaveBeenCalledTimes(2);
    expect(mockSyncAvatar).toHaveBeenCalledTimes(0);

    act(() => {
      readinessState.canSendMessage = true;
      readinessState.isReady = true;
    });
    rerender(undefined);

    await waitFor(() => {
      expect(mockSyncAvatar).toHaveBeenCalledTimes(1);
    });

    rerender(undefined);
    await waitFor(() => {
      expect(mockSyncAvatar).toHaveBeenCalledTimes(1);
    });
  });

  it('waits until payload becomes available and then syncs once', async () => {
    let payload: InitialAvatarPayload = null;

    const { result, rerender } = renderHook(
      (_props: undefined) =>
        useUnityBootstrap({
          getInitialAvatarPayload: () => payload,
        }),
      { initialProps: undefined }
    );

    act(() => {
      readinessState.canSendMessage = true;
      readinessState.isReady = true;
    });
    rerender(undefined);

    await waitFor(() => {
      expect(result.current.bootstrapPhase).toBe('waiting-payload');
    });

    act(() => {
      payload = {
        items: [createItem(2)],
        hairColor: '#8B4513',
      };
    });
    rerender(undefined);

    await waitFor(() => {
      expect(mockSyncAvatar).toHaveBeenCalledTimes(1);
      expect(result.current.isInitialAvatarSynced).toBe(true);
      expect(result.current.bootstrapPhase).toBe('done');
    });
  });

  it('treats empty-items payload as synced when hairColor exists', async () => {
    let payload: InitialAvatarPayload = null;
    mockSyncAvatar.mockResolvedValue('empty');

    const { result, rerender } = renderHook(
      (_props: undefined) =>
        useUnityBootstrap({
          getInitialAvatarPayload: () => payload,
        }),
      { initialProps: undefined }
    );

    act(() => {
      readinessState.canSendMessage = true;
      readinessState.isReady = true;
    });
    rerender(undefined);

    await waitFor(() => {
      expect(result.current.bootstrapPhase).toBe('waiting-payload');
    });

    act(() => {
      payload = {
        items: [],
        hairColor: '#445566',
      };
    });
    rerender(undefined);

    await waitFor(() => {
      expect(mockSyncAvatar).toHaveBeenCalledTimes(1);
      expect(mockSyncAvatar).toHaveBeenCalledWith([], '#445566', { waitForReady: false });
      expect(result.current.isInitialAvatarSynced).toBe(true);
      expect(result.current.bootstrapPhase).toBe('done');
    });
  });

  it('re-syncs initial avatar after canSendMessage reconnect', async () => {
    const payload: InitialAvatarPayload = {
      items: [createItem(3)],
      hairColor: '#123456',
    };

    const { result, rerender } = renderHook(
      (_props: undefined) =>
        useUnityBootstrap({
          getInitialAvatarPayload: () => payload,
        }),
      { initialProps: undefined }
    );

    act(() => {
      readinessState.canSendMessage = true;
      readinessState.isReady = true;
    });
    rerender(undefined);

    await waitFor(() => {
      expect(mockSyncAvatar).toHaveBeenCalledTimes(1);
      expect(result.current.isInitialAvatarSynced).toBe(true);
    });

    act(() => {
      readinessState.canSendMessage = false;
      readinessState.isReady = false;
    });
    rerender(undefined);

    await waitFor(() => {
      expect(result.current.isInitialAvatarSynced).toBe(false);
      expect(result.current.bootstrapPhase).toBe('waiting-ready');
    });

    act(() => {
      readinessState.canSendMessage = true;
      readinessState.isReady = true;
    });
    rerender(undefined);

    await waitFor(() => {
      expect(mockSyncAvatar).toHaveBeenCalledTimes(2);
      expect(result.current.isInitialAvatarSynced).toBe(true);
    });
  });

  it('re-syncs avatar once when reattach ready event is received after initial sync', async () => {
    const payload: InitialAvatarPayload = {
      items: [createItem(31)],
      hairColor: '#112233',
    };

    const { result, rerender } = renderHook(
      (_props: undefined) =>
        useUnityBootstrap({
          getInitialAvatarPayload: () => payload,
        }),
      { initialProps: undefined }
    );

    act(() => {
      readinessState.canSendMessage = true;
      readinessState.isReady = true;
    });
    rerender(undefined);

    await waitFor(() => {
      expect(mockSyncAvatar).toHaveBeenCalledTimes(1);
      expect(result.current.isInitialAvatarSynced).toBe(true);
      expect(result.current.bootstrapPhase).toBe('done');
    });

    act(() => {
      result.current.handleUnityReady({ nativeEvent: { type: 'reattach', ready: true } });
    });

    await waitFor(() => {
      expect(mockSyncAvatar).toHaveBeenCalledTimes(2);
      expect(result.current.isInitialAvatarSynced).toBe(true);
      expect(result.current.bootstrapPhase).toBe('done');
    });
  });

  it('keeps initial sync state and retries when reattach re-sync fails', async () => {
    jest.useFakeTimers();
    const payload: InitialAvatarPayload = {
      items: [createItem(32)],
      hairColor: '#334455',
    };

    mockSyncAvatar
      .mockResolvedValueOnce('applied') // initial
      .mockResolvedValueOnce('failed')  // reattach first try
      .mockResolvedValueOnce('applied'); // retry

    const { result, rerender } = renderHook(
      (_props: undefined) =>
        useUnityBootstrap({
          getInitialAvatarPayload: () => payload,
        }),
      { initialProps: undefined }
    );

    act(() => {
      readinessState.canSendMessage = true;
      readinessState.isReady = true;
    });
    rerender(undefined);

    await waitFor(() => {
      expect(mockSyncAvatar).toHaveBeenCalledTimes(1);
      expect(result.current.isInitialAvatarSynced).toBe(true);
    });

    act(() => {
      result.current.handleUnityReady({ nativeEvent: { type: 'reattach', ready: true } });
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSyncAvatar).toHaveBeenCalledTimes(2);
    expect(result.current.isInitialAvatarSynced).toBe(true);
    expect(result.current.bootstrapPhase).toBe('done');

    await act(async () => {
      jest.advanceTimersByTime(301);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSyncAvatar).toHaveBeenCalledTimes(3);
    expect(result.current.isInitialAvatarSynced).toBe(true);
    expect(result.current.bootstrapPhase).toBe('done');
  });

  it('retries initial avatar sync until it succeeds', async () => {
    jest.useFakeTimers();
    const payload: InitialAvatarPayload = {
      items: [createItem(4)],
      hairColor: '#abcdef',
    };

    mockSyncAvatar
      .mockResolvedValueOnce('failed')
      .mockResolvedValueOnce('applied');

    const { result, rerender } = renderHook(
      (_props: undefined) =>
        useUnityBootstrap({
          getInitialAvatarPayload: () => payload,
        }),
      { initialProps: undefined }
    );

    act(() => {
      readinessState.canSendMessage = true;
      readinessState.isReady = true;
    });
    rerender(undefined);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSyncAvatar).toHaveBeenCalledTimes(1);
    expect(result.current.isInitialAvatarSynced).toBe(false);
    expect(result.current.bootstrapPhase).toBe('error');

    await act(async () => {
      jest.advanceTimersByTime(301);
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSyncAvatar).toHaveBeenCalledTimes(2);
    expect(result.current.isInitialAvatarSynced).toBe(true);
    expect(result.current.bootstrapPhase).toBe('done');
  });

  it('cancels scheduled retry when canSendMessage disconnects', async () => {
    jest.useFakeTimers();
    const payload: InitialAvatarPayload = {
      items: [createItem(5)],
      hairColor: '#fedcba',
    };

    mockSyncAvatar.mockResolvedValue('failed');

    const { result, rerender } = renderHook(
      (_props: undefined) =>
        useUnityBootstrap({
          getInitialAvatarPayload: () => payload,
        }),
      { initialProps: undefined }
    );

    act(() => {
      readinessState.canSendMessage = true;
      readinessState.isReady = true;
    });
    rerender(undefined);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSyncAvatar).toHaveBeenCalledTimes(1);
    expect(result.current.bootstrapPhase).toBe('error');

    act(() => {
      readinessState.canSendMessage = false;
      readinessState.isReady = false;
    });
    rerender(undefined);

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(mockSyncAvatar).toHaveBeenCalledTimes(1);
    expect(result.current.isInitialAvatarSynced).toBe(false);
    expect(result.current.bootstrapPhase).toBe('waiting-ready');
  });
});

describe('UnityView mount initialization', () => {
  const renderUnityViewWithSyncState = async (syncReadyStates: boolean | boolean[]) => {
    const sequence = Array.isArray(syncReadyStates) ? syncReadyStates : [syncReadyStates];
    const lastState = sequence.length > 0 ? sequence[sequence.length - 1] : false;

    mockSyncReadyState.mockReset();
    mockResetGameObjectReady.mockReset();
    sequence.forEach((state) => {
      mockSyncReadyState.mockResolvedValueOnce(state);
    });
    mockSyncReadyState.mockImplementation(() => Promise.resolve(lastState));
    mockResetGameObjectReady.mockResolvedValue(undefined);

    let renderer: any;
    let testRendererAct: ((callback: () => void | Promise<void>) => Promise<void>) | null = null;
    await jest.isolateModulesAsync(async () => {
      const React = require('react');
      const flattenStyle = (style: unknown): Record<string, unknown> => {
        if (Array.isArray(style)) {
          return style.reduce<Record<string, unknown>>((acc, current) => {
            if (current && typeof current === 'object') {
              return { ...acc, ...current };
            }
            return acc;
          }, {});
        }
        if (style && typeof style === 'object') {
          return style as Record<string, unknown>;
        }
        return {};
      };

      const MockNativeUnityView = React.forwardRef(function MockNativeUnityView(
        props: any,
        ref: any
      ) {
        return React.createElement('MockNativeUnityView', {
          ...props,
          ref,
          testID: 'mock-native-unity-view',
        });
      });

      jest.doMock('react-native', () => ({
        requireNativeComponent: () => MockNativeUnityView,
        StyleSheet: {
          create: (styles: Record<string, unknown>) => styles,
          flatten: (style: unknown) => flattenStyle(style),
        },
      }));

      const TestRenderer = require('react-test-renderer');
      testRendererAct = TestRenderer.act;
      const { UnityView } = require('../components/UnityView');

      await TestRenderer.act(async () => {
        renderer = TestRenderer.create(React.createElement(UnityView, {}));
        await Promise.resolve();
      });
    });

    const getNativeOpacity = () => {
      const nativeNode = renderer.root.findByProps({ testID: 'mock-native-unity-view' });
      const reactNativeModule = require('react-native');
      const flattenedStyle = reactNativeModule.StyleSheet.flatten(nativeNode.props.style);
      return flattenedStyle?.opacity;
    };

    const emitReadyEvent = async () => {
      const nativeNode = renderer.root.findByProps({ testID: 'mock-native-unity-view' });
      await testRendererAct?.(async () => {
        nativeNode.props.onUnityReady?.({ nativeEvent: { ready: true, type: 'reattach' } });
        await Promise.resolve();
      });
    };

    const unmount = async () => {
      await testRendererAct?.(async () => {
        renderer.unmount();
        await Promise.resolve();
      });
    };

    const flushFailsafe = async (ms: number) => {
      await testRendererAct?.(async () => {
        jest.advanceTimersByTime(ms);
        await Promise.resolve();
        await Promise.resolve();
      });
    };

    return {
      getNativeOpacity,
      emitReadyEvent,
      flushFailsafe,
      unmount,
    };
  };

  afterEach(() => {
    jest.resetModules();
    jest.dontMock('react-native');
  });

  it('does not reset ready state when initial sync is already ready', async () => {
    const view = await renderUnityViewWithSyncState(true);
    expect(mockSyncReadyState).toHaveBeenCalledTimes(1);
    expect(mockResetGameObjectReady).toHaveBeenCalledTimes(0);
    await view.unmount();
  });

  it('runs reset fallback when initial sync is not ready', async () => {
    const view = await renderUnityViewWithSyncState([false, false]);
    expect(mockSyncReadyState).toHaveBeenCalledTimes(2);
    expect(mockResetGameObjectReady).toHaveBeenCalledTimes(1);
    await view.unmount();
  });

  it('reveals unity surface immediately when initial sync is ready', async () => {
    const view = await renderUnityViewWithSyncState(true);

    expect(view.getNativeOpacity()).not.toBe(0);
    await view.unmount();
  });

  it('reveals unity surface via failsafe when ready event is missed', async () => {
    jest.useFakeTimers();
    const view = await renderUnityViewWithSyncState([false, false, true]);

    expect(view.getNativeOpacity()).toBe(0);

    await view.flushFailsafe(401);

    expect(view.getNativeOpacity()).not.toBe(0);
    await view.unmount();
  });
});

describe('UnityLoadingState', () => {
  it('hides placeholder when mounted with isLoading=false', () => {
    const { queryByText, getByTestId } = render(
      createElement(
        UnityLoadingState,
        { isLoading: false, variant: 'running', minDisplayTime: 300, fadeDuration: 0 },
        createElement(View, { testID: 'unity-content' })
      )
    );

    expect(getByTestId('unity-content')).toBeTruthy();
    expect(queryByText('캐릭터 로딩 중')).toBeNull();
  });

  it('removes placeholder after true->false loading transition', async () => {
    jest.useFakeTimers();

    const { queryByText, rerender } = render(
      createElement(
        UnityLoadingState,
        { isLoading: true, variant: 'running', minDisplayTime: 80, fadeDuration: 0 },
        createElement(View, { testID: 'unity-content' })
      )
    );

    expect(queryByText('캐릭터 로딩 중')).toBeTruthy();

    rerender(
      createElement(
        UnityLoadingState,
        { isLoading: false, variant: 'running', minDisplayTime: 80, fadeDuration: 0 },
        createElement(View, { testID: 'unity-content' })
      )
    );

    await act(async () => {
      jest.advanceTimersByTime(81);
      await Promise.resolve();
    });

    expect(queryByText('캐릭터 로딩 중')).toBeNull();
  });
});
