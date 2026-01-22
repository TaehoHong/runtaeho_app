/**
 * UnityLoadingState
 * Unity View 로딩 상태를 관리하는 Wrapper 컴포넌트
 *
 * 기능:
 * - Placeholder 이미지로 즉각적 시각 피드백
 * - 최소 표시 시간 설정으로 깜빡임 방지
 * - react-native-reanimated로 부드러운 페이드 전환
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { UnityPlaceholder, type UnityPlaceholderVariant } from './UnityPlaceholder';

interface UnityLoadingStateProps {
  /** Unity가 로딩 중인지 여부 */
  isLoading: boolean;
  /** Placeholder variant (running/avatar/league) */
  variant: UnityPlaceholderVariant;
  /** 최소 표시 시간 (ms) - 깜빡임 방지, 기본 300ms */
  minDisplayTime?: number;
  /** 페이드 애니메이션 지속 시간 (ms), 기본 250ms */
  fadeDuration?: number;
  /** Unity View를 렌더링하는 children */
  children: React.ReactNode;
}

/**
 * Unity 로딩 상태 관리 컴포넌트
 *
 * 작동 원리:
 * 1. isLoading=true 시작 → Placeholder 표시, minDisplayTime 타이머 시작
 * 2. isLoading=false 전환 시:
 *    - minDisplayTime이 지났으면 → 즉시 페이드 전환
 *    - minDisplayTime이 안 지났으면 → 대기 후 페이드 전환
 * 3. 페이드 전환: Placeholder opacity 1→0, Content opacity 0→1
 */
export const UnityLoadingState: React.FC<UnityLoadingStateProps> = ({
  isLoading,
  variant,
  minDisplayTime = 300,
  fadeDuration = 250,
  children,
}) => {
  // 실제로 placeholder를 숨길 준비가 되었는지 (minDisplayTime 경과 + isLoading false)
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);

  // Animated values for smooth transitions
  const placeholderOpacity = useSharedValue(1);
  const contentOpacity = useSharedValue(0);

  // 로딩 시작 시간 기록
  useEffect(() => {
    if (isLoading && loadingStartTime === null) {
      setLoadingStartTime(Date.now());
    }
  }, [isLoading, loadingStartTime]);

  // isLoading이 false가 되면 전환 처리
  useEffect(() => {
    if (!isLoading && loadingStartTime !== null) {
      const elapsed = Date.now() - loadingStartTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsed);

      const startTransition = () => {
        // 페이드 아웃 애니메이션
        placeholderOpacity.value = withTiming(0, {
          duration: fadeDuration,
          easing: Easing.out(Easing.ease),
        });

        // 페이드 인 애니메이션
        contentOpacity.value = withTiming(
          1,
          {
            duration: fadeDuration,
            easing: Easing.out(Easing.ease),
          },
          (finished) => {
            if (finished) {
              runOnJS(setShowPlaceholder)(false);
            }
          }
        );
      };

      if (remainingTime > 0) {
        // minDisplayTime이 아직 안 지났으면 대기 후 전환
        const timer = setTimeout(startTransition, remainingTime);
        return () => clearTimeout(timer);
      } else {
        // 이미 minDisplayTime이 지났으면 즉시 전환
        startTransition();
      }
    }
  }, [isLoading, loadingStartTime, minDisplayTime, fadeDuration, placeholderOpacity, contentOpacity]);

  // 컴포넌트 리셋 (새로운 로딩 시작)
  useEffect(() => {
    if (isLoading) {
      setShowPlaceholder(true);
      placeholderOpacity.value = 1;
      contentOpacity.value = 0;
    }
  }, [isLoading, placeholderOpacity, contentOpacity]);

  // Animated styles
  const placeholderAnimatedStyle = useAnimatedStyle(() => ({
    opacity: placeholderOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Unity Content - 항상 렌더링 (opacity로 제어) */}
      <Animated.View style={[styles.contentContainer, contentAnimatedStyle]}>
        {children}
      </Animated.View>

      {/* Placeholder - showPlaceholder가 true인 동안만 렌더링 */}
      {showPlaceholder && (
        <Animated.View style={[styles.placeholderContainer, placeholderAnimatedStyle]}>
          <UnityPlaceholder variant={variant} />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  contentContainer: {
    flex: 1,
  },
  placeholderContainer: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default UnityLoadingState;
