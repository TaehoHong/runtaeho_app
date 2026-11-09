import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GREY, PRIMARY } from '~/shared/styles';

export const SelectionCheck = () => (
  <View style={styles.check} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Text style={styles.text} allowFontScaling={false}>✓</Text>
  </View>
);

const styles = StyleSheet.create({
  check: {
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
  text: {
    color: GREY.WHITE,
    fontSize: 10,
    fontWeight: 'bold',
  },
});
