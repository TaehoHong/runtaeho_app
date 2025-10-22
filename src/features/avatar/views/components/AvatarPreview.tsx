/**
 * 아바타 프리뷰 (Unity View)
 * SRP: Unity 캐릭터 렌더링만 담당
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import type { EquippedItemsMap } from '~/features/avatar';
import { UNITY_PREVIEW } from '~/features/avatar';
import { UnityView } from '~/features/unity/components/UnityView';
import { unityService } from '~/features/unity/services/UnityService';
import { GREY } from '~/shared/styles';

interface Props {
  equippedItems: EquippedItemsMap;
}

export const AvatarPreview: React.FC<Props> = ({ equippedItems }) => {
  // Unity 준비 완료 이벤트 핸들러
  const handleUnityReady = useCallback((event: any) => {
    console.log('[AvatarPreview] Unity Ready:', event.nativeEvent);

    // Unity가 준비되면 현재 착용된 아이템 전송
    const items = Object.values(equippedItems);
    if (items.length > 0) {
      console.log('[AvatarPreview] Sending initial avatar items:', items.length);
      unityService.changeAvatar(items);
    }
  }, [equippedItems]);

  return (
    <View style={styles.container}>
      <UnityView
        style={styles.unity}
        onUnityReady={handleUnityReady}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    height: UNITY_PREVIEW.HEIGHT,
    borderRadius: 16,
    backgroundColor: GREY.WHITE,
    overflow: 'hidden',
  },
  unity: {
    width: '100%',
    height: '100%',
  },
});
