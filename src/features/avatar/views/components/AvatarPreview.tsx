/**
 * 아바타 프리뷰 (Unity View)
 * SRP: Unity 캐릭터 렌더링만 담당
 *
 * ★ useUnityReadiness Hook 기반으로 리팩토링
 * - 기존: 자체 useState + 개별 이벤트 관리
 * - 변경: Store 기반 통합 상태 관리 (isGameObjectReady + isAvatarReady)
 *
 * Push + Pull 패턴으로 Race Condition 없이 안정적으로 Unity 통신
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import type { EquippedItemsMap, Item } from '~/features/avatar';
import { UNITY_PREVIEW } from '~/features/avatar';
import { UnityView } from '~/features/unity/components/UnityView';
import { UnityLoadingState } from '~/features/unity/components/UnityLoadingState';
import { unityService } from '~/features/unity/services/UnityService';
import { useUnityReadiness } from '~/features/unity/hooks';
import { useUnityStore } from '~/stores/unity/unityStore';
import { GREY } from '~/shared/styles';

interface Props {
  equippedItems: EquippedItemsMap;
  hairColor: string;
}

export const AvatarPreview: React.FC<Props> = ({ equippedItems, hairColor }) => {
  // ★ 첫 ready 이후 effect를 한 번만 제어하기 위한 플래그
  const hasHandledFirstReadyEffectRef = useRef(false);
  // ★ onReady에서 실제 초기 sync 완료 여부
  const didInitialSyncInOnReadyRef = useRef(false);
  // ★ 이전 장착 아이템/색상 저장 (변경 감지용)
  const prevEquippedItemsRef = useRef<EquippedItemsMap>(equippedItems);
  const prevHairColorRef = useRef<string>(hairColor);

  // ★ useUnityReadiness 훅 사용 (Store 기반 통합 상태 관리)
  const { handleUnityReady: baseHandleUnityReady, canSendMessage } = useUnityReadiness({
    waitForAvatar: true,  // isGameObjectReady && isAvatarReady 모두 체크
    timeout: 5000,        // 5초 타임아웃
  });

  // Store 액션
  const setAvatarReady = useUnityStore((state) => state.setAvatarReady);

  /**
   * 장착 아이템 또는 헤어 색상 변경 시 Unity 아바타 동기화
   * ★ onReady 초기 동기화 완료 여부에 따라 첫 실행을 분기 처리
   */
  useEffect(() => {
    // Unity가 아직 준비되지 않았으면 스킵 (handleUnityReady에서 처리)
    if (!canSendMessage) return;

    let shouldForceSync = false;

    // ★ 첫 ready effect에서만 특별 처리
    if (!hasHandledFirstReadyEffectRef.current) {
      hasHandledFirstReadyEffectRef.current = true;

      // onReady에서 초기 sync가 이미 완료됐으면 중복 요청 방지
      if (didInitialSyncInOnReadyRef.current) {
        console.log('🔄 [AvatarPreview] onReady 초기 동기화 완료 - 첫 effect 스킵');
        prevEquippedItemsRef.current = equippedItems;
        prevHairColorRef.current = hairColor;
        return;
      }

      // onReady 초기 sync 완료 전이면 최신 props로 1회 강제 동기화
      shouldForceSync = true;
    }

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

    if (!shouldForceSync && !itemsChanged && !colorChanged) {
      return;
    }

    console.log('🔄 [AvatarPreview] 아이템/색상 변경 감지 - 동기화 시작');
    console.log(`   - 아이템 변경: ${itemsChanged}, 색상 변경: ${colorChanged}`);

    // 이전 값 업데이트
    prevEquippedItemsRef.current = equippedItems;
    prevHairColorRef.current = hairColor;

    const items = Object.values(equippedItems).filter((item): item is Item => !!item);
    if (items.length > 0) {
      // ★ changeAvatar 호출 전 isAvatarReady를 false로 리셋
      setAvatarReady(false);

      unityService
        .changeAvatar(items, hairColor)
        .then(() => {
          console.log(`✅ [AvatarPreview] 동기화 요청 완료 (${items.length}개, 색상: ${hairColor})`);
        })
        .catch((error) => {
          console.error('❌ [AvatarPreview] 동기화 실패:', error);
          setAvatarReady(true);
        });
    }
  }, [equippedItems, hairColor, canSendMessage, setAvatarReady]);

  /**
   * Unity 준비 완료 이벤트 핸들러
   */
  const handleUnityReady = useCallback(
    (event: any) => {
      console.log('[AvatarPreview] Unity View Ready:', event.nativeEvent);

      baseHandleUnityReady(event);

      const unsubscribe = unityService.onReady(async () => {
        console.log('[AvatarPreview] ✅ GameObject Ready! 초기화 시작');

        try {
          const items = Object.values(equippedItems).filter((item): item is Item => !!item);
          if (items.length > 0) {
            await unityService.changeAvatar(items, hairColor);
            didInitialSyncInOnReadyRef.current = true;
            prevEquippedItemsRef.current = equippedItems;
            prevHairColorRef.current = hairColor;
            console.log(`✅ [AvatarPreview] 초기화 완료 (${items.length}개, 색상: ${hairColor})`);
          } else {
            didInitialSyncInOnReadyRef.current = true;
            prevEquippedItemsRef.current = equippedItems;
            prevHairColorRef.current = hairColor;
            console.log('[AvatarPreview] 장착 아이템 없음 - 수동으로 ready 처리');
            setAvatarReady(true);
          }
        } catch (error) {
          console.error('❌ [AvatarPreview] 초기화 실패:', error);
          setAvatarReady(true);
        }
      });

      return unsubscribe;
    },
    [equippedItems, hairColor, baseHandleUnityReady, setAvatarReady]
  );

  return (
    <View style={styles.container}>
      <UnityLoadingState
        isLoading={!canSendMessage}
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
