/**
 * 카테고리 탭
 * SRP: 카테고리 선택 UI만 담당
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ItemCategory } from '~/features/avatar';
import { AVATAR_COLORS } from '~/features/avatar';

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
            style={[
              styles.tab,
              isSelected && styles.tabSelected,
            ]}
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
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginTop: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AVATAR_COLORS.UNSELECTED_TAB,
  },
  tabSelected: {
    backgroundColor: AVATAR_COLORS.SELECTED_TAB,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: AVATAR_COLORS.SECONDARY_TEXT,
  },
  tabTextSelected: {
    color: AVATAR_COLORS.PRIMARY_TEXT,
    fontWeight: '600',
  },
});
