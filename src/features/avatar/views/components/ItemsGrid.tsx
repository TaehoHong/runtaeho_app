/**
 * 아이템 그리드
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
  header?: React.ReactElement | null;
  footer?: React.ReactElement | null;
}

export const ItemsGrid: React.FC<Props> = ({
  items,
  hairColor,
  onSelectItem,
  isItemSelected,
  onEndReached,
  header,
  footer,
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
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      showsVerticalScrollIndicator
      style={styles.grid}
    />
  );
};

const styles = StyleSheet.create({
  grid: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    paddingHorizontal: GRID_LAYOUT.HORIZONTAL_PADDING,
    paddingTop: 8,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
});
