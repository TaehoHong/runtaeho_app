import React, { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet } from 'react-native';
import type { EquippedItemsMap, Item } from '~/features/avatar';
import { UNITY_PREVIEW } from '~/features/avatar';
import { UnityLoadingState } from '~/features/unity/components/UnityLoadingState';
import { unityService } from '~/features/unity/services/UnityService';
import { useUnityBootstrap } from '~/features/unity/hooks';
import { useUnityStore } from '~/stores/unity/unityStore';

interface Props {
  equippedItems: EquippedItemsMap;
  hairColor: string;
}

export const AvatarPreview: React.FC<Props> = ({ equippedItems, hairColor }) => {
  // ★ 이전 장착 아이템/색상 저장 (변경 감지용)
  const prevEquippedItemsRef = useRef<EquippedItemsMap>(equippedItems);
  const prevHairColorRef = useRef<string>(hairColor);
  const unityViewportRef = useRef<View>(null);
  const viewportSyncTokenRef = useRef(0);
  const isViewportFocusedRef = useRef(false);
  const isUnityStartedRef = useRef(false);
  const setActiveViewport = useUnityStore((state) => state.setActiveViewport);
  const clearActiveViewport = useUnityStore((state) => state.clearActiveViewport);
  const isUnitySurfaceVisible = useUnityStore((state) => state.isSurfaceVisible);

  const getInitialAvatarPayload = useCallback(() => {
    const items = Object.values(equippedItems).filter((item): item is Item => !!item);
    return { items, hairColor };
  }, [equippedItems, hairColor]);

  // 초기 bootstrap(Ready + 첫 sync) 후 변경분만 반영
  const {
    canSendMessage,
    isInitialAvatarSynced,
    isUnityStarted,
  } = useUnityBootstrap({
    waitForAvatar: true,  // isGameObjectReady && isAvatarReady 모두 체크
    timeout: 5000,        // 5초 타임아웃
    getInitialAvatarPayload,
  });

  useEffect(() => {
    isUnityStartedRef.current = isUnityStarted;
    if (!isUnityStarted) {
      viewportSyncTokenRef.current += 1;
    }
  }, [isUnityStarted]);

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

  const syncUnityViewport = useCallback(() => {
    const viewport = unityViewportRef.current;
    if (
      !isViewportFocusedRef.current
      || !isUnityStartedRef.current
      || !viewport
      || typeof viewport.measureInWindow !== 'function'
    ) {
      return;
    }

    viewportSyncTokenRef.current += 1;
    const syncToken = viewportSyncTokenRef.current;

    requestAnimationFrame(() => {
      if (syncToken !== viewportSyncTokenRef.current) {
        return;
      }

      viewport.measureInWindow((x, y, width, height) => {
        if (
          syncToken !== viewportSyncTokenRef.current
          || !isViewportFocusedRef.current
          || !isUnityStartedRef.current
          || width <= 0
          || height <= 0
        ) {
          return;
        }

        setActiveViewport({
          owner: 'avatar',
          frame: { x, y, width, height },
          borderRadius: 16,
        });
      });
    });
  }, [setActiveViewport]);

  useFocusEffect(
    useCallback(() => {
      isViewportFocusedRef.current = true;
      if (isUnityStartedRef.current) {
        syncUnityViewport();
      }

      return () => {
        isViewportFocusedRef.current = false;
        viewportSyncTokenRef.current += 1;
        clearActiveViewport('avatar');
      };
    }, [clearActiveViewport, syncUnityViewport])
  );

  useEffect(() => {
    if (!isUnityStarted) {
      return;
    }

    syncUnityViewport();
  }, [isUnityStarted, syncUnityViewport]);

  return (
    <View style={styles.container}>
      <UnityLoadingState
        isLoading={!isInitialAvatarSynced || !isUnitySurfaceVisible}
        variant="avatar"
        minDisplayTime={300}
      >
        <View
          ref={unityViewportRef}
          style={styles.unity}
          testID="avatar-preview-viewport"
          onLayout={syncUnityViewport}
          collapsable={false}
        />
      </UnityLoadingState>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: UNITY_PREVIEW.HEIGHT,
    borderRadius: 16,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  unity: {
    width: '100%',
    height: '100%',
  },
});
