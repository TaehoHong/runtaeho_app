/**
 * LeagueResultCharacterView
 * 리그 결과 화면의 Unity 캐릭터 뷰
 *
 * iOS: Unity 캐릭터 렌더링 + 로딩 인디케이터
 * Android/Web: 이모지 기반 폴백 UI
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UnityView } from '~/features/unity/components/UnityView';
import { UnityLoadingState } from '~/features/unity/components/UnityLoadingState';
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
  const { isUnityReady, isUnityAvailable, handleUnityReady } =
    useLeagueResultAnimation({ resultStatus });

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
        <UnityView
          style={styles.unityView}
          onUnityReady={handleUnityReady}
          onUnityError={(event) => {
            console.error('[LeagueResultCharacterView] Unity error:', event?.nativeEvent);
          }}
        />
      </UnityLoadingState>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 280,
    backgroundColor: GREY[100],
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
