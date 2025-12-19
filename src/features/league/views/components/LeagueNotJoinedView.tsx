/**
 * LeagueNotJoinedView
 * 리그 미참여 상태 화면
 *
 * 티어 이미지 캐러셀 (부드러운 순환 애니메이션)
 * - 상태 변경 없이 연속 애니메이션으로 깜빡임 방지
 */

import { useEffect, useRef } from 'react';
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
const VISIBLE_SLOTS = 5; // 화면에 보이는 슬롯 수

// 슬롯별 설정 (위치 0~4, 중앙=2가 가장 큼)
const SLOT_CONFIGS = {
  width: [40, 55, 80, 55, 40],
  height: [25, 35, 51, 35, 25],
  opacity: [0.4, 0.7, 1.0, 0.7, 0.4],
  x: [-100, -60, 0, 60, 100],
};

// 애니메이션 설정
const ANIMATION_DURATION = 600;
const CYCLE_INTERVAL = 2000;

// 충분히 긴 inputRange 생성 (애니메이션이 오래 돌아도 커버)
const MAX_SCROLL = TIER_COUNT * 20;
const INPUT_RANGE = Array.from({ length: MAX_SCROLL + 1 }, (_, i) => i);

/**
 * 스크롤 값에서 특정 티어의 슬롯 위치 계산
 */
const getSlotPosition = (baseIndex: number, scrollVal: number): number => {
  const scrollInt = Math.floor(scrollVal);
  // 중앙(슬롯2)에 있어야 할 티어 인덱스
  const centerTierIndex = scrollInt % TIER_COUNT;
  // 이 티어의 상대 위치 (중앙 기준)
  let relativePos = baseIndex - centerTierIndex;
  // 순환 처리 (-3 ~ 2 범위로 정규화)
  while (relativePos < -Math.floor(TIER_COUNT / 2)) relativePos += TIER_COUNT;
  while (relativePos > Math.floor(TIER_COUNT / 2)) relativePos -= TIER_COUNT;
  // 슬롯 위치로 변환 (중앙=2)
  return relativePos + 2;
};

/**
 * 슬롯 위치에 따른 스타일 값 반환
 */
const getSlotValue = (slotPos: number, values: number[], offScreen: number): number => {
  if (slotPos < 0 || slotPos >= VISIBLE_SLOTS) return offScreen;
  return values[slotPos] ?? offScreen;
};

/**
 * 보간된 값 계산 (현재 슬롯 → 다음 슬롯)
 */
const interpolateValue = (
  baseIndex: number,
  scrollVal: number,
  values: number[],
  offScreen: number
): number => {
  const scrollInt = Math.floor(scrollVal);
  const scrollFrac = scrollVal - scrollInt;

  const currentSlot = getSlotPosition(baseIndex, scrollInt);
  const nextSlot = getSlotPosition(baseIndex, scrollInt + 1);

  const currentValue = getSlotValue(currentSlot, values, offScreen);
  const nextValue = getSlotValue(nextSlot, values, offScreen);

  return currentValue + (nextValue - currentValue) * scrollFrac;
};

/**
 * X 위치 계산 (화면 밖 처리 포함)
 */
const interpolateX = (baseIndex: number, scrollVal: number): number => {
  const scrollInt = Math.floor(scrollVal);
  const scrollFrac = scrollVal - scrollInt;

  const currentSlot = getSlotPosition(baseIndex, scrollInt);
  const nextSlot = getSlotPosition(baseIndex, scrollInt + 1);

  const getX = (slot: number): number => {
    if (slot < 0) return -150;
    if (slot >= VISIBLE_SLOTS) return 150;
    return SLOT_CONFIGS.x[slot] ?? 0;
  };

  const currentX = getX(currentSlot);
  const nextX = getX(nextSlot);

  return currentX + (nextX - currentX) * scrollFrac;
};

/**
 * 티어 아이템 컴포넌트
 * scrollAnim 값에 따라 자신의 위치를 계산
 */
const TierItem = ({
  tier,
  baseIndex,
  scrollAnim,
}: {
  tier: LeagueTierType;
  baseIndex: number;
  scrollAnim: Animated.Value;
}) => {
  // opacity
  const opacity = scrollAnim.interpolate({
    inputRange: INPUT_RANGE,
    outputRange: INPUT_RANGE.map((v) =>
      interpolateValue(baseIndex, v, SLOT_CONFIGS.opacity, 0)
    ),
    extrapolate: 'clamp',
  });

  // translateX
  const translateX = scrollAnim.interpolate({
    inputRange: INPUT_RANGE,
    outputRange: INPUT_RANGE.map((v) => interpolateX(baseIndex, v)),
    extrapolate: 'clamp',
  });

  // width
  const width = scrollAnim.interpolate({
    inputRange: INPUT_RANGE,
    outputRange: INPUT_RANGE.map((v) =>
      interpolateValue(baseIndex, v, SLOT_CONFIGS.width, 30)
    ),
    extrapolate: 'clamp',
  });

  // height
  const height = scrollAnim.interpolate({
    inputRange: INPUT_RANGE,
    outputRange: INPUT_RANGE.map((v) =>
      interpolateValue(baseIndex, v, SLOT_CONFIGS.height, 19)
    ),
    extrapolate: 'clamp',
  });

  // zIndex
  const zIndexValues = [1, 2, 3, 2, 1];
  const zIndex = scrollAnim.interpolate({
    inputRange: INPUT_RANGE,
    outputRange: INPUT_RANGE.map((v) =>
      interpolateValue(baseIndex, v, zIndexValues, 0)
    ),
    extrapolate: 'clamp',
  });

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

export const LeagueNotJoinedView = () => {
  // 페이드인 애니메이션
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  // 연속 스크롤 애니메이션 값 (0부터 계속 증가, 상태 변경 없음)
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const scrollValue = useRef(0);

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

  // 캐러셀 자동 순환 (상태 변경 없이 연속 애니메이션)
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
        {/* 티어 이미지 캐러셀 - 6개 모두 렌더링, 각자 위치 계산 */}
        <View style={styles.carouselContainer}>
          {ALL_TIERS.map((tier, index) => (
            <TierItem
              key={tier}
              tier={tier}
              baseIndex={index}
              scrollAnim={scrollAnim}
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
