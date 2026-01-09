/**
 * RankingSection Component
 * 순위표 섹션
 *
 * 순위 상승 애니메이션:
 * - "나"가 위로 연속적으로 올라감 (멈춤 없음)
 * - 밀려나는 항목들이 시차를 두고 아래로 이동
 * - 스케일 효과로 이동 중인 항목 강조
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, Easing, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { GREY, PRIMARY } from '~/shared/styles';
import type { LeagueParticipant } from '../../models';
import { RankItem } from './RankItem';

const RANK_ITEM_HEIGHT = 56;
const TOTAL_ANIMATION_DURATION = 1200; // 전체 애니메이션 시간 (ms) - 이동 거리와 무관하게 고정

interface RankingSectionProps {
  participants: LeagueParticipant[];
  previousRank?: number | undefined;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export const RankingSection = ({
  participants,
  previousRank,
  isRefreshing = false,
  onRefresh,
}: RankingSectionProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayOrder, setDisplayOrder] = useState<LeagueParticipant[]>([]);

  // FlatList ref
  const flatListRef = useRef<FlatList<LeagueParticipant>>(null);

  // "나" 애니메이션 값
  const myAnimatedY = useRef(new Animated.Value(0)).current;
  const myAnimatedScale = useRef(new Animated.Value(1)).current;

  // 밀려나는 항목들의 애니메이션 값 (최대 10개 지원)
  const displacedAnimations = useRef(
    Array.from({ length: 10 }, () => new Animated.Value(0))
  ).current;

  // "나" 참가자 찾기
  const myParticipant = participants.find(p => p.isMe);
  const myCurrentRank = myParticipant?.rank ?? 0;
  const myIndex = participants.findIndex(p => p.isMe);

  // "나"의 초기 인덱스 (애니메이션 시작 위치)
  const myInitialIndex = displayOrder.findIndex(p => p.isMe);

  // 실제 시작 위치 (참가자 수 초과 시 마지막 위치로 제한)
  const effectiveStartRank = previousRank !== undefined
    ? Math.min(previousRank, participants.length)
    : myCurrentRank;

  // 이동해야 할 칸 수
  const totalSteps = effectiveStartRank - myCurrentRank;

  // getItemLayout: FlatList 성능 최적화 및 initialScrollIndex 지원
  const getItemLayout = useCallback((_: ArrayLike<LeagueParticipant> | null | undefined, index: number) => ({
    length: RANK_ITEM_HEIGHT,
    offset: RANK_ITEM_HEIGHT * index,
    index,
  }), []);

  // 초기 스크롤 인덱스 계산 (중앙 배치를 위해 약간 위쪽 인덱스)
  // viewPosition 0.5를 사용하여 중앙에 배치
  const initialScrollIndex = myIndex >= 0 ? myIndex : 0;

  // "나"를 중앙에 배치하는 스크롤 함수
  const scrollToMyRankCenter = useCallback(() => {
    if (myIndex >= 0 && displayOrder.length > 0) {
      flatListRef.current?.scrollToIndex({
        index: myIndex,
        animated: false,
        viewPosition: 0.5, // 중앙 배치
      });
    }
  }, [myIndex, displayOrder.length]);

  // 탭 포커스 시 "나"를 중앙에 배치
  useFocusEffect(
    useCallback(() => {
      if (isAnimating) return;

      // 즉시 스크롤 (딜레이 최소화)
      requestAnimationFrame(() => {
        scrollToMyRankCenter();
      });
    }, [isAnimating, scrollToMyRankCenter])
  );

  // onScrollToIndexFailed 핸들러 (아이템이 아직 렌더링되지 않은 경우)
  const onScrollToIndexFailed = useCallback((info: {
    index: number;
    highestMeasuredFrameIndex: number;
    averageItemLength: number;
  }) => {
    // 약간의 딜레이 후 재시도
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: info.index,
        animated: false,
        viewPosition: 0.5,
      });
    }, 100);
  }, []);

  // 애니메이션 실행
  useEffect(() => {
    if (previousRank === undefined || myCurrentRank <= 0 || totalSteps <= 0) {
      setDisplayOrder([...participants]);
      setIsAnimating(false);
      return;
    }

    // 초기 순서 설정 (나를 previousRank 위치에 배치)
    const reordered = createInitialOrder(participants, myCurrentRank, previousRank);
    setDisplayOrder(reordered);
    setIsAnimating(true);

    // 애니메이션 값 초기화
    myAnimatedY.setValue(0);
    myAnimatedScale.setValue(1);
    displacedAnimations.forEach(anim => anim.setValue(0));

    // 각 스텝당 시간 (전체 시간을 스텝 수로 나눔)
    const stepDuration = TOTAL_ANIMATION_DURATION / totalSteps;

    // "나"의 이동 애니메이션 (연속, 가감속 적용)
    const myMoveAnimation = Animated.timing(myAnimatedY, {
      toValue: -RANK_ITEM_HEIGHT * totalSteps,
      duration: TOTAL_ANIMATION_DURATION,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    });

    // 스케일 업 애니메이션 (시작할 때)
    const scaleUpAnimation = Animated.timing(myAnimatedScale, {
      toValue: 1.1,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });

    // 밀려나는 항목들의 애니메이션 (시차 적용)
    const displacedMoveAnimations: Animated.CompositeAnimation[] = [];
    for (let i = 0; i < totalSteps; i++) {
      const delay = stepDuration * i;
      displacedMoveAnimations.push(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(displacedAnimations[i]!, {
            toValue: RANK_ITEM_HEIGHT,
            duration: stepDuration,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ])
      );
    }

    // 스케일 다운 애니메이션 (끝날 때)
    const scaleDownAnimation = Animated.timing(myAnimatedScale, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });

    // 전체 애니메이션 실행
    Animated.sequence([
      Animated.parallel([
        scaleUpAnimation,
        myMoveAnimation,
        ...displacedMoveAnimations,
      ]),
      scaleDownAnimation,
    ]).start(() => {
      setIsAnimating(false);
      setDisplayOrder([...participants]);
    });
  }, [previousRank, myCurrentRank, totalSteps, participants]);

  // renderItem 함수
  const renderItem = useCallback(({ item: participant, index }: { item: LeagueParticipant; index: number }) => {
    // 애니메이션 중인 "나" 항목
    if (participant.isMe && isAnimating) {
      return (
        <Animated.View
          style={[
            styles.animatedItem,
            {
              transform: [
                { translateY: myAnimatedY },
                { scale: myAnimatedScale },
              ],
            },
          ]}
        >
          <View style={styles.animatedMeContent}>
            <Text style={styles.animatedRank}>{myCurrentRank}</Text>
            <View style={styles.animatedAvatar} />
            <Text style={styles.animatedName}>나</Text>
            <Text style={styles.animatedDistance}>
              {(participant.distance / 1000).toFixed(2)}km
            </Text>
          </View>
        </Animated.View>
      );
    }

    // 애니메이션 중 밀려나는 항목들 ("나" 위의 항목들)
    if (isAnimating && myInitialIndex > 0) {
      const displacedIndex = myInitialIndex - 1 - index;
      if (displacedIndex >= 0 && displacedIndex < totalSteps) {
        return (
          <Animated.View
            style={[
              styles.displacedItem,
              {
                transform: [{ translateY: displacedAnimations[displacedIndex]! }],
              },
            ]}
          >
            <RankItem
              participant={{
                ...participant,
                rank: index + 1,
              }}
            />
          </Animated.View>
        );
      }
    }

    // 일반 항목
    return (
      <RankItem
        participant={{
          ...participant,
          rank: index + 1,
        }}
      />
    );
  }, [isAnimating, myAnimatedY, myAnimatedScale, myCurrentRank, myInitialIndex, totalSteps, displacedAnimations]);

  // keyExtractor
  const keyExtractor = useCallback((item: LeagueParticipant, index: number) => {
    if (item.isMe && isAnimating) {
      return `me-${item.rank}`;
    }
    if (isAnimating && myInitialIndex > 0) {
      const displacedIndex = myInitialIndex - 1 - index;
      if (displacedIndex >= 0 && displacedIndex < totalSteps) {
        return `displaced-${item.rank}-${index}`;
      }
    }
    return `${item.rank}`;
  }, [isAnimating, myInitialIndex, totalSteps]);

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>순위표</Text>
      </View>

      {/* 순위 리스트 (FlatList) */}
      <View style={styles.listContainer}>
        <FlatList
          ref={flatListRef}
          data={displayOrder}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          initialScrollIndex={initialScrollIndex}
          onScrollToIndexFailed={onScrollToIndexFailed}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor={PRIMARY[600]}
              />
            ) : undefined
          }
        />

        {/* 하단 스크롤 힌트 (fade-out 그라데이션) */}
        <LinearGradient
          colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 1)']}
          style={styles.bottomFade}
          pointerEvents="none"
        />
      </View>
    </View>
  );
};

