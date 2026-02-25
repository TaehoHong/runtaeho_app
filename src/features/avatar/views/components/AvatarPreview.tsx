/**
 * 아바타 프리뷰 (Unity View)
 * SRP: Unity 캐릭터 렌더링만 담당
 *
 * ★ useUnityBootstrap Hook 기반 초기화 통합
 * - Ready + 첫 avatar sync는 공통 bootstrap에서 처리
 * - 이후 변경분 sync만 이 컴포넌트에서 처리
 *
 * Push + Pull 패턴으로 Race Condition 없이 안정적으로 Unity 통신
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import type { EquippedItemsMap, Item } from '~/features/avatar';
import { UNITY_PREVIEW } from '~/features/avatar';
import type { UnityReadyEvent } from '~/features/unity/bridge/UnityBridge';
import { UnityView } from '~/features/unity/components/UnityView';
import { UnityLoadingState } from '~/features/unity/components/UnityLoadingState';
import { unityService } from '~/features/unity/services/UnityService';
import { useUnityBootstrap } from '~/features/unity/hooks';
import { GREY } from '~/shared/styles';

interface Props {
  equippedItems: EquippedItemsMap;
  hairColor: string;
}

export const AvatarPreview: React.FC<Props> = ({ equippedItems, hairColor }) => {
  // ★ 이전 장착 아이템/색상 저장 (변경 감지용)
  const prevEquippedItemsRef = useRef<EquippedItemsMap>(equippedItems);
  const prevHairColorRef = useRef<string>(hairColor);

  const getInitialAvatarPayload = useCallback(() => {
    const items = Object.values(equippedItems).filter((item): item is Item => !!item);
    return { items, hairColor };
  }, [equippedItems, hairColor]);

  // 초기 bootstrap(Ready + 첫 sync) 후 변경분만 반영
  const {
    handleUnityReady: baseHandleUnityReady,
    canSendMessage,
    isInitialAvatarSynced,
  } = useUnityBootstrap({
    waitForAvatar: true,  // isGameObjectReady && isAvatarReady 모두 체크
    timeout: 5000,        // 5초 타임아웃
    getInitialAvatarPayload,
  });

  /**
   * 장착 아이템 또는 헤어 색상 변경 시 Unity 아바타 동기화
   * 초기 bootstrap 이후 변경 감지만 반영
   */
  useEffect(() => {
    if (!canSendMessage || !isInitialAvatarSynced) return;

    // ★ 실제 변경이 있는지 확인 (아이템 ID 비교)
    const prevItemIds = Object.values(prevEquippedItemsRef.current)
      .filter((item): item is Item => !!item)
      .map((item) => item.id)
      .sort()
      .join(',');
    const currentItemIds = Object.values(equippedItems)
      .filter((item): item is Item => !!item)
      .map((item) => item.id)
      .sort()
      .join(',');
    const itemsChanged = prevItemIds !== currentItemIds;
    const colorChanged = prevHairColorRef.current !== hairColor;

    if (!itemsChanged && !colorChanged) {
      return;
    }

    console.log('🔄 [AvatarPreview] 아이템/색상 변경 감지 - 동기화 시작');
    console.log(`   - 아이템 변경: ${itemsChanged}, 색상 변경: ${colorChanged}`);

    // 이전 값 업데이트
    prevEquippedItemsRef.current = equippedItems;
    prevHairColorRef.current = hairColor;

    const items = Object.values(equippedItems).filter((item): item is Item => !!item);

    void unityService
      .syncAvatar(items, hairColor, {
        waitForReady: false,
      })
      .then((result) => {
        console.log(
          `✅ [AvatarPreview] 동기화 요청 완료 (${items.length}개, 색상: ${hairColor}, result=${result})`
        );
      })
      .catch((error) => {
        console.error('❌ [AvatarPreview] 동기화 실패:', error);
      });
  }, [equippedItems, hairColor, canSendMessage, isInitialAvatarSynced]);

  /**
   * Unity 준비 완료 이벤트 핸들러
   */
  const handleUnityReady = useCallback(
    (event: UnityReadyEvent) => {
      console.log('[AvatarPreview] Unity View Ready:', event.nativeEvent);
      baseHandleUnityReady(event);
    },
    [baseHandleUnityReady]
  );

  return (
    <View style={styles.container}>
      <UnityLoadingState
        isLoading={!isInitialAvatarSynced}
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
