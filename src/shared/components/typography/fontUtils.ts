import { StyleSheet, type TextStyle } from 'react-native';

/**
 * fontWeight 값에 따라 적절한 Pretendard 폰트 패밀리를 반환합니다.
 */
export const getFontFamily = (fontWeight?: TextStyle['fontWeight']): string => {
  if (!fontWeight) {
    return 'Pretendard-Regular';
  }

  switch (fontWeight) {
    case '100':
    case 100:
      return 'Pretendard-Thin';
    case '200':
    case 200:
      return 'Pretendard-ExtraLight';
    case '300':
    case 300:
      return 'Pretendard-Light';
    case '400':
    case 400:
    case 'normal':
      return 'Pretendard-Regular';
    case '500':
    case 500:
      return 'Pretendard-Medium';
    case '600':
    case 600:
      return 'Pretendard-SemiBold';
    case '700':
    case 700:
    case 'bold':
      return 'Pretendard-Bold';
    case '800':
    case 800:
      return 'Pretendard-ExtraBold';
    case '900':
    case 900:
      return 'Pretendard-Black';
    default:
      return 'Pretendard-Regular';
  }
};

/**
 * 공통 폰트 스타일 정의
 */
export const fontStyles = StyleSheet.create({
  default: {
    fontFamily: 'Pretendard-Regular',
  },
  thin: {
    fontFamily: 'Pretendard-Thin',
  },
  extraLight: {
    fontFamily: 'Pretendard-ExtraLight',
  },
  light: {
    fontFamily: 'Pretendard-Light',
  },
  regular: {
    fontFamily: 'Pretendard-Regular',
  },
  medium: {
    fontFamily: 'Pretendard-Medium',
  },
  semiBold: {
    fontFamily: 'Pretendard-SemiBold',
  },
  bold: {
    fontFamily: 'Pretendard-Bold',
  },
  extraBold: {
    fontFamily: 'Pretendard-ExtraBold',
  },
  black: {
    fontFamily: 'Pretendard-Black',
  },
});