/**
 * 초기 순서 생성: "나"를 previousRank 위치에 배치
 * previousRank가 참가자 수를 초과하면 마지막 위치에 배치
 */
function createInitialOrder(
  participants: LeagueParticipant[],
  myCurrentRank: number,
  previousRank: number
): LeagueParticipant[] {
  const myParticipant = participants.find(p => p.isMe);
  if (!myParticipant) return [...participants];

  const others = participants.filter(p => !p.isMe);
  const targetIndex = Math.min(previousRank - 1, participants.length - 1);

  const result: LeagueParticipant[] = [];
  let otherIndex = 0;

  for (let i = 0; i < participants.length; i++) {
    if (i === targetIndex) {
      result.push(myParticipant);
    } else {
      if (otherIndex < others.length) {
        result.push(others[otherIndex]!);
        otherIndex++;
      }
    }
  }

  return result;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GREY.WHITE,
    marginHorizontal: 16,
    marginTop: 23,
    borderRadius: 8,
    marginBottom: 100,
  },
  header: {
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Pretendard-SemiBold',
    fontWeight: '600',
    color: GREY[900],
  },
  listContainer: {
    flex: 1,
    position: 'relative',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  animatedItem: {
    zIndex: 10,
  },
  displacedItem: {
    zIndex: 5,
  },
  animatedMeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY[50],
    paddingHorizontal: 10,
    paddingVertical: 12,
    height: 56,
    gap: 12,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: PRIMARY[600],
    shadowColor: PRIMARY[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  animatedRank: {
    fontSize: 16,
    fontFamily: 'Pretendard-Bold',
    fontWeight: '700',
    color: PRIMARY[600],
    minWidth: 24,
    textAlign: 'center',
  },
  animatedAvatar: {
    width: 32,
    height: 32,
    backgroundColor: PRIMARY[600],
    borderRadius: 4,
  },
  animatedName: {
    fontSize: 14,
    fontFamily: 'Pretendard-SemiBold',
    fontWeight: '600',
    color: PRIMARY[600],
    flex: 1,
  },
  animatedDistance: {
    fontSize: 14,
    fontFamily: 'Pretendard-Bold',
    fontWeight: '700',
    color: PRIMARY[600],
  },
});
