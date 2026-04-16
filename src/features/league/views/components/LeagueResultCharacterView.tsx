import React, { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet } from 'react-native';
import { UnityLoadingState } from '~/features/unity/components/UnityLoadingState';
import { useUnityStore } from '~/stores/unity/unityStore';
import { GREY } from '~/shared/styles';
import { LeagueResultStatus } from '../../models';
import { useLeagueResultAnimation } from '../../hooks/useLeagueResultAnimation';

interface LeagueResultCharacterViewProps {
  resultStatus: LeagueResultStatus;
}

/**
 * 결과 상태별 이모지 반환 (폴백 UI용)
 */
const getResultEmoji = (status: LeagueResultStatus): string => {
  switch (status) {
    case LeagueResultStatus.PROMOTED:
      return '🎉';
    case LeagueResultStatus.MAINTAINED:
      return '👍';
    case LeagueResultStatus.RELEGATED:
      return '💪';
    case LeagueResultStatus.REBIRTH:
      return '🔄';
    default:
      return '🏃';
  }
};

/**
 * 결과 상태별 텍스트 반환 (폴백 UI용)
 */
const getResultText = (status: LeagueResultStatus): string => {
  switch (status) {
    case LeagueResultStatus.PROMOTED:
      return '승급 축하!';
    case LeagueResultStatus.MAINTAINED:
      return '수고했어요!';
    case LeagueResultStatus.RELEGATED:
      return '다음에 더 잘해봐요!';
    case LeagueResultStatus.REBIRTH:
      return '새로운 시작!';
    default:
      return '';
  }
};

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
  const { isUnityReady, isUnityAvailable, isUnityStarted } =
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

  // Android/Web: 폴백 UI
  if (!isUnityAvailable) {
    return (
      <View style={styles.container}>
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackEmoji}>{getResultEmoji(resultStatus)}</Text>
          <Text style={styles.fallbackText}>{getResultText(resultStatus)}</Text>
        </View>
      </View>
    );
  }

  // iOS: Unity 캐릭터 뷰
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
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  fallbackText: {
    fontSize: 18,
    fontFamily: 'Pretendard-SemiBold',
    fontWeight: '600',
    color: GREY[700],
  },
});
