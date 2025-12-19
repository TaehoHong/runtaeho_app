/**
 * LeagueNotJoinedView
 * 리그 미참여 상태 화면
 *
 * 티어 이미지 캐러셀 (부드러운 순환 애니메이션)
 * - Animated.modulo를 사용한 무한 순환
 * - 모듈 레벨 캐싱으로 성능 최적화
 */

import { useEffect, useRef, useMemo } from 'react';
import { Animated, StyleSheet, Text, View, Easing } from 'react-native';
import { Image } from 'expo-image';
import { TIER_IMAGES } from '~/shared/constants/images';
import { GREY } from '~/shared/styles';
import { LeagueTierType } from '../../models';

// 티어 이미지 목록 (개수 변경 가능)
const ALL_TIERS: LeagueTierType[] = [
  LeagueTierType.BRONZE,
  LeagueTierType.SILVER,
  LeagueTierType.GOLD,
  LeagueTierType.PLATINUM,
  LeagueTierType.DIAMOND,
  LeagueTierType.CHALLENGER,
  LeagueTierType.BRONZE,
  LeagueTierType.SILVER,
  LeagueTierType.GOLD,
  LeagueTierType.PLATINUM,
  LeagueTierType.DIAMOND,
  LeagueTierType.CHALLENGER,
];

// 상수 (ALL_TIERS 기반으로 자동 계산)
const ITEM_COUNT = ALL_TIERS.length;
const VISIBLE_SLOTS = 5;
const CENTER_SLOT = Math.floor(VISIBLE_SLOTS / 2); // 2

// 슬롯별 설정 (위치 0~4, 중앙=2가 가장 큼)
const SLOT_CONFIGS = {
  width: [40, 55, 80, 55, 40],
  height: [25, 35, 51, 35, 25],
  opacity: [0.4, 0.7, 1.0, 0.7, 0.4],
  x: [-100, -60, 0, 60, 100],
} as const;

// 애니메이션 설정
const ANIMATION_DURATION = 600;
const CYCLE_INTERVAL = 2000;

// InputRange: 한 사이클(0~ITEM_COUNT) 커버
const CYCLE_INPUT_RANGE = Array.from({ length: ITEM_COUNT + 1 }, (_, i) => i);

/**
 * 스크롤 값에서 특정 아이템의 슬롯 위치 계산
 * - ITEM_COUNT 개수에 상관없이 동작
 * - 중앙(CENTER_SLOT) 기준으로 상대 위치 계산
 */
const getSlotPosition = (baseIndex: number, scrollInt: number): number => {
  // 음수 처리를 위한 안전한 modulo
  const centerItemIndex = ((scrollInt % ITEM_COUNT) + ITEM_COUNT) % ITEM_COUNT;
  let relativePos = baseIndex - centerItemIndex;

  // 순환 정규화: -half ~ +half 범위로 조정
  const halfCount = Math.floor(ITEM_COUNT / 2);
  while (relativePos < -halfCount) relativePos += ITEM_COUNT;
  while (relativePos >= ITEM_COUNT - halfCount) relativePos -= ITEM_COUNT;

  return relativePos + CENTER_SLOT;
};

/**
 * 슬롯 위치에 따른 스타일 값 반환
 */
const getSlotValue = (
  slotPos: number,
  values: readonly number[],
  offScreen: number
): number => {
  if (slotPos < 0 || slotPos >= VISIBLE_SLOTS) return offScreen;
  return values[slotPos] ?? offScreen;
};

/**
 * X 위치 값 반환
 */
const getX = (slot: number): number => {
  if (slot < 0) return -150;
  if (slot >= VISIBLE_SLOTS) return 150;
  return SLOT_CONFIGS.x[slot] ?? 0;
};

/**
 * 특정 아이템의 OutputRange 생성
 * - 정수 시점(0, 1, 2, ..., ITEM_COUNT)의 값을 계산
 * - 중간 값은 React Native interpolate가 선형 보간
 */
const createOutputRanges = (baseIndex: number) => {
  const x: number[] = [];
  const opacity: number[] = [];
  const width: number[] = [];
  const height: number[] = [];

  for (let scrollInt = 0; scrollInt <= ITEM_COUNT; scrollInt++) {
    const currentSlot = getSlotPosition(baseIndex, scrollInt);

    // X 위치
    x.push(getX(currentSlot));

    // Opacity
    opacity.push(getSlotValue(currentSlot, SLOT_CONFIGS.opacity, 0));

    // Width, Height
    width.push(getSlotValue(currentSlot, SLOT_CONFIGS.width, 30));
    height.push(getSlotValue(currentSlot, SLOT_CONFIGS.height, 19));
  }

  return { x, opacity, width, height };
};

// 모든 아이템의 OutputRange를 미리 계산 (모듈 레벨 캐싱)
const ALL_OUTPUT_RANGES = ALL_TIERS.map((_, index) => createOutputRanges(index));

/**
 * 티어 아이템 컴포넌트
 */
const TierItem = ({
  tier,
  baseIndex,
  normalizedScroll,
}: {
  tier: LeagueTierType;
  baseIndex: number;
  normalizedScroll: Animated.AnimatedModulo<number>;
}) => {
  const outputRanges = ALL_OUTPUT_RANGES[baseIndex]!;

  const translateX = normalizedScroll.interpolate({
    inputRange: CYCLE_INPUT_RANGE,
    outputRange: outputRanges.x,
  });

  const opacity = normalizedScroll.interpolate({
    inputRange: CYCLE_INPUT_RANGE,
    outputRange: outputRanges.opacity,
  });

  const width = normalizedScroll.interpolate({
    inputRange: CYCLE_INPUT_RANGE,
    outputRange: outputRanges.width,
  });

  const height = normalizedScroll.interpolate({
    inputRange: CYCLE_INPUT_RANGE,
    outputRange: outputRanges.height,
  });

  return (
    <Animated.View
      style={[
        styles.tierItemContainer,
        {
          opacity,
          transform: [{ translateX }],
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

export const LeagueNotJoinedView = () => {
  // 페이드인 애니메이션
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  // 연속 스크롤 값 (무한히 증가)
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const scrollValue = useRef(0);

  // 정규화된 스크롤 값 (0 ~ ITEM_COUNT 범위로 순환)
  const normalizedScroll = useMemo(
    () => Animated.modulo(scrollAnim, ITEM_COUNT),
    [scrollAnim]
  );

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

      scrollValue.current += 1;

      Animated.timing(scrollAnim, {
        toValue: scrollValue.current,
        duration: ANIMATION_DURATION,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }).start();
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
  }, [scrollAnim]);

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
          {ALL_TIERS.map((tier, index) => (
            <TierItem
              key={index}
              tier={tier}
              baseIndex={index}
              normalizedScroll={normalizedScroll}
            />
          ))}
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
