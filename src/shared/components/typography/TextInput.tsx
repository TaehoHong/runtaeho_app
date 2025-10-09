import React from 'react';
import { TextInput as RNTextInput, type TextInputProps, StyleSheet, type TextStyle } from 'react-native';
import { getFontFamily, fontStyles } from './fontUtils';

/**
 * Pretendard 폰트가 적용된 기본 TextInput 컴포넌트
 * fontWeight를 지정하면 자동으로 해당 폰트 패밀리가 적용됩니다.
 */
export const TextInput: React.FC<TextInputProps> = ({ style, ...props }) => {
  const flatStyle = StyleSheet.flatten([fontStyles.default, style]) as TextStyle;
  const fontWeight = flatStyle?.fontWeight;
  const fontFamily = getFontFamily(fontWeight);

  return (
    <RNTextInput
      {...props}
      style={[
        fontStyles.default,
        { fontFamily },
        style,
      ]}
    />
  );
};

/**
 * Pretendard Thin (100)
 */
export const TextInputThin: React.FC<TextInputProps> = ({ style, ...props }) => (
  <RNTextInput style={[fontStyles.thin, style]} {...props} />
);

/**
 * Pretendard ExtraLight (200)
 */
export const TextInputExtraLight: React.FC<TextInputProps> = ({ style, ...props }) => (
  <RNTextInput style={[fontStyles.extraLight, style]} {...props} />
);

/**
 * Pretendard Light (300)
 */
export const TextInputLight: React.FC<TextInputProps> = ({ style, ...props }) => (
  <RNTextInput style={[fontStyles.light, style]} {...props} />
);

/**
 * Pretendard Regular (400) - 기본
 */
export const TextInputRegular: React.FC<TextInputProps> = ({ style, ...props }) => (
  <RNTextInput style={[fontStyles.regular, style]} {...props} />
);

/**
 * Pretendard Medium (500)
 */
export const TextInputMedium: React.FC<TextInputProps> = ({ style, ...props }) => (
  <RNTextInput style={[fontStyles.medium, style]} {...props} />
);

/**
 * Pretendard SemiBold (600)
 */
export const TextInputSemiBold: React.FC<TextInputProps> = ({ style, ...props }) => (
  <RNTextInput style={[fontStyles.semiBold, style]} {...props} />
);

/**
 * Pretendard Bold (700)
 */
export const TextInputBold: React.FC<TextInputProps> = ({ style, ...props }) => (
  <RNTextInput style={[fontStyles.bold, style]} {...props} />
);

/**
 * Pretendard ExtraBold (800)
 */
export const TextInputExtraBold: React.FC<TextInputProps> = ({ style, ...props }) => (
  <RNTextInput style={[fontStyles.extraBold, style]} {...props} />
);

/**
 * Pretendard Black (900)
 */
export const TextInputBlack: React.FC<TextInputProps> = ({ style, ...props }) => (
  <RNTextInput style={[fontStyles.black, style]} {...props} />
);
