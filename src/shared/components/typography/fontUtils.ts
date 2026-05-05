import { StyleSheet, type TextStyle } from 'react-native';

export const PRETENDARD_FONT_FAMILY = 'Pretendard';
export const CAFE24_FONT_FAMILY = 'Cafe24PROUP';

const pretendard = (fontWeight?: TextStyle['fontWeight']): TextStyle => ({
  fontFamily: PRETENDARD_FONT_FAMILY,
  ...(fontWeight ? { fontWeight } : {}),
});

/**
 * 공통 폰트 스타일 정의
 */
export const fontStyles = StyleSheet.create({
  default: pretendard(),
  thin: pretendard('100'),
  extraLight: pretendard('200'),
  light: pretendard('300'),
  regular: pretendard('400'),
  medium: pretendard('500'),
  semiBold: pretendard('600'),
  bold: pretendard('700'),
  extraBold: pretendard('800'),
  black: pretendard('900'),
});
