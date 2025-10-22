/**
 * Date Filter Tabs Component
 * Figma: Frame 637779 (68, 68, 240x34)
 *
 * 3개의 Date-sell 컴포넌트 (주/월/년 필터)
 * 각 탭 크기: 80x34
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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

  return (
    <View style={styles.container}>
      {tabs.map((tab, index) => {
        const isSelected = selected === tab.value;
        const isFirst = index === 0;
        const isLast = index === tabs.length - 1;

        return (
          <TouchableOpacity
            key={tab.value}
            style={[
              styles.tab,
              isSelected && styles.tabSelected,
              isFirst && styles.tabFirst,
              isLast && styles.tabLast,
            ]}
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
    overflow: 'hidden',
    backgroundColor: GREY[50],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    width: 80,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabFirst: {
    // 스타일 제거 (전체 컨테이너에 borderRadius 적용)
  },
  tabLast: {
    // 스타일 제거
  },
  tabSelected: {
    backgroundColor: PRIMARY[600],
    borderRadius: 24,
    marginVertical: 4,
    marginHorizontal: 4,
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
