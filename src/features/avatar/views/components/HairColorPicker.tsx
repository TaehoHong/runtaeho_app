import { useAppTranslation } from '~/i18n';
/**
 * 헤어 색상 선택 컴포넌트
 * SRP: 헤어 색상 선택 UI만 담당
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { HAIR_COLORS, type HairColor } from '~/features/avatar/models/avatarConstants';
import { GREY, PRIMARY } from '~/shared/styles';
import { SelectionCheck } from './SelectionCheck';

interface Props {
  selectedColor: string;  // HEX 형식
  onSelectColor: (color: HairColor) => void;
}

export const HairColorPicker: React.FC<Props> = ({
  selectedColor,
  onSelectColor,
}) => {
  const t = useAppTranslation();
  const currentColor = HAIR_COLORS.find(color => color.hex.toLowerCase() === selectedColor.toLowerCase());
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{t("헤어 색상")}</Text>
        <Text style={styles.colorName}>{currentColor?.name}</Text>
      </View>
      <View style={styles.colorsContainer}>
        {HAIR_COLORS.map((color) => {
          const isSelected = color.hex.toLowerCase() === selectedColor.toLowerCase();
          return (
            <TouchableOpacity
              key={color.id}
              accessibilityRole="button"
              accessibilityLabel={color.name}
              accessibilityState={{ selected: isSelected }}
              style={[
                styles.colorButton,
                isSelected && styles.colorButtonSelected,
              ]}
              onPress={() => onSelectColor(color)}
              activeOpacity={0.7}
              hitSlop={2}
            >
              <View
                style={[
                  styles.colorCircle,
                  { backgroundColor: color.hex },
                  color.hex === '#FFFFFF' && styles.whiteColorBorder,
                ]}
              />
              {isSelected && <SelectionCheck />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: GREY[900],
  },
  colorName: {
    fontSize: 12,
    color: GREY[700],
  },
  colorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 2,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  colorButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: GREY[100],
  },
  colorButtonSelected: {
    borderWidth: 3,
    borderColor: PRIMARY[500],
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  whiteColorBorder: {
    borderWidth: 1,
    borderColor: GREY[300],
  },
});
