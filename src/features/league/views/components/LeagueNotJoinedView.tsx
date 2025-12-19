/**
 * LeagueNotJoinedView
 * 리그 미참여 상태 화면
 *
 * 티어 이미지 캐러셀 (부드러운 순환 애니메이션)
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, Easing } from 'react-native';
import { Image } from 'expo-image';
import { TIER_IMAGES } from '~/shared/constants/images';
import { GREY } from '~/shared/styles';
import { LeagueTierType } from '../../models';

// 모든 티어 (6개)
const ALL_TIERS: LeagueTierType[] = [
  LeagueTierType.BRONZE,
  LeagueTierType.SILVER,
  LeagueTierType.GOLD,
  LeagueTierType.PLATINUM,
  LeagueTierType.DIAMOND,
  LeagueTierType.CHALLENGER,
];

const TIER_COUNT = ALL_TIERS.length;

// 위치별 크기/투명도 설정 (중앙이 가장 큼)
// 5개 슬롯: 0=왼쪽 끝, 1=왼쪽, 2=중앙, 3=오른쪽, 4=오른쪽 끝
const SLOT_CONFIG = [
  { width: 40, height: 25, opacity: 0.4, x: -100 },  // 슬롯 0
  { width: 55, height: 35, opacity: 0.7, x: -50 },   // 슬롯 1
  { width: 80, height: 51, opacity: 1.0, x: 0 },     // 슬롯 2 (중앙)
  { width: 55, height: 35, opacity: 0.7, x: 50 },    // 슬롯 3
  { width: 40, height: 25, opacity: 0.4, x: 100 },   // 슬롯 4
];

// 애니메이션 설정
const ANIMATION_DURATION = 600; // 전환 시간 (ms)
const CYCLE_INTERVAL = 2000;    // 순환 간격 (ms)

// 슬롯 0 기본값 (화면 밖으로 나갈 때 사용)
const DEFAULT_SLOT = { width: 40, height: 25, opacity: 0.4, x: -100 };

/**
 * 티어 아이템 컴포넌트 - 슬롯 기반 애니메이션
 */
const TierItem = ({
  tier,
  slotIndex,
  animProgress,
}: {
  tier: LeagueTierType;
  slotIndex: number; // 현재 슬롯 위치 (0~4)
  animProgress: Animated.Value; // 0~1 애니메이션 진행도
}) => {
  // 현재 슬롯과 다음 슬롯 (왼쪽으로 이동)
  const currentSlot = SLOT_CONFIG[slotIndex] ?? DEFAULT_SLOT;
  const nextSlotIndex = slotIndex === 0 ? -1 : slotIndex - 1; // -1이면 화면 밖
  const nextSlot = nextSlotIndex >= 0 ? SLOT_CONFIG[nextSlotIndex] : null;

  // 화면 밖으로 나가는 경우
  if (nextSlot === null || nextSlot === undefined) {
    // 슬롯 0에서 화면 밖으로 사라짐
    const opacity = animProgress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [currentSlot.opacity, 0, 0],
      extrapolate: 'clamp',
    });

    const translateX = animProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [currentSlot.x, -150],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[
          styles.tierItemContainer,
          {
            opacity,
            transform: [{ translateX }],
            zIndex: 0,
          },
        ]}
      >
        <View style={{ width: currentSlot.width, height: currentSlot.height }}>
          <Image
            source={TIER_IMAGES[tier]}
            style={styles.tierImage}
            contentFit="contain"
          />
        </View>
      </Animated.View>
    );
  }

  // 일반적인 슬롯 간 이동
  const width = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [currentSlot.width, nextSlot.width],
    extrapolate: 'clamp',
  });

  const height = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [currentSlot.height, nextSlot.height],
    extrapolate: 'clamp',
  });

  const opacity = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [currentSlot.opacity, nextSlot.opacity],
    extrapolate: 'clamp',
  });

  const translateX = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [currentSlot.x, nextSlot.x],
    extrapolate: 'clamp',
  });

  // zIndex는 중앙에 가까울수록 높음
  const zIndex = slotIndex === 2 ? 3 : slotIndex === 1 || slotIndex === 3 ? 2 : 1;

  return (
    <Animated.View
      style={[
        styles.tierItemContainer,
        {
          opacity,
          transform: [{ translateX }],
          zIndex,
        },
      ]}
    >
      <Animated.View style={{ width, height }}>
        <Image
          source={TIER_IMAGES[tier]}
          style={styles.tierImage}
          contentFit="contain"
        />
      </Animated.View>
    </Animated.View>
  );
};

// 슬롯 4 기본값 (오른쪽 끝)
const SLOT_4_CONFIG = { width: 40, height: 25, opacity: 0.4, x: 100 };

/**
 * 새로 들어오는 티어 아이템 (오른쪽에서 등장)
 */
