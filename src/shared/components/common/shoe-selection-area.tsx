import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Text } from '~/shared/components/typography';

interface Shoe {
  id: string;
  brand: string;
  model: string;
  totalDistance: number;
}

export const ShoeSelectionArea: React.FC = () => {
  // TODO: RunningFinishedViewModel에서 신발 데이터 가져오기
  const [selectedShoeIndex, setSelectedShoeIndex] = useState(0);
  const availableShoes: Shoe[] = [
    { id: '1', brand: 'Nike', model: 'Air Zoom Pegasus', totalDistance: 150.5 },
    { id: '2', brand: 'Adidas', model: 'Ultraboost 22', totalDistance: 75.2 },
    { id: '3', brand: 'Asics', model: 'Gel-Kayano 29', totalDistance: 200.1 },
  ];

  const selectPreviousShoe = () => {
    setSelectedShoeIndex(prev =>
      prev > 0 ? prev - 1 : availableShoes.length - 1
    );
  };

  const selectNextShoe = () => {
    setSelectedShoeIndex(prev =>
      prev < availableShoes.length - 1 ? prev + 1 : 0
    );
  };

  return (
    <View style={styles.container}>
      {/* 신발 선택 제목 */}
      <View style={styles.header}>
        <Text style={styles.title}>러닝 신발 선택</Text>
      </View>

      {/* 신발 카드 슬라이더 */}
      <View style={styles.sliderContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          pagingEnabled
        >
          {availableShoes.map((shoe, index) => (
            <ShoeCard
              key={shoe.id}
              shoe={shoe}
              isActive={index === selectedShoeIndex}
              onPress={() => setSelectedShoeIndex(index)}
            />
          ))}
        </ScrollView>
      </View>
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
    <TouchableOpacity
      style={[styles.shoeCard, isActive && styles.activeShoeCard]}
      onPress={onPress}
    >
      {/* 신발 이미지 */}
      <View style={styles.shoeImageContainer}>
        <View style={styles.shoePlaceholder}>
          <Text style={styles.shoeImageText}>신발</Text>
        </View>
      </View>

      {/* 신발 정보 */}
      <View style={styles.shoeInfo}>
        <Text style={styles.shoeBrand}>{shoe.brand}</Text>
        <Text style={styles.shoeModel} numberOfLines={2}>
          {shoe.model}
        </Text>
        <Text style={styles.shoeDistance}>
          누적거리: {shoe.totalDistance.toFixed(1)}km
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 15,
    gap: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  sliderContainer: {
    height: 200,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 15,
  },
  shoeCard: {
    width: 200,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    gap: 12,
  },
  activeShoeCard: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  shoeImageContainer: {
    height: 100,
    width: '100%',
    borderRadius: 8,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shoePlaceholder: {
    width: 80,
    height: 60,
    backgroundColor: '#CCCCCC',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shoeImageText: {
    fontSize: 12,
    color: '#666666',
  },
  shoeInfo: {
    alignItems: 'center',
    gap: 4,
  },
  shoeBrand: {
    fontSize: 12,
    color: '#666666',
  },
  shoeModel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  shoeDistance: {
    fontSize: 11,
    color: '#666666',
  },
});