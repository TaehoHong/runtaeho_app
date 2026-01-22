/**
 * 아바타 프리뷰 (Unity View)
 * SRP: Unity 캐릭터 렌더링만 담당
 *
 * Push + Pull 패턴으로 Race Condition 없이 안정적으로 Unity 통신
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import type { EquippedItemsMap, Item } from '~/features/avatar';
import { UNITY_PREVIEW } from '~/features/avatar';
import { UnityView } from '~/features/unity/components/UnityView';
import { UnityLoadingState } from '~/features/unity/components/UnityLoadingState';
import { unityService } from '~/features/unity/services/UnityService';
import { GREY } from '~/shared/styles';

interface Props {
  equippedItems: EquippedItemsMap;
  hairColor: string;
}

export const AvatarPreview: React.FC<Props> = ({ equippedItems, hairColor }) => {
  const [isUnityReady, setIsUnityReady] = useState(false);

  // 장착 아이템 또는 헤어 색상 변경 시 Unity 아바타 동기화 (SPOT: Unity 동기화는 여기서만!)
  useEffect(() => {
    // Unity가 아직 준비되지 않았으면 스킵 (handleUnityReady에서 처리)
    if (!isUnityReady) return;

    console.log('🔄 [AvatarPreview] 아이템/색상 변경 - 동기화');

    const unsubscribe = unityService.onReady(async () => {
      try {
        const items = Object.values(equippedItems).filter((item): item is Item => !!item);
        if (items.length > 0) {
          await unityService.changeAvatar(items, hairColor);
          console.log(`✅ [AvatarPreview] 동기화 완료 (${items.length}개, 색상: ${hairColor})`);
        }
      } catch (error) {
        console.error('❌ [AvatarPreview] 동기화 실패:', error);
      }
    });

    return () => unsubscribe();
  }, [equippedItems, hairColor, isUnityReady]);

  /**
   * Unity 준비 완료 이벤트 핸들러
   * Push + Pull 패턴으로 Race Condition 없이 안정적으로 초기화
   */
  const handleUnityReady = useCallback((event: any) => {
    console.log('[AvatarPreview] Unity View Ready:', event.nativeEvent);

    const unsubscribe = unityService.onReady(async () => {
      console.log('[AvatarPreview] ✅ GameObject Ready! 초기화 시작');

      try {
        const items = Object.values(equippedItems).filter((item): item is Item => !!item);
        if (items.length > 0) {
          await unityService.changeAvatar(items, hairColor);
          console.log(`✅ [AvatarPreview] 초기화 완료 (${items.length}개, 색상: ${hairColor})`);
        }
        setIsUnityReady(true);
      } catch (error) {
        console.error('❌ [AvatarPreview] 초기화 실패:', error);
        setIsUnityReady(true); // 에러가 발생해도 진행
      }
    });

    return unsubscribe;
  }, [equippedItems, hairColor]);

  return (
    <View style={styles.container}>
      <UnityLoadingState
        isLoading={!isUnityReady}
        variant="avatar"
        minDisplayTime={300}
      >
        <UnityView
          style={styles.unity}
          onUnityReady={handleUnityReady}
        />
      </UnityLoadingState>
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
