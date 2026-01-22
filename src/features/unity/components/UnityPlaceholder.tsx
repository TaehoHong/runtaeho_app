/**
 * UnityPlaceholder
 * Unity View 로딩 중 표시되는 플레이스홀더 컴포넌트
 *
 * Variant별 디자인:
 * - running: GREY[100] 배경 + 캐릭터 실루엣 + "캐릭터 로딩 중" 텍스트
 * - avatar: GREY.WHITE 배경 + 캐릭터 실루엣 (중앙)
 * - league: GREY[100] 배경 + 캐릭터 실루엣 + 작은 스피너
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GREY, PRIMARY } from '~/shared/styles';

export type UnityPlaceholderVariant = 'running' | 'avatar' | 'league';

interface UnityPlaceholderProps {
  variant: UnityPlaceholderVariant;
}

/**
 * 캐릭터 실루엣 SVG 패스를 그리는 컴포넌트
 * 간단한 사람 모양 실루엣 (원 + 타원)
 */
const CharacterSilhouette: React.FC<{ size?: number; color?: string }> = ({
  size = 80,
  color = GREY[300],
}) => {
  const headSize = size * 0.35;
  const bodyWidth = size * 0.5;
  const bodyHeight = size * 0.5;

  return (
    <View style={[silhouetteStyles.container, { width: size, height: size }]}>
      {/* Head */}
      <View
        style={[
          silhouetteStyles.head,
          {
            width: headSize,
            height: headSize,
            borderRadius: headSize / 2,
            backgroundColor: color,
          },
        ]}
      />
      {/* Body */}
      <View
        style={[
          silhouetteStyles.body,
          {
            width: bodyWidth,
            height: bodyHeight,
            borderRadius: bodyWidth / 2,
            backgroundColor: color,
            marginTop: -size * 0.05,
          },
        ]}
      />
    </View>
  );
};

const silhouetteStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  head: {},
  body: {},
});

/**
 * 플레이스홀더 메인 컴포넌트
 */
export const UnityPlaceholder: React.FC<UnityPlaceholderProps> = ({ variant }) => {
  const backgroundColor = variant === 'avatar' ? GREY.WHITE : GREY[100];
  const showText = variant === 'running';
  const showSpinner = variant === 'league';

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        <CharacterSilhouette
          size={variant === 'avatar' ? 100 : 80}
          color={GREY[300]}
        />

        {showText && (
          <Text style={styles.loadingText}>캐릭터 로딩 중</Text>
        )}

        {showSpinner && (
          <ActivityIndicator
            size="small"
            color={PRIMARY[600]}
            style={styles.spinner}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: 'Pretendard-Medium',
    fontWeight: '500',
    color: GREY[500],
  },
  spinner: {
    marginTop: 12,
  },
});

export default UnityPlaceholder;
