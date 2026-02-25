import React from 'react';
import { waitFor } from '@testing-library/react-native';
import type { EquippedItemsMap, Item } from '~/features/avatar';
import { AvatarPreview } from '~/features/avatar/views/components/AvatarPreview';
import { renderWithProviders } from '~/test-utils/renderWithProviders';

const mockSyncAvatar = jest.fn<Promise<'applied' | 'empty' | 'failed'>, [Item[], string]>();
const mockUseUnityBootstrap = jest.fn();

jest.mock('~/features/unity/services/UnityService', () => ({
  unityService: {
    syncAvatar: (items: Item[], hairColor: string) => mockSyncAvatar(items, hairColor),
  },
}));

jest.mock('~/features/unity/hooks', () => ({
  useUnityBootstrap: (...args: unknown[]) => mockUseUnityBootstrap(...args),
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
    mockSyncAvatar.mockResolvedValue('applied');
    mockUseUnityBootstrap.mockReturnValue({
      handleUnityReady: jest.fn(),
      canSendMessage: true,
      isInitialAvatarSynced: true,
    });
  });

  it('syncs only changed payload after initial bootstrap sync is complete', async () => {
    const equippedItems: EquippedItemsMap = {
      1: createHairItem(1),
    };

    const { rerender } = renderWithProviders(
      <AvatarPreview equippedItems={equippedItems} hairColor="#000000" />
    );

    expect(mockSyncAvatar).toHaveBeenCalledTimes(0);

    rerender(<AvatarPreview equippedItems={equippedItems} hairColor="#000000" />);

    expect(mockSyncAvatar).toHaveBeenCalledTimes(0);

    rerender(<AvatarPreview equippedItems={equippedItems} hairColor="#8B4513" />);

    await waitFor(() => {
      expect(mockSyncAvatar).toHaveBeenCalledTimes(1);
    });
  });
});