const EnteringTierItem = ({
  tier,
  animProgress,
}: {
  tier: LeagueTierType;
  animProgress: Animated.Value;
}) => {
  const startConfig = { width: 30, height: 19, opacity: 0, x: 150 };
  const endConfig = SLOT_CONFIG[4] ?? SLOT_4_CONFIG; // 슬롯 4로 진입

  const width = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [startConfig.width, endConfig.width],
    extrapolate: 'clamp',
  });

  const height = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [startConfig.height, endConfig.height],
    extrapolate: 'clamp',
  });

  const opacity = animProgress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, endConfig.opacity * 0.5, endConfig.opacity],
    extrapolate: 'clamp',
  });

  const translateX = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [startConfig.x, endConfig.x],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.tierItemContainer,
        {
          opacity,
          transform: [{ translateX }],
          zIndex: 0,
        },
      ]}
    >
      <Animated.View style={{ width, height }}>
        <Image
          source={TIER_IMAGES[tier]}
          style={styles.tierImage}
          contentFit="contain"
        />
      </Animated.View>
    </Animated.View>
  );
};

/**
 * 현재 슬롯에 표시할 티어 배열 계산
 * centerTierIndex: 중앙(슬롯2)에 올 티어의 인덱스
 * 반환: [슬롯0티어, 슬롯1티어, 슬롯2티어, 슬롯3티어, 슬롯4티어]
 */
const getVisibleTiers = (centerTierIndex: number): LeagueTierType[] => {
  const result: LeagueTierType[] = [];
  for (let offset = -2; offset <= 2; offset++) {
    const tierIndex = (centerTierIndex + offset + TIER_COUNT) % TIER_COUNT;
    const tier = ALL_TIERS[tierIndex];
    if (tier !== undefined) {
      result.push(tier);
    }
  }
  return result;
};

/**
 * 다음에 오른쪽에서 들어올 티어 계산
 */
const getNextEnteringTier = (centerTierIndex: number): LeagueTierType => {
  const nextTierIndex = (centerTierIndex + 3) % TIER_COUNT;
  return ALL_TIERS[nextTierIndex] ?? LeagueTierType.BRONZE;
};

export const LeagueNotJoinedView = () => {
  // 페이드인 애니메이션
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  // 현재 중앙에 표시될 티어 인덱스 (0 = BRONZE가 중앙)
  const [centerTierIndex, setCenterTierIndex] = useState(0);

  // 애니메이션 진행도 (0 = 정지, 1 = 완료)
  const animProgress = useRef(new Animated.Value(0)).current;

  // 현재 표시 중인 티어들
  const visibleTiers = getVisibleTiers(centerTierIndex);
  const enteringTier = getNextEnteringTier(centerTierIndex);

  // 초기 페이드인 애니메이션
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateY]);

  // 캐러셀 자동 순환
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    let isMounted = true;

    const animate = () => {
      if (!isMounted) return;

      // 애니메이션 진행도를 0에서 1로
      Animated.timing(animProgress, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && isMounted) {
          // 애니메이션 완료 후 상태 업데이트
          setCenterTierIndex((prev) => (prev + 1) % TIER_COUNT);
          // 진행도 리셋
          animProgress.setValue(0);
        }
      });
    };

    // 초기 딜레이 후 시작
    const initialDelay = setTimeout(() => {
      animate();
      intervalId = setInterval(animate, CYCLE_INTERVAL);
    }, 1500);

    return () => {
      isMounted = false;
      clearTimeout(initialDelay);
      if (intervalId) clearInterval(intervalId);
    };
  }, [animProgress]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.card}>
        {/* 티어 이미지 캐러셀 */}
        <View style={styles.carouselContainer}>
          {/* 기존 5개 슬롯의 티어들 */}
          {visibleTiers.map((tier, slotIndex) => (
            <TierItem
              key={`${tier}-${slotIndex}`}
              tier={tier}
              slotIndex={slotIndex}
              animProgress={animProgress}
            />
          ))}
          {/* 오른쪽에서 새로 들어오는 티어 */}
          <EnteringTierItem
            key={`entering-${enteringTier}`}
            tier={enteringTier}
            animProgress={animProgress}
          />
        </View>

        {/* 안내 텍스트 */}
        <Text style={styles.title}>러닝을 기록하여 리그에 참여하세요!</Text>
        <Text style={styles.description}>
          매주 다른 러너들과 경쟁하고{'\n'}승격하여 더 높은 티어에 도전하세요
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: GREY[50],
    padding: 16,
    minHeight: 400,
  },
  card: {
    backgroundColor: GREY.WHITE,
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 343,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  carouselContainer: {
    position: 'relative',
    width: '100%',
    height: 80,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierItemContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Pretendard-Bold',
    fontWeight: '700',
    color: GREY[900],
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Pretendard-Regular',
    fontWeight: '400',
    color: GREY[500],
    textAlign: 'center',
    lineHeight: 22,
  },
});
