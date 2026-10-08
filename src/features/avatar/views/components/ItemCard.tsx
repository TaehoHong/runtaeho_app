/**
 * 아이템 카드
 * SRP: 개별 아이템 표시만 담당
 */

import React from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Item } from '~/features/avatar';
import { GRID_LAYOUT, ITEM_OPACITY, ItemStatus } from '~/features/avatar';
import { resolveAvatarItemImage } from '~/features/avatar/utils/avatarItemImageResolver';
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
  const label = item.status === ItemStatus.EQUIPPED ? '착용 중'
    : item.isOwned ? '보유' : item.point === 0 ? '무료' : `${item.point.toLocaleString()} P`;

  return (
    <TouchableOpacity
      style={[styles.container, { width: cardWidth }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${label}`}
      accessibilityState={{ selected: isSelected }}
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

      </View>
      <Text style={styles.priceText}>{label}</Text>
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
  priceText: {
    fontSize: 12,
    fontWeight: '600',
    color: GREY[900],
    textAlign: 'center',
    marginTop: 6,
  },
});
