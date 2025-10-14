/**
 * 아바타 프리뷰 (Unity View)
 * SRP: Unity 캐릭터 렌더링만 담당
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { EquippedItemsMap } from '~/features/avatar';
import { UNITY_PREVIEW, AVATAR_COLORS } from '~/features/avatar';

interface Props {
  equippedItems: EquippedItemsMap;
}

export const AvatarPreview: React.FC<Props> = ({ equippedItems }) => {
  // TODO: Unity View 연동
  // import { UnityView } from '~/features/unity/components/UnityView';
  // return <UnityView equippedItems={equippedItems} style={styles.unity} />;

  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        {/* Placeholder for Unity View */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: UNITY_PREVIEW.HEIGHT,
    borderRadius: UNITY_PREVIEW.BORDER_RADIUS,
    backgroundColor: AVATAR_COLORS.CARD_BACKGROUND,
    overflow: 'hidden',
  },
  placeholder: {
    flex: 1,
    backgroundColor: AVATAR_COLORS.ITEM_BACKGROUND,
  },
  unity: {
    flex: 1,
  },
});
