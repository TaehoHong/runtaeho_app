import React from 'react';
import { waitFor } from '@testing-library/react-native';
import type { EquippedItemsMap, Item } from '~/features/avatar';
import { AvatarPreview } from '~/features/avatar/views/components/AvatarPreview';
import { renderWithProviders } from '~/test-utils/renderWithProviders';

const mockChangeAvatar = jest.fn<Promise<void>, [Item[], string]>();
const mockUseUnityReadiness = jest.fn();
const mockSetAvatarReady = jest.fn();

jest.mock('~/features/unity/services/UnityService', () => ({
  unityService: {
    changeAvatar: (items: Item[], hairColor: string) => mockChangeAvatar(items, hairColor),
    onReady: jest.fn(() => jest.fn()),
  },
}));

jest.mock('~/features/unity/hooks', () => ({
  useUnityReadiness: (...args: unknown[]) => mockUseUnityReadiness(...args),
}));

jest.mock('~/stores/unity/unityStore', () => ({
  useUnityStore: (selector: (state: { setAvatarReady: (ready: boolean) => void }) => unknown) =>
    selector({ setAvatarReady: mockSetAvatarReady }),
}));

jest.mock('~/features/unity/components/UnityView', () => ({
  UnityView: () => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'mock-unity-view' });
  },
}));

jest.mock('~/features/unity/components/UnityLoadingState', () => ({
  UnityLoadingState: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, null, children);
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
    mockChangeAvatar.mockResolvedValue(undefined);
    mockUseUnityReadiness.mockReturnValue({
      handleUnityReady: jest.fn(),
      canSendMessage: true,
    });
  });

  it('does not skip first sync before onReady initial sync completion', async () => {
    const equippedItems: EquippedItemsMap = {
      1: createHairItem(1),
    };

    const { rerender } = renderWithProviders(
      <AvatarPreview equippedItems={equippedItems} hairColor="#000000" />
    );

    await waitFor(() => {
      expect(mockChangeAvatar).toHaveBeenCalledTimes(1);
    });

    rerender(<AvatarPreview equippedItems={equippedItems} hairColor="#000000" />);

    await waitFor(() => {
      expect(mockChangeAvatar).toHaveBeenCalledTimes(1);
    });

    rerender(<AvatarPreview equippedItems={equippedItems} hairColor="#8B4513" />);

    await waitFor(() => {
      expect(mockChangeAvatar).toHaveBeenCalledTimes(2);
    });
  });
});
