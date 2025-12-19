/**
 * 헤어 색상 선택 컴포넌트
 * SRP: 헤어 색상 선택 UI만 담당
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { HAIR_COLORS, type HairColor } from '~/features/avatar/models/avatarConstants';
import { GREY, PRIMARY } from '~/shared/styles';

interface Props {
  selectedColor: string;  // HEX 형식
  onSelectColor: (color: HairColor) => void;
}

export const HairColorPicker: React.FC<Props> = ({
  selectedColor,
  onSelectColor,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>헤어 색상</Text>
      <View style={styles.colorsContainer}>
        {HAIR_COLORS.map((color) => {
          const isSelected = color.hex.toLowerCase() === selectedColor.toLowerCase();
          return (
            <TouchableOpacity
              key={color.id}
              style={[
                styles.colorButton,
                isSelected && styles.colorButtonSelected,
              ]}
              onPress={() => onSelectColor(color)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.colorCircle,
                  { backgroundColor: color.hex },
                  color.hex === '#FFFFFF' && styles.whiteColorBorder,
                ]}
              />
              {isSelected && (
                <View style={styles.checkMark}>
                  <Text style={styles.checkMarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: GREY[700],
    marginBottom: 12,
  },
  colorsContainer: {
    flexDirection: 'row',
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
  checkMark: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PRIMARY[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMarkText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
