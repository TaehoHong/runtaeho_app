/**
 * Date Filter Tabs Component
 * Figma: Frame 637779 (68, 68, 240x34)
 *
 * 3개의 Date-sell 컴포넌트 (주/월/년 필터)
 * 각 탭 크기: 80x34
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Period } from '../../models';
import { PRIMARY, GREY } from '~/shared/styles';

interface DateFilterTabsProps {
  selected: Period;
  onSelect: (period: Period) => void;
}

export const DateFilterTabs: React.FC<DateFilterTabsProps> = ({
  selected,
  onSelect,
}) => {
  const tabs = [
    { label: '주', value: Period.WEEK },
    { label: '월', value: Period.MONTH },
    { label: '년', value: Period.YEAR },
  ];

  // 선택된 탭의 인덱스 계산
  const selectedIndex = tabs.findIndex((tab) => tab.value === selected);

  // 애니메이션 값 초기화 (선택된 탭의 위치로)
  const animatedValue = React.useRef(new Animated.Value(selectedIndex)).current;

  // 선택이 변경될 때 애니메이션 실행
  React.useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: selectedIndex,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  }, [selectedIndex, animatedValue]);

  // 선택된 배경의 translateX 계산 (각 탭의 너비 80)
  const translateX = animatedValue.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, 80, 160],
  });

  return (
    <View style={styles.container}>
      {/* 슬라이딩 배경 */}
      <Animated.View
        style={[
          styles.slidingBackground,
          {
            transform: [{ translateX }],
          },
        ]}
      />

      {/* 탭 버튼들 */}
      {tabs.map((tab) => {
        const isSelected = selected === tab.value;

        return (
          <TouchableOpacity
            key={tab.value}
            style={styles.tab}
            onPress={() => onSelect(tab.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 21,
    backgroundColor: GREY.WHITE,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  slidingBackground: {
    position: 'absolute',
    width: 80,
    height: 34,
    backgroundColor: PRIMARY[600],
    borderRadius: 24,
    left: 0,
    top: 0,
  },
  tab: {
    width: 80,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: GREY[500],
  },
  tabTextSelected: {
    color: GREY.WHITE,
    fontWeight: '600',
  },
});
