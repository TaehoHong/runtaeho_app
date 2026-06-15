import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { PRIMARY, GREY } from '~/shared/styles';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Text } from '~/shared/components/typography';
import { Icon } from '~/shared/components/ui/Icon';
import { useShoeViewModel } from '~/features/shoes/viewmodels';
import type { Shoe } from '~/features/shoes/models';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = 204; // 204 (content) + 4 (borderWidth 2px * 2)
const CARD_GAP = 20;
const INTERVAL = CARD_WIDTH + CARD_GAP;
const BUCKET = INTERVAL; // each item occupies a fixed bucket
const bucketSidePadding = Math.round((screenWidth - BUCKET) / 2);

interface ShoeSelectionAreaProps {
  onShoeSelect?: (shoeId: number) => void;
  initialSelectedShoeId?: number | null;
}

export interface ShoeSnapCarouselProps {
  shoes: Shoe[];
  selectedShoeId: number | null;
  mainShoeId?: number | null;
  onShoeSelect?: (shoeId: number) => void;
}

export const ShoeSelectionArea: React.FC<ShoeSelectionAreaProps> = ({
  onShoeSelect,
  initialSelectedShoeId
}) => {
  // 신발 데이터 가져오기
  const { shoes, mainShoe, isLoadingShoes } = useShoeViewModel();

  const [selectedShoeId, setSelectedShoeId] = useState<number | null>(null);

  // 활성화된 신발만 필터링 (isEnabled === true) - useMemo로 메모이제이션
  const availableShoes = useMemo(() => {
    if(!shoes) return [];
    return shoes.filter(shoe => shoe.isEnabled);
  }, [shoes]);


  const handleShoeSelect = useCallback((shoeId: number) => {
    setSelectedShoeId(shoeId);
    onShoeSelect?.(shoeId);
  }, [onShoeSelect]);

  // initialSelectedShoeId가 있으면 우선 선택하고, 없으면 메인 신발을 기본 선택으로 설정
  useEffect(() => {
    if (selectedShoeId !== null) {
      return;
    }

    const defaultShoeId = initialSelectedShoeId ?? mainShoe?.id ?? null;
    if (defaultShoeId === null) {
      return;
    }

    if (availableShoes.some((shoe) => shoe.id === defaultShoeId)) {
      handleShoeSelect(defaultShoeId);
    }
  }, [initialSelectedShoeId, mainShoe, selectedShoeId, availableShoes, handleShoeSelect]);

  // 로딩 상태
  if (isLoadingShoes) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={GREY[800]} />
        </View>
      </View>
    );
  }

  // 신발이 없는 경우
  if (availableShoes.length === 0) {
    return null; // 또는 빈 상태 메시지 표시
  }

  return (
    <View style={styles.container}>
      <ShoeSnapCarousel
        shoes={availableShoes}
        selectedShoeId={selectedShoeId}
        mainShoeId={mainShoe?.id ?? null}
        onShoeSelect={handleShoeSelect}
      />
    </View>
  );
};

export const ShoeSnapCarousel: React.FC<ShoeSnapCarouselProps> = ({
  shoes,
  selectedShoeId,
  mainShoeId = null,
  onShoeSelect,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToShoe = useCallback((shoeId: number, animated: boolean) => {
    const targetIndex = shoes.findIndex((shoe) => shoe.id === shoeId);
    if (targetIndex === -1) {
      return;
    }

    scrollViewRef.current?.scrollTo({
      x: targetIndex * BUCKET,
      animated,
    });
  }, [shoes]);

  useEffect(() => {
    if (selectedShoeId !== null) {
      scrollToShoe(selectedShoeId, false);
    }
  }, [selectedShoeId, scrollToShoe]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollX / BUCKET);
    if (index >= 0 && index < shoes.length) {
      const shoeId = shoes[index]?.id;
      if (shoeId !== undefined && shoeId !== selectedShoeId) {
        onShoeSelect?.(shoeId);
      }
    }
  }, [shoes, selectedShoeId, onShoeSelect]);

  const handleCardPress = useCallback((index: number) => {
    const shoe = shoes[index];
    if (!shoe) {
      return;
    }

    scrollToShoe(shoe.id, true);
    onShoeSelect?.(shoe.id);
  }, [shoes, scrollToShoe, onShoeSelect]);

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        { paddingHorizontal: bucketSidePadding },
      ]}
      snapToInterval={INTERVAL}
      decelerationRate="fast"
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      {shoes.map((shoe, index) => (
        <View key={shoe.id} style={styles.itemContainer}>
          <ShoeSelectionCard
            shoe={shoe}
            isActive={shoe.id === selectedShoeId}
            isMain={shoe.id === mainShoeId}
            onPress={() => handleCardPress(index)}
          />
        </View>
      ))}
    </ScrollView>
  );
};

interface ShoeSelectionCardProps {
  shoe: Shoe;
  isActive: boolean;
  isMain: boolean;
  onPress: () => void;
}

export const ShoeSelectionCard: React.FC<ShoeSelectionCardProps> = ({
  shoe,
  isActive,
  isMain,
  onPress,
}) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.shoeCard, isActive && styles.shoeCardActive]}>
        {/* 신발 이미지 */}
        {/* <View style={styles.verticalGuide}/> */}
        <View style={styles.shoeImageContainer}>
          <Icon name="shoe" size={64}/>
          <Text style={styles.shoeImageText}>Image Coming Soon</Text>
        </View>

        {/* 신발 정보 */}
        <View style={styles.shoeInfo}>
          {/* 브랜드명과 "현재 착용" 배지 */}
          <View style={styles.shoeHeader}>
            <Text style={styles.shoeBrand}>{shoe.brand}</Text>
            {isMain && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>현재 착용</Text>
              </View>
            )}
          </View>

          {/* 모델명 */}
          <Text style={styles.shoeModel}>{shoe.model}</Text>

          {/* 누적 거리 (meters → km 변환) */}
          <Text style={styles.shoeDistance}>
            누적 거리 {(shoe.totalDistance / 1000).toFixed(1)}km
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContainer: {
    width: INTERVAL,
    alignItems: 'center',
  },
  shoeCard: {
    width: CARD_WIDTH,
    backgroundColor: GREY.WHITE,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  shoeCardActive: {
    borderColor: PRIMARY[700],
  },
  shoeImageContainer: {
    height: 113,
    margin:12,
    backgroundColor: GREY[50],
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  shoeImageText: {
    fontSize: 13,
    color: GREY[700],
    fontWeight: '400',
    fontFamily: 'Cafe24Proup'
  },
  shoeInfo: {
    padding: 12,
    gap: 4,
  },
  shoeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 2,
  },
  shoeBrand: {
    fontSize: 10,
    color: GREY[500],
    fontWeight: '600',
  },
  badge: {
    backgroundColor: PRIMARY[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 24,
  },
  badgeText: {
    fontSize: 8,
    color: PRIMARY[800],
    fontWeight: '500',
  },
  shoeModel: {
    fontSize: 14,
    fontWeight: '600',
    color: GREY[900],
    marginBottom: 4,
  },
  shoeDistance: {
    fontSize: 10,
    color: GREY[300],
    fontWeight: '500',
  },
  verticalGuide: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1,
    backgroundColor: 'blue',
    opacity: 0.3,
    zIndex: 9999,
  }
});
