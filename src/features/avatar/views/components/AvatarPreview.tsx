/**
 * 아바타 프리뷰 (Unity View)
 * SRP: Unity 캐릭터 렌더링만 담당
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import type { EquippedItemsMap, Item } from '~/features/avatar';
import { UNITY_PREVIEW } from '~/features/avatar';
import { UnityView } from '~/features/unity/components/UnityView';
import { unityService } from '~/features/unity/services/UnityService';
import { GREY } from '~/shared/styles';

interface Props {
  equippedItems: EquippedItemsMap;
}

export const AvatarPreview: React.FC<Props> = ({ equippedItems }) => {
  const [isUnityReady, setIsUnityReady] = useState(false);

  // 장착 아이템 변경 시 Unity 아바타 동기화
  useEffect(() => {
    console.log(`🔄 [AvatarPreview] equippedItems 변경 - GameObject Ready 체크: ${unityService.isReady()}, isUnityReady: ${isUnityReady}`);

    // ⚠️ 중요: unityService.isReady()를 먼저 체크!
    if (!unityService.isReady()) {
      console.log('⏳ [AvatarPreview] GameObject not ready - 아이템 동기화 대기');

      // GameObject Ready를 기다린 후 동기화
      unityService.onReady(async () => {
        console.log('✅ [AvatarPreview] GameObject ready! 아이템 동기화 시작');
        try {
          const items = Object.values(equippedItems).filter((item): item is Item => !!item);
          if (items.length > 0) {
            await unityService.changeAvatar(items);
            console.log(`✅ [AvatarPreview] 아바타 동기화 완료 (${items.length}개 아이템)`);
          }
        } catch (error) {
          console.error('❌ [AvatarPreview] 아바타 동기화 실패:', error);
        }
      });
      return;
    }

    // GameObject가 이미 준비된 경우 즉시 동기화
    console.log('🔄 [AvatarPreview] 장착 아이템 동기화 시작 (GameObject ready)');

    const syncAvatar = async () => {
      try {
        const items = Object.values(equippedItems).filter((item): item is Item => !!item);

        if (items.length > 0) {
          await unityService.changeAvatar(items);
          console.log(`✅ [AvatarPreview] 아바타 동기화 완료 (${items.length}개 아이템)`);
        }
      } catch (error) {
        console.error('❌ [AvatarPreview] 아바타 동기화 실패:', error);
      }
    };

    syncAvatar();
  }, [equippedItems, isUnityReady]);

  /**
   * Unity 준비 완료 이벤트 핸들러
   * GameObject Ready를 기다린 후 최초 동기화만 수행
   */
  const handleUnityReady = useCallback(async (event: any) => {
    console.log('[AvatarPreview] Unity Ready:', event.nativeEvent);

    // GameObject Ready를 항상 기다림 (중요!)
    console.log('[AvatarPreview] GameObject 준비 대기 중...');

    unityService.onReady(async () => {
      console.log('[AvatarPreview] ✅ GameObject Ready! 최초 동기화 시작');

      try {
        const items = Object.values(equippedItems).filter((item): item is Item => !!item);

        if (items.length > 0) {
          console.log(`[AvatarPreview] Syncing ${items.length} equipped items to Unity`);
          await unityService.changeAvatar(items);
          console.log(`✅ [AvatarPreview] 최초 동기화 완료 (${items.length}개 아이템)`);
        } else {
          console.log('[AvatarPreview] No equipped items to sync');
        }

        // Unity 준비 완료 플래그 설정
        setIsUnityReady(true);
      } catch (error) {
        console.error('❌ [AvatarPreview] 최초 동기화 실패:', error);
      }
    });
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
