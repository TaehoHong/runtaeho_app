import React from 'react';
import { screen } from '@testing-library/react-native';
import { Dimensions, StyleSheet, TouchableOpacity } from 'react-native';
import type { Item } from '~/features/avatar/models/Item';
import { GRID_LAYOUT } from '~/features/avatar/models/avatarConstants';
import { AvatarItemCard } from '~/features/avatar/views/components/ItemCard';
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

describe('AvatarItemCard layout', () => {
  it('calculates card width from columns and spacing', () => {
    renderWithProviders(
      <AvatarItemCard
        item={createItem(1)}
        hairColor="#1A1A1A"
        isSelected={false}
        onPress={jest.fn()}
      />
    );

    const card = screen.UNSAFE_getByType(TouchableOpacity);
    const style = StyleSheet.flatten(card.props.style) as { width: number };
    const expectedWidth = (
      Dimensions.get('window').width
      - GRID_LAYOUT.HORIZONTAL_PADDING * 2
      - GRID_LAYOUT.ITEM_SPACING * (GRID_LAYOUT.NUM_COLUMNS - 1)
    ) / GRID_LAYOUT.NUM_COLUMNS;

    expect(style.width).toBeCloseTo(expectedWidth);
  });
});
