import React, { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet } from 'react-native';
import { UnityLoadingState } from '~/features/unity/components/UnityLoadingState';
import { useUnityStore } from '~/stores/unity/unityStore';
import { LeagueResultStatus } from '../../models';
import { useLeagueResultAnimation } from '../../hooks/useLeagueResultAnimation';

interface LeagueResultCharacterViewProps {
  resultStatus: LeagueResultStatus;
}

/**
 * 리그 결과 캐릭터 뷰 컴포넌트
 */
export const LeagueResultCharacterView: React.FC<LeagueResultCharacterViewProps> = ({
  resultStatus,
}) => {
  const unityViewportRef = useRef<View>(null);
  const viewportSyncTokenRef = useRef(0);
  const isViewportFocusedRef = useRef(false);
  const isUnityStartedRef = useRef(false);
  const setActiveViewport = useUnityStore((state) => state.setActiveViewport);
  const clearActiveViewport = useUnityStore((state) => state.clearActiveViewport);
  const { isUnityReady, isUnityStarted } =
    useLeagueResultAnimation({ resultStatus });

  useEffect(() => {
    isUnityStartedRef.current = isUnityStarted;
    if (!isUnityStarted) {
      viewportSyncTokenRef.current += 1;
    }
  }, [isUnityStarted]);

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
          owner: 'league',
          frame: { x, y, width, height },
          borderRadius: 0,
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
        clearActiveViewport('league');
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
        isLoading={!isUnityReady}
        variant="league"
        minDisplayTime={300}
      >
        <View
          ref={unityViewportRef}
          style={styles.unityView}
          testID="league-result-viewport"
          onLayout={syncUnityViewport}
          collapsable={false}
        />
      </UnityLoadingState>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 280,
    backgroundColor: 'transparent',
  },
  unityView: {
    width: '100%',
    height: '100%',
  },
});
