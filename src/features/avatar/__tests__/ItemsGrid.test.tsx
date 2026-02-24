import React from 'react';
import { screen } from '@testing-library/react-native';
import { FlatList } from 'react-native';
import type { Item } from '~/features/avatar/models/Item';
import { ItemsGrid } from '~/features/avatar/views/components/ItemsGrid';
import { renderWithProviders } from '~/test-utils/renderWithProviders';

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
    isOwned: false,
  };
}

describe('ItemsGrid', () => {
  it('renders FlatList with 4 columns', () => {
    renderWithProviders(
      <ItemsGrid
        items={[createItem(1)]}
        hairColor="#1A1A1A"
        onSelectItem={jest.fn()}
        isItemSelected={() => false}
        onEndReached={jest.fn()}
      />
    );

    const list = screen.UNSAFE_getByType(FlatList);
    expect(list.props.numColumns).toBe(4);
  });
});
