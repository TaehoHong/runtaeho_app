import React from 'react';
import { Alert, StyleSheet } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { ShareRunningData } from '~/features/share/models/types';
import { ShareEditorScreen } from '~/features/share/views/ShareEditorScreen';
import { GREY } from '~/shared/styles';
import { routerMock } from '~/test-utils/mocks/native';
import { renderWithProviders } from '~/test-utils/renderWithProviders';

const mockUseShareEditor = jest.fn();
const mockSetDummyLocations = jest.fn();
const mockResetAll = jest.fn();
const mockRestoreRunningResultDefaults = jest.fn();
const mockShareResult = jest.fn();
const mockSharePreviewCanvas = jest.fn();
const mockUseFocusEffect = jest.fn();
const mockSetActiveViewport = jest.fn();
const mockClearActiveViewport = jest.fn();
const mockUnityStoreState = {
  setActiveViewport: mockSetActiveViewport,
  clearActiveViewport: mockClearActiveViewport,
  renderedViewport: null as null | {
    owner: 'share';
    frame: { x: number; y: number; width: number; height: number };
  },
};
let mockCanvasRef: { current: null };
let alertSpy: jest.SpyInstance;

jest.mock('~/features/share/viewmodels/useShareEditor', () => ({
  useShareEditor: (...args: unknown[]) => mockUseShareEditor(...args),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (...args: unknown[]) => mockUseFocusEffect(...args),
}));

jest.mock('~/features/share/stores/shareStore', () => ({
  useShareStore: (
    selector: (state: { setDummyLocations: typeof mockSetDummyLocations; shareData: null }) => unknown
  ) => selector({ setDummyLocations: mockSetDummyLocations, shareData: null }),
}));

jest.mock('~/stores/user', () => ({
  useUserStore: (selector: (state: { currentUser: null }) => unknown) =>
    selector({ currentUser: null }),
}));

jest.mock('~/stores/unity/unityStore', () => ({
  useUnityStore: (
    selector: (state: {
      setActiveViewport: typeof mockSetActiveViewport;
      clearActiveViewport: typeof mockClearActiveViewport;
      renderedViewport: typeof mockUnityStoreState.renderedViewport;
    }) => unknown
  ) =>
    selector(mockUnityStoreState),
}));

(useUnityStore => {
  (useUnityStore as typeof useUnityStore & {
    getState?: () => typeof mockUnityStoreState;
  }).getState = () => mockUnityStoreState;
})(require('~/stores/unity/unityStore').useUnityStore);

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('~/features/share/views/components', () => {
  const React = require('react');
  const { TouchableOpacity, View } = require('react-native');
  const MockSharePreviewCanvas = React.forwardRef(
    function MockSharePreviewCanvas(
      props: { interactive?: boolean; containerPadding?: boolean } | undefined,
      ref: unknown
    ) {
      mockSharePreviewCanvas(props);
      React.useImperativeHandle(ref, () => ({
        measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => {
          if (props?.interactive === false && props?.containerPadding === false) {
            callback(16, 412, 280, 350);
            return;
          }

          callback(16, 115, 280, 350);
        },
      }));
      return React.createElement(View, { testID: 'share-preview-canvas' });
    }
  );

  return {
    SharePreviewCanvas: MockSharePreviewCanvas,
    PoseSelector: () => React.createElement(View, { testID: 'pose-selector' }),
    StatVisibilityToggle: () => React.createElement(View, { testID: 'stat-visibility-toggle' }),
    BackgroundSelector: () => React.createElement(View, { testID: 'background-selector' }),
    ShareEditorTestTools: () => React.createElement(View, { testID: 'share-editor-test-tools' }),
    ShareActions: ({ onShare, onCancel }: { onShare: () => void; onCancel: () => void }) =>
      React.createElement(
        View,
        { testID: 'share-actions' },
        React.createElement(TouchableOpacity, { testID: 'action-share', onPress: onShare }),
        React.createElement(TouchableOpacity, { testID: 'action-cancel', onPress: onCancel })
      ),
  };
});

const runningData: ShareRunningData = {
  distance: 5000,
  durationSec: 1500,
  pace: '5:00',
  startTimestamp: '2026-02-24T00:00:00.000Z',
  earnedPoints: 50,
  locations: [],
};

