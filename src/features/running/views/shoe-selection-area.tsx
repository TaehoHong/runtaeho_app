import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
const CARD_WIDTH = 208; // 204 (content) + 4 (borderWidth 2px * 2)
const CARD_GAP = 20;

interface ShoeSelectionAreaProps {
  onShoeSelect?: (shoeId: number) => void;
}

export const ShoeSelectionArea: React.FC<ShoeSelectionAreaProps> = ({ onShoeSelect }) => {
  // 신발 데이터 가져오기
  const { shoes, mainShoe, isLoadingShoes } = useShoeViewModel();

  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedShoeId, setSelectedShoeId] = useState<number | null>(null);

  // 활성화된 신발만 필터링 (isEnabled === true) - useMemo로 메모이제이션
  const availableShoes = useMemo(() => {
    if(!shoes) return [];
    return shoes.filter(shoe => shoe.isEnabled);
  }, [shoes]);

  // 양쪽 패딩 계산 (첫번째와 마지막 카드를 중앙에 배치)
  const sidePadding = (screenWidth - CARD_WIDTH) / 2;

  // 메인 신발을 기본 선택으로 설정
  useEffect(() => {
    if (mainShoe && selectedShoeId === null) {
      setSelectedShoeId(mainShoe.id);
      // 메인 신발의 인덱스로 스크롤
      const mainShoeIndex = availableShoes.findIndex(shoe => shoe.id === mainShoe.id);
      if (mainShoeIndex !== -1) {
        scrollViewRef.current?.scrollTo({
          x: mainShoeIndex * (CARD_WIDTH + CARD_GAP),
          animated: false,
        });
      }
    }
  }, [mainShoe, selectedShoeId, availableShoes]);

  // 스크롤 이벤트 핸들러
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollX / (CARD_WIDTH + CARD_GAP));
    if (index >= 0 && index < availableShoes.length) {
      const shoeId = availableShoes[index]?.id;
      if (shoeId !== undefined && shoeId !== selectedShoeId) {
        setSelectedShoeId(shoeId);
        onShoeSelect?.(shoeId);
      }
    }
  }, [availableShoes, selectedShoeId, onShoeSelect]);

  // 카드 선택 시 중앙으로 스크롤 및 메인 신발 설정
  const handleCardPress = useCallback(async (index: number) => {
    const shoe = availableShoes[index];
    setSelectedShoeId(shoe!.id);
    scrollViewRef.current?.scrollTo({
      x: index * (CARD_WIDTH + CARD_GAP),
      animated: true,
    });
    onShoeSelect?.(shoe!.id);
  }, [availableShoes, onShoeSelect]);

  // 로딩 상태
  if (isLoadingShoes) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#414141" />
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
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: sidePadding },
        ]}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {availableShoes.map((shoe, index) => (
          <ShoeCard
            key={shoe.id}
            shoe={shoe}
            isActive={shoe.id === selectedShoeId}
            isMain={shoe.id === mainShoe?.id}
            onPress={() => handleCardPress(index)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

interface ShoeCardProps {
  shoe: Shoe;
  isActive: boolean;
  isMain: boolean;
  onPress: () => void;
}

const ShoeCard: React.FC<ShoeCardProps> = ({ shoe, isActive, isMain, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={[
        styles.shoeCard,
        isActive && styles.shoeCardActive,
      ]}>
        {/* 신발 이미지 */}
        <View style={styles.verticalGuide}/>
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
  scrollContent: {
    gap: 20,
  },
  shoeCard: {
    width: 204,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  shoeCardActive: {
    borderColor: '#00C851',
  },
  shoeImageContainer: {
    height: 113,
    margin:12,
    backgroundColor: '#FAFAFA',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  shoeImageText: {
    fontSize: 13,
    color: '#606060',
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
    color: '#9D9D9D',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#EEFEE9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 24,
  },
  badgeText: {
    fontSize: 8,
    color: '#00AF1F',
    fontWeight: '500',
  },
  shoeModel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#202020',
    marginBottom: 4,
  },
  shoeDistance: {
    fontSize: 10,
    color: '#BCBCBC',
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