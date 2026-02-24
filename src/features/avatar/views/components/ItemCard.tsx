/**
 * 아이템 카드
 * SRP: 개별 아이템 표시만 담당
 */

import React from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Item } from '~/features/avatar';
import { GRID_LAYOUT, ITEM_OPACITY, ItemStatus } from '~/features/avatar';
import { resolveAvatarItemImage } from '~/features/avatar/utils/avatarItemImageResolver';
import { Icon } from '~/shared/components/ui';
import { GREY, PRIMARY } from '~/shared/styles';

interface Props {
  item: Item;
  hairColor: string;
  isSelected: boolean;
  onPress: () => void;
}

const screenWidth = Dimensions.get('window').width;
const totalHorizontalPadding = GRID_LAYOUT.HORIZONTAL_PADDING * 2;
const totalColumnSpacing = GRID_LAYOUT.ITEM_SPACING * (GRID_LAYOUT.NUM_COLUMNS - 1);
const cardWidth = (screenWidth - totalHorizontalPadding - totalColumnSpacing) / GRID_LAYOUT.NUM_COLUMNS;

export const AvatarItemCard: React.FC<Props> = ({ item, hairColor, isSelected, onPress }) => {
  const itemImage = resolveAvatarItemImage(item, hairColor);
  // 테두리 색상 결정
  const borderColor = isSelected? PRIMARY[500] : GREY[250];

  // 투명도 결정
  const opacity = item.status === ItemStatus.NOT_OWNED
    ? ITEM_OPACITY.NOT_OWNED
    : ITEM_OPACITY.OWNED;

  const borderWidth = isSelected ? 2 : 1;

  const backgroundColor = isSelected ? PRIMARY[50] : GREY.WHITE;

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
        {itemImage && (
          <Image source={itemImage} style={styles.image} />
        )}

        {/* 가격 배지 (선택된 미보유 아이템만) */}
        {isSelected && !item.isOwned && item.point && (
          <View style={styles.priceBadge}>
            <Icon name='point' size={14}/>
            {/* <View style={styles.priceIcon} /> */}
            <Text style={styles.priceText}>{item.point}</Text>
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
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: '60%',
    height: '60%',
    resizeMode: 'contain',
  },
  priceBadge: {
    position: 'absolute',
    // width:43,
    height:20,
    top: 6,
    right: 5,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 24,
    borderColor: PRIMARY[300],
    borderWidth: 1,
    gap: 2,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '600',
    color: GREY[900],
  },
});
