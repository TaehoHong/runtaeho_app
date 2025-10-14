/**
 * 아이템 카드
 * SRP: 개별 아이템 표시만 담당
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import type { AvatarItem } from '~/features/avatar';
import {
  ItemStatus,
  ITEM_CARD_SIZE,
  AVATAR_COLORS,
  ITEM_OPACITY,
  GRID_LAYOUT,
} from '~/features/avatar';

interface Props {
  item: AvatarItem;
  isSelected: boolean;
  onPress: () => void;
}

const screenWidth = Dimensions.get('window').width;
const cardWidth =
  (screenWidth - GRID_LAYOUT.HORIZONTAL_PADDING * 2 - GRID_LAYOUT.ITEM_SPACING * 2) /
  GRID_LAYOUT.NUM_COLUMNS;

export const AvatarItemCard: React.FC<Props> = ({ item, isSelected, onPress }) => {
  // 테두리 색상 결정
  const borderColor = (() => {
    if (isSelected) {
      return AVATAR_COLORS.EQUIPPED_BORDER;
    }
    switch (item.status) {
      case ItemStatus.EQUIPPED:
        return AVATAR_COLORS.EQUIPPED_BORDER;
      case ItemStatus.OWNED:
        return AVATAR_COLORS.OWNED_BORDER;
      case ItemStatus.NOT_OWNED:
        return AVATAR_COLORS.NOT_OWNED_BORDER;
      default:
        return AVATAR_COLORS.OWNED_BORDER;
    }
  })();

  // 투명도 결정
  const opacity = item.status === ItemStatus.NOT_OWNED
    ? ITEM_OPACITY.NOT_OWNED
    : ITEM_OPACITY.OWNED;

  const borderWidth = isSelected
    ? ITEM_CARD_SIZE.SELECTED_BORDER_WIDTH
    : ITEM_CARD_SIZE.BORDER_WIDTH;

  const backgroundColor = isSelected
    ? AVATAR_COLORS.SELECTED_ITEM_BACKGROUND
    : AVATAR_COLORS.ITEM_BACKGROUND;

  return (
    <TouchableOpacity
      style={[styles.container, { width: cardWidth }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.card,
          {
            borderColor,
            borderWidth,
            backgroundColor,
            opacity,
          },
        ]}
      >
        {/* TODO: 아이템 이미지 표시 */}
        {/* <Image source={{ uri: item.filePath }} style={styles.image} /> */}

        {/* 가격 배지 (선택된 미보유 아이템만) */}
        {isSelected && item.status === ItemStatus.NOT_OWNED && item.price && (
          <View style={styles.priceBadge}>
            <View style={styles.priceIcon} />
            <Text style={styles.priceText}>{item.price}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: GRID_LAYOUT.ITEM_SPACING,
  },
  card: {
    aspectRatio: 1,
    borderRadius: ITEM_CARD_SIZE.BORDER_RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: '80%',
    height: '80%',
    resizeMode: 'contain',
  },
  priceBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  priceIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: AVATAR_COLORS.POINT_ICON,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: AVATAR_COLORS.PRIMARY_TEXT,
  },
});
