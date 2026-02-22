/**
 * 아이템 그리드 (3열)
 * SRP: 아이템 리스트 렌더링만 담당
 */

import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import type { Item } from '~/features/avatar';
import { GRID_LAYOUT } from '~/features/avatar';
import { AvatarItemCard } from './ItemCard';

interface Props {
  items: readonly Item[];
  hairColor: string;
  onSelectItem: (item: Item) => void;
  isItemSelected: (itemId: number) => boolean;
  onEndReached: () => void;
}

export const ItemsGrid: React.FC<Props> = ({
  items,
  hairColor,
  onSelectItem,
  isItemSelected,
  onEndReached,
}) => {
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => `item-${item.id}`}
      numColumns={GRID_LAYOUT.NUM_COLUMNS}
      renderItem={({ item }) => (
        <AvatarItemCard
          item={item}
          hairColor={hairColor}
          isSelected={isItemSelected(item.id)}
          onPress={() => onSelectItem(item)}
        />
      )}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      scrollEnabled={false} // ScrollView 안에 있으므로 비활성화
      style={styles.grid}
    />
  );
};

const styles = StyleSheet.create({
  grid: {
    marginTop: 18,
  },
  content: {
    paddingBottom: 10,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: GRID_LAYOUT.ITEM_SPACING,
  },
});
