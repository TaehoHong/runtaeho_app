import React from 'react';
import { Alert, StyleSheet } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { ShareRunningData } from '~/features/share/models/types';
import { ShareEditorScreen } from '~/features/share/views/ShareEditorScreen';
import { renderWithProviders } from '~/test-utils/renderWithProviders';

const mockUseShareEditor = jest.fn();
const mockSetShareData = jest.fn();
const mockSharePreviewCanvas = jest.fn();
const mockUseFocusEffect = jest.fn();
const mockSetActiveViewport = jest.fn();
const mockClearActiveViewport = jest.fn();
const mockEndEntryTransition = jest.fn();
let mockCurrentUser: { id: number } | null = null;

jest.mock('~/features/share/viewmodels/useShareEditor', () => ({
  useShareEditor: (...args: unknown[]) => mockUseShareEditor(...args),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (...args: unknown[]) => mockUseFocusEffect(...args),
}));

jest.mock('~/features/share/stores/shareStore', () => ({
  useShareStore: (
    selector: (state: {
      setShareData: typeof mockSetShareData;
    }) => unknown
  ) => selector({
    setShareData: mockSetShareData,
  }),
}));

jest.mock('~/stores/user', () => ({
  useUserStore: (selector: (state: { currentUser: typeof mockCurrentUser }) => unknown) =>
    selector({ currentUser: mockCurrentUser }),
}));

jest.mock('~/stores/unity/unityStore', () => ({
  useUnityStore: (
    selector: (state: {
      setActiveViewport: typeof mockSetActiveViewport;
      clearActiveViewport: typeof mockClearActiveViewport;
    }) => unknown
  ) =>
    selector({
      setActiveViewport: mockSetActiveViewport,
      clearActiveViewport: mockClearActiveViewport,
    }),
}));

jest.mock('~/features/share/stores/shareEntryTransitionStore', () => ({
  useShareEntryTransitionStore: (
    selector: (state: { endEntryTransition: typeof mockEndEntryTransition }) => unknown
  ) => selector({
    endEntryTransition: mockEndEntryTransition,
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('~/features/share/views/components', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockSharePreviewCanvas = React.forwardRef(
    function MockSharePreviewCanvas(props: unknown, _ref: unknown) {
      mockSharePreviewCanvas(props);
      React.useImperativeHandle(_ref, () => ({
        measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) =>
          callback(0, 0, 280, 350),
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
    ShareActions: () => React.createElement(View, { testID: 'share-actions' }),
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

describe('ShareEditorScreen loading behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = null;

    mockUseShareEditor.mockReturnValue({
      canvasRef: { current: null },
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
      isLoading: true,
      isCapturing: false,
      isUnityReady: false,
      characterTransform: { x: 0.5, y: 0.9, scale: 1 },
      avatarVisible: true,
      animationTime: 0,
      setSelectedBackground: jest.fn(),
      setSelectedPose: jest.fn(),
      updateStatTransform: jest.fn(),
      toggleStatVisibility: jest.fn(),
      toggleAvatarVisibility: jest.fn(),
      shareResult: jest.fn(),
      resetAll: jest.fn().mockResolvedValue(undefined),
      restoreRunningResultDefaults: jest.fn().mockResolvedValue(undefined),
      updateCharacterPosition: jest.fn(),
      updateCharacterScale: jest.fn(),
      setAnimationTime: jest.fn(),
    });

    mockUseFocusEffect.mockImplementation((callback: () => void | (() => void)) => {
      callback();
    });
  });

  it('keeps SharePreviewCanvas mounted while loading', async () => {
    renderWithProviders(<ShareEditorScreen runningData={runningData} />);

    expect(screen.getByTestId('share-preview-canvas')).toBeTruthy();
    expect(screen.getByText('캐릭터 준비 중...')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('share-editor-root').props.style)).toMatchObject({
      backgroundColor: 'transparent',
    });
    expect(StyleSheet.flatten(screen.getByTestId('share-editor-scroll').props.style)).toMatchObject({
      backgroundColor: 'transparent',
    });
    expect(mockSharePreviewCanvas).toHaveBeenCalledWith(
      expect.objectContaining({
        avatarVisible: true,
        characterTransform: { x: 0.5, y: 0.9, scale: 1 },
      })
    );
    expect(mockSharePreviewCanvas.mock.calls[0]?.[0]?.cornerRadius).toBe(16);
    await waitFor(() => {
      expect(mockSetActiveViewport).toHaveBeenCalledWith(expect.objectContaining({
        borderRadius: 16,
      }));
    });
    expect(screen.queryByTestId('pose-selector')).toBeNull();
    expect(screen.queryByTestId('share-actions')).toBeNull();
  });

  it('ends the root entry transition after the editor root lays out', async () => {
    renderWithProviders(<ShareEditorScreen runningData={runningData} />);

    fireEvent(screen.getByTestId('share-editor-root'), 'layout', {
      nativeEvent: {
        layout: { x: 0, y: 0, width: 320, height: 640 },
      },
    });

    await waitFor(() => {
      expect(mockEndEntryTransition).toHaveBeenCalledTimes(1);
    });
  });

  it('renders the share controls once the editor becomes ready', async () => {
    mockUseShareEditor.mockReturnValue({
      canvasRef: { current: null },
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
      shareResult: jest.fn(),
      resetAll: jest.fn().mockResolvedValue(undefined),
      restoreRunningResultDefaults: jest.fn().mockResolvedValue(undefined),
      updateCharacterPosition: jest.fn(),
      updateCharacterScale: jest.fn(),
      setAnimationTime: jest.fn(),
    });

    renderWithProviders(<ShareEditorScreen runningData={runningData} />);
    expect(screen.getByTestId('pose-selector')).toBeTruthy();
    expect(screen.getByTestId('share-actions')).toBeTruthy();
  });

  it('renders the header inside a top-only safe-area container', () => {
    renderWithProviders(<ShareEditorScreen runningData={runningData} />);

    expect(StyleSheet.flatten(screen.getByTestId('share-editor-header-safe-area').props.style)).toMatchObject({
      backgroundColor: '#FFFFFF',
    });
    expect(screen.getByTestId('share-editor-header-safe-area').props.edges).toEqual(['top']);
    expect(screen.queryByTestId('share-editor-top-mask')).toBeNull();
  });

  it('disables iOS automatic scroll inset adjustment for the preview scroll view', () => {
    renderWithProviders(<ShareEditorScreen runningData={runningData} />);

    const scrollView = screen.getByTestId('share-editor-scroll');
    expect(scrollView.props.automaticallyAdjustContentInsets).toBe(false);
    expect(scrollView.props.automaticallyAdjustsScrollIndicatorInsets).toBe(false);
    expect(scrollView.props.contentInsetAdjustmentBehavior).toBe('never');
  });

  it('shows the dummy button only for user 1 and seeds Yeouido dummy share data', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    mockCurrentUser = { id: 1 };

    renderWithProviders(<ShareEditorScreen runningData={runningData} />);

    fireEvent.press(screen.getByTestId('share-editor-add-dummy-button'));

    expect(mockSetShareData).toHaveBeenCalledWith(expect.objectContaining({
      distance: 6520,
      durationSec: 2300,
      pace: '05:53',
      earnedPoints: 65,
      locations: expect.arrayContaining([
        expect.objectContaining({
          latitude: 37.52682,
          longitude: 126.92978,
        }),
      ]),
    }));
    expect(alertSpy).toHaveBeenCalledWith(
      '더미 데이터 추가됨',
      '6.52km / 38:20 / 여의도 한강공원 경로를 적용했습니다.'
    );

    alertSpy.mockRestore();
  });
});
