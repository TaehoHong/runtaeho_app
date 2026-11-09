/**
 * 카테고리 탭
 * SRP: 카테고리 선택 UI만 담당
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ItemCategory } from '~/features/avatar';
import { GREY, PRIMARY } from '~/shared/styles';

interface Props {
  categories: readonly ItemCategory[];
  selectedIndex: number;
  onSelectCategory: (index: number) => void;
}

export const CategoryTabs: React.FC<Props> = ({
  categories,
  selectedIndex,
  onSelectCategory,
}) => {
  return (
    <View style={styles.container}>
      {categories.map((category, index) => {
        const isSelected = selectedIndex === index;
        return (
          <TouchableOpacity
            key={category.type}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            style={styles.tab}
            onPress={() => onSelectCategory(index)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                isSelected && styles.tabTextSelected,
              ]}
            >
              {category.displayName}
            </Text>
            {isSelected && <View style={styles.indicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: GREY[50],
    borderBottomWidth: 1,
    borderBottomColor: GREY[200],
  },
  tab: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 8,
  },
  indicator: {
    position: 'absolute',
    left: 32,
    right: 32,
    bottom: -1,
    height: 3,
    borderRadius: 3,
    backgroundColor: PRIMARY[900],
  },
  tabText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    color: GREY[700],
  },
  tabTextSelected: {
    color: GREY[900],
    fontWeight: '700',
  },
});
