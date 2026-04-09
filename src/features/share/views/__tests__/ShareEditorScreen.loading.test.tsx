import React from 'react';
import { StyleSheet } from 'react-native';
import { screen, waitFor } from '@testing-library/react-native';
import type { ShareRunningData } from '~/features/share/models/types';
import { ShareEditorScreen } from '~/features/share/views/ShareEditorScreen';
import { renderWithProviders } from '~/test-utils/renderWithProviders';

const mockUseShareEditor = jest.fn();
const mockSetDummyLocations = jest.fn();
const mockSharePreviewCanvas = jest.fn();
const mockUseFocusEffect = jest.fn();
const mockSetActiveViewport = jest.fn();
const mockClearActiveViewport = jest.fn();

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
    }) => unknown
  ) =>
    selector({
      setActiveViewport: mockSetActiveViewport,
      clearActiveViewport: mockClearActiveViewport,
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

  it('renders the header inside a top-only safe-area container', () => {
    renderWithProviders(<ShareEditorScreen runningData={runningData} />);

    expect(StyleSheet.flatten(screen.getByTestId('share-editor-header-safe-area').props.style)).toMatchObject({
      backgroundColor: '#FFFFFF',
    });
    expect(screen.getByTestId('share-editor-header-safe-area').props.edges).toEqual(['top']);
    expect(screen.queryByTestId('share-editor-top-mask')).toBeNull();
  });
});
