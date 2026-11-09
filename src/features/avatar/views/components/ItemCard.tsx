/**
 * 아이템 카드
 * SRP: 개별 아이템 표시만 담당
 */

import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import type { Item } from '~/features/avatar';
import { GRID_LAYOUT, ItemStatus } from '~/features/avatar';
import { resolveAvatarItemImage } from '~/features/avatar/utils/avatarItemImageResolver';
import { BLUE, GREY, PRIMARY } from '~/shared/styles';
import { useAppTranslation } from '~/i18n';
import { getNumberFontStyle } from '~/shared/components/typography/fontUtils';
import { SelectionCheck } from './SelectionCheck';

interface Props {
  item: Item;
  hairColor: string;
  isSelected: boolean;
  onPress: () => void;
}

const totalHorizontalPadding = GRID_LAYOUT.HORIZONTAL_PADDING * 2;
const totalColumnSpacing = GRID_LAYOUT.ITEM_SPACING * (GRID_LAYOUT.NUM_COLUMNS - 1);

export const AvatarItemCard: React.FC<Props> = ({ item, hairColor, isSelected, onPress }) => {
  const t = useAppTranslation();
  const { width } = useWindowDimensions();
  const cardWidth = (width - totalHorizontalPadding - totalColumnSpacing) / GRID_LAYOUT.NUM_COLUMNS;
  const itemImage = resolveAvatarItemImage(item, hairColor);
  const isEquipped = item.status === ItemStatus.EQUIPPED;
  const isOwned = isEquipped || item.isOwned;
  const borderColor = isEquipped ? BLUE.SECONDARY : isSelected ? PRIMARY[500] : GREY[250];
  const backgroundColor = !isEquipped && isSelected ? PRIMARY[50] : GREY.WHITE;
  const label = isEquipped ? t('착용 중')
    : isOwned ? t('보유') : item.point === 0 ? t('무료') : `${item.point.toLocaleString()} P`;

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
        style={[styles.card, { backgroundColor }]}
      >
        {isEquipped && <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.equippedTint]} />}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.outline, { borderColor, borderWidth: isEquipped || isSelected ? 2 : 1 }]} />
        {itemImage && (
          <Image source={itemImage} style={styles.image} />
        )}
        {isSelected && <SelectionCheck />}
      </View>
      <Text style={[styles.priceText, isOwned && styles.ownedText, isEquipped && styles.equippedText]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    minWidth: 0,
  },
  outline: {
    borderRadius: 14,
  },
  equippedTint: {
    borderRadius: 14,
    backgroundColor: BLUE.SECONDARY,
    opacity: 0.1,
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
    lineHeight: 18,
    ...getNumberFontStyle('500'),
    color: GREY[700],
    textAlign: 'center',
    marginTop: 6,
  },
  ownedText: {
    color: GREY[900],
    ...getNumberFontStyle('600'),
  },
  equippedText: {
    ...getNumberFontStyle('700'),
  },
});
