import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import type { EquippedItemsMap, Item } from '~/features/avatar';
import { AvatarPreview } from '~/features/avatar/views/components/AvatarPreview';
import { renderWithProviders } from '~/test-utils/renderWithProviders';
import type { RenderedUnityViewport, UnityViewport } from '~/stores/unity/unityStore';

const mockSyncAvatar = jest.fn<Promise<'applied' | 'empty' | 'failed'>, [Item[], string]>();
const mockUseUnityBootstrap = jest.fn();
const mockUseFocusEffect = jest.fn();
const mockSetActiveViewport = jest.fn();
const mockClearActiveViewport = jest.fn();
const mockUnityLoadingState = jest.fn();
let mockIsSurfaceVisible = true;
let mockActiveViewport: UnityViewport | null;
let mockRenderedViewport: RenderedUnityViewport | null;
const originalRequestAnimationFrame = global.requestAnimationFrame;

jest.mock('~/features/unity/services/UnityService', () => ({
  unityService: {
    syncAvatar: (items: Item[], hairColor: string) => mockSyncAvatar(items, hairColor),
  },
}));

jest.mock('~/features/unity/hooks', () => ({
  useUnityBootstrap: (...args: unknown[]) => mockUseUnityBootstrap(...args),
}));

jest.mock('expo-router/react-navigation', () => ({
  useFocusEffect: (...args: unknown[]) => mockUseFocusEffect(...args),
}));

jest.mock('~/stores/unity/unityStore', () => ({
  useUnityStore: (
    selector: (state: {
      setActiveViewport: typeof mockSetActiveViewport;
      clearActiveViewport: typeof mockClearActiveViewport;
      isSurfaceVisible: boolean;
      activeViewport: UnityViewport | null;
      renderedViewport: RenderedUnityViewport | null;
    }) => unknown
  ) =>
    selector({
      setActiveViewport: mockSetActiveViewport,
      clearActiveViewport: mockClearActiveViewport,
      isSurfaceVisible: mockIsSurfaceVisible,
      activeViewport: mockActiveViewport,
      renderedViewport: mockRenderedViewport,
    }),
}));

jest.mock('~/features/unity/components/UnityLoadingState', () => ({
  UnityLoadingState: (props: { children?: React.ReactNode; isLoading: boolean }) => {
    mockUnityLoadingState(props);
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, null, props.children);
  },
}));

function createHairItem(id: number): Item {
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

describe('AvatarPreview initial sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSurfaceVisible = true;
    mockActiveViewport = { owner: 'avatar', frame: { x: 20, y: 100, width: 300, height: 300 } };
    mockRenderedViewport = { ...mockActiveViewport };
    global.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    }) as typeof requestAnimationFrame;
    mockSyncAvatar.mockResolvedValue('applied');
    mockUseUnityBootstrap.mockReturnValue({
      canSendMessage: true,
      isInitialAvatarSynced: true,
      isUnityStarted: true,
    });
    mockUseFocusEffect.mockImplementation((callback: () => void | (() => void)) => {
      callback();
    });
  });

  afterAll(() => {
    global.requestAnimationFrame = originalRequestAnimationFrame;
  });

  it('syncs only changed payload after initial bootstrap sync is complete', async () => {
    const equippedItems: EquippedItemsMap = {
      1: createHairItem(1),
    };

    const { rerender } = renderWithProviders(
      <AvatarPreview equippedItems={equippedItems} hairColor="#000000" />
    );

    expect(screen.getByTestId('avatar-preview-viewport')).toBeTruthy();
    expect(mockSyncAvatar).toHaveBeenCalledTimes(0);

    rerender(<AvatarPreview equippedItems={equippedItems} hairColor="#000000" />);

    expect(mockSyncAvatar).toHaveBeenCalledTimes(0);

    rerender(<AvatarPreview equippedItems={equippedItems} hairColor="#8B4513" />);

    await waitFor(() => {
      expect(mockSyncAvatar).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps the loading placeholder active until the Unity surface is visible', () => {
    mockIsSurfaceVisible = false;

    renderWithProviders(
      <AvatarPreview equippedItems={{ 1: createHairItem(1) }} hairColor="#000000" />
    );

    const lastCall =
      mockUnityLoadingState.mock.calls[mockUnityLoadingState.mock.calls.length - 1]?.[0];

    expect(lastCall?.isLoading).toBe(true);
  });

  it('keeps the placeholder until this avatar viewport is rendered, even if Unity is already ready', () => {
    mockActiveViewport = { owner: 'running', frame: { x: 0, y: 0, width: 400, height: 400 } };
    mockRenderedViewport = { ...mockActiveViewport };
    const props = { equippedItems: { 1: createHairItem(1) }, hairColor: '#000000' };
    const { rerender } = renderWithProviders(<AvatarPreview {...props} />);
    expect(mockUnityLoadingState.mock.lastCall?.[0].isLoading).toBe(true);

    mockActiveViewport = { owner: 'avatar', frame: { x: 20, y: 100, width: 300, height: 300 } };
    mockRenderedViewport = null;
    rerender(<AvatarPreview {...props} />);
    expect(mockUnityLoadingState.mock.lastCall?.[0].isLoading).toBe(true);

    mockRenderedViewport = { ...mockActiveViewport };
    rerender(<AvatarPreview {...props} />);
    expect(mockUnityLoadingState.mock.lastCall?.[0].isLoading).toBe(false);
  });
});
