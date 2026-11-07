/** Unity 캐릭터가 준비되는 동안 표시하는 소프트 픽셀 로딩 화면. */
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useAppTranslation } from '~/i18n';
import { NativeText as Text } from '~/shared/components/typography';
import { ICONS } from '~/shared/constants/images';
import { GREY, PRIMARY } from '~/shared/styles';

export type UnityPlaceholderVariant = 'running' | 'avatar' | 'league';

interface UnityPlaceholderProps {
  variant: UnityPlaceholderVariant;
}

export const UnityPlaceholder: React.FC<UnityPlaceholderProps> = ({ variant }) => {
  const t = useAppTranslation();
  const [bounds, setBounds] = useState({ width: 375, height: 380 });
  const [labelHeight, setLabelHeight] = useState(24);
  const showText = variant === 'running';
  const artworkSize = Math.max(0, Math.min(
    164,
    bounds.width - 32,
    bounds.height - 55 - (showText ? 32 + labelHeight : 0)
  ));
  const float = useSharedValue(0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    // Reanimated의 기본 System 설정으로 동작 줄이기에서는 반복하지 않는다.
    float.value = withRepeat(withTiming(-5, {
      duration: 800,
      easing: Easing.inOut(Easing.ease),
    }), -1, true);
    sweep.value = withRepeat(withTiming(44, {
      duration: 1300,
      easing: Easing.inOut(Easing.ease),
    }), -1, true);

    return () => {
      cancelAnimation(float);
      cancelAnimation(sweep);
    };
  }, [float, sweep]);

  const characterStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }],
  }));
  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sweep.value }],
  }));

  return (
    <View
      style={styles.container}
      onLayout={({ nativeEvent: { layout } }) => setBounds({ width: layout.width, height: layout.height })}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('캐릭터 로딩 중')}
      accessibilityState={{ busy: true }}
      accessibilityLiveRegion="polite"
    >
      <View
        style={[styles.artworkFrame, { width: artworkSize, height: artworkSize }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={[styles.artwork, { transform: [{ scale: artworkSize / 164 }] }]}>
          <View style={styles.halo} />
          <View style={styles.inset} />
          <View style={styles.shadow} />
          <Animated.View style={characterStyle}>
            <Image source={ICONS.avatar} style={styles.character} resizeMode="contain" accessible={false} />
          </Animated.View>
        </View>
      </View>
      {showText && (
        <Text
          style={styles.loadingText}
          onLayout={({ nativeEvent: { layout } }) => setLabelHeight(layout.height)}
        >
          {t('캐릭터 로딩 중')}
        </Text>
      )}
      <View
        style={styles.progressTrack}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Animated.View style={[styles.progressFill, progressStyle]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: GREY.WHITE,
  },
  artworkFrame: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  artwork: {
    width: 164,
    height: 164,
    justifyContent: 'center',
    alignItems: 'center',
  },
  halo: {
    ...StyleSheet.absoluteFill,
    borderRadius: 48,
    backgroundColor: PRIMARY[50],
    transform: [{ rotate: '-8deg' }],
  },
  inset: {
    position: 'absolute',
    top: 12,
    right: 12,
    bottom: 12,
    left: 12,
    borderRadius: 40,
    backgroundColor: PRIMARY[100],
    opacity: 0.45,
  },
  shadow: {
    position: 'absolute',
    bottom: 27,
    width: 42,
    height: 6,
    borderRadius: 21,
    backgroundColor: PRIMARY[200],
  },
  character: {
    width: 73,
    height: 72,
  },
  loadingText: {
    marginTop: 32,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Pretendard-Medium',
    fontWeight: '500',
    textAlign: 'center',
    color: GREY[700],
  },
  progressTrack: {
    width: 72,
    height: 3,
    marginTop: 20,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: GREY[100],
  },
  progressFill: {
    width: 28,
    height: 3,
    borderRadius: 4,
    backgroundColor: PRIMARY[700],
  },
});

export default UnityPlaceholder;