describe('ShareEditorScreen exit behavior', () => {
  const getEditorShell = () => screen.UNSAFE_getByProps({ testID: 'share-editor-shell' });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCanvasRef = { current: null };
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    mockUnityStoreState.renderedViewport = null;

    mockResetAll.mockResolvedValue(undefined);
    mockRestoreRunningResultDefaults.mockResolvedValue(undefined);
    mockShareResult.mockResolvedValue({ success: false, message: '' });

    mockUseShareEditor.mockReturnValue({
      canvasRef: mockCanvasRef,
      selectedBackground: {
        id: 'bg-default',
        name: '기본',
        source: 'river',
        type: 'unity',
        unityBackgroundId: 'river',
      },
      selectedPose: {
        id: 'pose-idle',
        name: '기본',
        trigger: 'IDLE',
        icon: 'walk',
      },
      statElements: [],
      isLoading: false,
      isCapturing: false,
      isUnityReady: true,
      characterTransform: { x: 0.5, y: 0.9, scale: 1 },
      avatarVisible: true,
      animationTime: 0,
      setSelectedBackground: jest.fn(),
      setSelectedPose: jest.fn(),
      updateStatTransform: jest.fn(),
      toggleStatVisibility: jest.fn(),
      toggleAvatarVisibility: jest.fn(),
      shareResult: (...args: unknown[]) => mockShareResult(...args),
      resetAll: (...args: unknown[]) => mockResetAll(...args),
      restoreRunningResultDefaults: (...args: unknown[]) => mockRestoreRunningResultDefaults(...args),
      updateCharacterPosition: jest.fn(),
      updateCharacterScale: jest.fn(),
      setAnimationTime: jest.fn(),
    });

    mockUseFocusEffect.mockImplementation((callback: () => void | (() => void)) => {
      callback();
    });
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('restores running result defaults before navigating back on close', async () => {
    renderWithProviders(<ShareEditorScreen runningData={runningData} />);

    expect(mockSharePreviewCanvas).toHaveBeenCalledWith(
      expect.objectContaining({
        avatarVisible: true,
        characterTransform: { x: 0.5, y: 0.9, scale: 1 },
      })
    );
    expect(mockSharePreviewCanvas.mock.calls[0]?.[0]?.cornerRadius).toBe(16);

    fireEvent.press(screen.getByTestId('share-editor-close-button'));

    await waitFor(() => {
      expect(mockRestoreRunningResultDefaults).toHaveBeenCalledTimes(1);
    });

    expect(mockResetAll).toHaveBeenCalledWith({ syncUnity: false });
    expect(routerMock.back).toHaveBeenCalledTimes(1);

    const restoreCallOrder = mockRestoreRunningResultDefaults.mock.invocationCallOrder[0] ?? 0;
    const resetCallOrder = mockResetAll.mock.invocationCallOrder[0] ?? 0;
    const backCallOrder = routerMock.back.mock.invocationCallOrder[0] ?? 0;

    expect(restoreCallOrder).toBeGreaterThan(0);
    expect(resetCallOrder).toBeGreaterThan(restoreCallOrder);
    expect(backCallOrder).toBeGreaterThan(resetCallOrder);
  });

  it('restores running result defaults before navigating back on successful share', async () => {
    mockShareResult.mockResolvedValue({ success: true, message: undefined });

    renderWithProviders(<ShareEditorScreen runningData={runningData} />);
    await waitFor(() => {
      expect(mockSetActiveViewport).toHaveBeenCalledWith(expect.objectContaining({
        borderRadius: 16,
      }));
    });
    mockSetActiveViewport.mockClear();

    fireEvent.press(screen.getByTestId('action-share'));
    await waitFor(() => {
      expect(screen.getByTestId('share-export-surface')).toBeTruthy();
    });
    expect(screen.getByTestId('share-export-loader')).toBeTruthy();
    expect(StyleSheet.flatten(getEditorShell().props.style)).toMatchObject({
      display: 'none',
    });
    expect(StyleSheet.flatten(screen.getByTestId('share-export-top-mask').props.style)).toMatchObject({
      backgroundColor: GREY.WHITE,
    });
    expect(mockSharePreviewCanvas).toHaveBeenLastCalledWith(
      expect.objectContaining({
        interactive: false,
        containerPadding: false,
        cornerRadius: 0,
      })
    );

    fireEvent(screen.getByTestId('share-export-stage-container'), 'layout', {
      nativeEvent: {
        layout: { x: 0, y: 0, width: 280, height: 350 },
      },
    });
    mockUnityStoreState.renderedViewport = {
      owner: 'share',
      frame: { x: 16, y: 115, width: 280, height: 350 },
    };
    setTimeout(() => {
      mockUnityStoreState.renderedViewport = {
        owner: 'share',
        frame: { x: 16, y: 412, width: 280, height: 350 },
      };
    }, 0);

    await waitFor(() => {
      expect(mockShareResult).toHaveBeenCalledTimes(1);
    });
    expect(mockShareResult.mock.calls[0]?.[0]).not.toBe(mockCanvasRef);
    expect(mockShareResult.mock.calls[0]?.[1]).toEqual({
      x: 16,
      y: 412,
      width: 280,
      height: 350,
    });
    expect(mockShareResult.mock.calls[0]?.[2]).toBeUndefined();
    expect(mockSetActiveViewport).toHaveBeenCalledWith(expect.objectContaining({
      borderRadius: 0,
    }));

    await waitFor(() => {
      expect(mockRestoreRunningResultDefaults).toHaveBeenCalledTimes(1);
    });

    expect(routerMock.back).toHaveBeenCalledTimes(1);
    expect(mockResetAll).toHaveBeenCalledWith({ syncUnity: false });
    await waitFor(() => {
      expect(screen.queryByTestId('share-export-surface')).toBeNull();
    });

    const restoreCallOrder = mockRestoreRunningResultDefaults.mock.invocationCallOrder[0] ?? 0;
    const resetCallOrder = mockResetAll.mock.invocationCallOrder[0] ?? 0;
    const backCallOrder = routerMock.back.mock.invocationCallOrder[0] ?? 0;

    expect(restoreCallOrder).toBeGreaterThan(0);
    expect(resetCallOrder).toBeGreaterThan(restoreCallOrder);
    expect(backCallOrder).toBeGreaterThan(resetCallOrder);
  });

  it('restores the editor after a canceled share without navigating', async () => {
    mockShareResult.mockResolvedValue({ success: false, message: '공유가 취소되었습니다.' });

    renderWithProviders(<ShareEditorScreen runningData={runningData} />);

    fireEvent.press(screen.getByTestId('action-share'));
    await waitFor(() => {
      expect(screen.getByTestId('share-export-surface')).toBeTruthy();
    });
    expect(screen.getByTestId('share-export-loader')).toBeTruthy();
    expect(StyleSheet.flatten(getEditorShell().props.style)).toMatchObject({
      display: 'none',
    });

    fireEvent(screen.getByTestId('share-export-stage-container'), 'layout', {
      nativeEvent: {
        layout: { x: 0, y: 0, width: 280, height: 350 },
      },
    });
    mockUnityStoreState.renderedViewport = {
      owner: 'share',
      frame: { x: 16, y: 412, width: 280, height: 350 },
    };

    await waitFor(() => {
      expect(mockShareResult).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.queryByTestId('share-export-surface')).toBeNull();
    });

    expect(routerMock.back).not.toHaveBeenCalled();
    expect(mockRestoreRunningResultDefaults).not.toHaveBeenCalled();
    expect(StyleSheet.flatten(getEditorShell().props.style)).not.toMatchObject({
      display: 'none',
    });
    expect(screen.getByTestId('share-preview-canvas')).toBeTruthy();
    expect(screen.getByTestId('share-actions')).toBeTruthy();
  });

  it('stays on the editor and alerts when close restore fails', async () => {
    mockRestoreRunningResultDefaults.mockRejectedValue(new Error('restore failed'));

    renderWithProviders(<ShareEditorScreen runningData={runningData} />);

    fireEvent.press(screen.getByTestId('share-editor-close-button'));

    await waitFor(() => {
      expect(mockRestoreRunningResultDefaults).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        '복원 실패',
        '러닝 결과 화면 복원에 실패했습니다. 다시 시도해주세요.'
      );
    });

    expect(mockResetAll).not.toHaveBeenCalled();
    expect(routerMock.back).not.toHaveBeenCalled();
  });

  it('stays on the editor and alerts when restore fails after a successful share', async () => {
    mockShareResult.mockResolvedValue({ success: true, message: undefined });
    mockRestoreRunningResultDefaults.mockRejectedValue(new Error('restore failed'));

    renderWithProviders(<ShareEditorScreen runningData={runningData} />);

    fireEvent.press(screen.getByTestId('action-share'));
    await waitFor(() => {
      expect(screen.getByTestId('share-export-surface')).toBeTruthy();
    });

    fireEvent(screen.getByTestId('share-export-stage-container'), 'layout', {
      nativeEvent: {
        layout: { x: 0, y: 0, width: 280, height: 350 },
      },
    });
    mockUnityStoreState.renderedViewport = {
      owner: 'share',
      frame: { x: 16, y: 412, width: 280, height: 350 },
    };

    await waitFor(() => {
      expect(mockShareResult).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        '복원 실패',
        '러닝 결과 화면 복원에 실패했습니다. 다시 시도해주세요.'
      );
    });

    expect(mockRestoreRunningResultDefaults).toHaveBeenCalledTimes(1);
    expect(mockResetAll).not.toHaveBeenCalled();
    expect(routerMock.back).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByTestId('share-export-surface')).toBeNull();
    });
  });
});
