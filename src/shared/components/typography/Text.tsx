import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';
import { fontStyles } from './fontUtils';

/**
 * Pretendard 폰트가 적용된 기본 Text 컴포넌트
 */
export const Text: React.FC<TextProps> = ({ style, ...props }) => {
  return (
    <RNText
      {...props}
      style={[
        fontStyles.default,
        style,
      ]}
    />
  );
};

/**
 * Pretendard Thin (100)
 */
export const TextThin: React.FC<TextProps> = ({ style, ...props }) => (
  <RNText style={[fontStyles.thin, style]} {...props} />
);

/**
 * Pretendard ExtraLight (200)
 */
export const TextExtraLight: React.FC<TextProps> = ({ style, ...props }) => (
  <RNText style={[fontStyles.extraLight, style]} {...props} />
);

/**
 * Pretendard Light (300)
 */
export const TextLight: React.FC<TextProps> = ({ style, ...props }) => (
  <RNText style={[fontStyles.light, style]} {...props} />
);

/**
 * Pretendard Regular (400) - 기본
 */
export const TextRegular: React.FC<TextProps> = ({ style, ...props }) => (
  <RNText style={[fontStyles.regular, style]} {...props} />
);

/**
 * Pretendard Medium (500)
 */
export const TextMedium: React.FC<TextProps> = ({ style, ...props }) => (
  <RNText style={[fontStyles.medium, style]} {...props} />
);

/**
 * Pretendard SemiBold (600)
 */
export const TextSemiBold: React.FC<TextProps> = ({ style, ...props }) => (
  <RNText style={[fontStyles.semiBold, style]} {...props} />
);

/**
 * Pretendard Bold (700)
 */
export const TextBold: React.FC<TextProps> = ({ style, ...props }) => (
  <RNText style={[fontStyles.bold, style]} {...props} />
);

/**
 * Pretendard ExtraBold (800)
 */
export const TextExtraBold: React.FC<TextProps> = ({ style, ...props }) => (
  <RNText style={[fontStyles.extraBold, style]} {...props} />
);

/**
 * Pretendard Black (900)
 */
export const TextBlack: React.FC<TextProps> = ({ style, ...props }) => (
  <RNText style={[fontStyles.black, style]} {...props} />
);
