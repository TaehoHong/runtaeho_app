import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  TouchableOpacity,
} from 'react-native';
import { Text } from '~/shared/components/typography';
import { Icon } from '~/shared/components/ui/Icon';

interface Shoe {
  id: string;
  brand: string;
  model: string;
  totalDistance: number;
}

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = 204;
const CARD_GAP = 20;

export const ShoeSelectionArea: React.FC = () => {
  // TODO: RunningFinishedViewModel에서 신발 데이터 가져오기
  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedShoeIndex, setSelectedShoeIndex] = useState(0);
  const availableShoes: Shoe[] = [
    { id: '1', brand: 'Nike', model: 'Nike V2K Running', totalDistance: 85.0 },
    { id: '2', brand: 'Adidas', model: 'Ultraboost 22', totalDistance: 85.0 },
    { id: '3', brand: 'Asics', model: 'Gel-Kayano 29', totalDistance: 120.0 },
  ];

  // 양쪽 패딩 계산 (첫번째와 마지막 카드를 중앙에 배치)
  const sidePadding = (screenWidth - CARD_WIDTH) / 2;

  // 스크롤 이벤트 핸들러
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollX / (CARD_WIDTH + CARD_GAP));
    if (index !== selectedShoeIndex && index >= 0 && index < availableShoes.length) {
      setSelectedShoeIndex(index);
    }
  };

  // 카드 선택 시 중앙으로 스크롤
  const handleCardPress = (index: number) => {
    setSelectedShoeIndex(index);
    scrollViewRef.current?.scrollTo({
      x: index * (CARD_WIDTH + CARD_GAP),
      animated: true,
    });
  };

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
            isActive={index === selectedShoeIndex}
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
  onPress: () => void;
}

const ShoeCard: React.FC<ShoeCardProps> = ({ shoe, isActive, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={[
        styles.shoeCard,
        isActive && styles.shoeCardActive,
      ]}>
        {/* 신발 이미지 */}
        <View style={styles.shoeImageContainer}>
          <Icon name="shoe" size={64}/>
          <Text style={styles.shoeImageText}>Image Coming Soon</Text>
        </View>

        {/* 신발 정보 */}
        <View style={styles.shoeInfo}>
          {/* 브랜드명과 "현재 착용" 배지 */}
          <View style={styles.shoeHeader}>
            <Text style={styles.shoeBrand}>{shoe.brand}</Text>
            {isActive && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>현재 착용</Text>
              </View>
            )}
          </View>

          {/* 모델명 */}
          <Text style={styles.shoeModel}>{shoe.model}</Text>

          {/* 누적 거리 */}
          <Text style={styles.shoeDistance}>
            누적 거리 {shoe.totalDistance.toFixed(1)}km
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
});