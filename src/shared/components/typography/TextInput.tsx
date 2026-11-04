import React, { useState } from 'react';
import { TextInput as RNTextInput, type TextInputProps, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { getFontFamily, getAndroidFontStyle, fontStyles } from './fontUtils';

/** Match Android input frames to native content after live font changes. */
export const NativeTextInput: React.FC<TextInputProps> = ({ style, onContentSizeChange, ...props }) => {
  const [contentHeight, setContentHeight] = useState(0);
  const { fontScale } = useWindowDimensions();
  const fontScaleProps = Platform.OS === 'ios' ? { fontSizeMultiplier: fontScale } : null;
  const flatStyle = StyleSheet.flatten(style);
  const minimumHeight = flatStyle?.minHeight;
  const height = flatStyle?.height;
  return (
    <RNTextInput
      {...props}
      {...fontScaleProps}
      style={[
        style,
        Platform.OS === 'android' && contentHeight > 0 && (height == null || typeof height === 'number') && {
          height: Math.max(contentHeight, typeof height === 'number' ? height : 0,
            typeof minimumHeight === 'number' ? minimumHeight : 0),
        },
      ]}
      onContentSizeChange={event => {
        if (Platform.OS === 'android') setContentHeight(event.nativeEvent.contentSize.height);
        onContentSizeChange?.(event);
      }}
    />
  );
};

/**
 * Pretendard 폰트가 적용된 기본 TextInput 컴포넌트
 * fontWeight를 지정하면 자동으로 해당 폰트 패밀리가 적용됩니다.
 */
export const TextInput: React.FC<TextInputProps> = ({ style, ...props }) => {
  const flatStyle = StyleSheet.flatten(style);
  const fontWeight = flatStyle?.fontWeight;
  const fontFamily = getFontFamily(fontWeight);

  return (
    <NativeTextInput
      {...props}
      style={[
        fontStyles.default,
        { fontFamily },
        style,
        getAndroidFontStyle({ ...flatStyle, fontFamily: flatStyle?.fontFamily ?? fontFamily }),
      ]}
    />
  );
};

/**
 * Pretendard Thin (100)
 */
export const TextInputThin: React.FC<TextInputProps> = ({ style, ...props }) => (
  <TextInput style={[fontStyles.thin, style]} {...props} />
);

/**
 * Pretendard ExtraLight (200)
 */
export const TextInputExtraLight: React.FC<TextInputProps> = ({ style, ...props }) => (
  <TextInput style={[fontStyles.extraLight, style]} {...props} />
);

/**
 * Pretendard Light (300)
 */
export const TextInputLight: React.FC<TextInputProps> = ({ style, ...props }) => (
  <TextInput style={[fontStyles.light, style]} {...props} />
);

/**
 * Pretendard Regular (400) - 기본
 */
export const TextInputRegular: React.FC<TextInputProps> = ({ style, ...props }) => (
  <TextInput style={[fontStyles.regular, style]} {...props} />
);

/**
 * Pretendard Medium (500)
 */
export const TextInputMedium: React.FC<TextInputProps> = ({ style, ...props }) => (
  <TextInput style={[fontStyles.medium, style]} {...props} />
);

/**
 * Pretendard SemiBold (600)
 */
export const TextInputSemiBold: React.FC<TextInputProps> = ({ style, ...props }) => (
  <TextInput style={[fontStyles.semiBold, style]} {...props} />
);

/**
 * Pretendard Bold (700)
 */
export const TextInputBold: React.FC<TextInputProps> = ({ style, ...props }) => (
  <TextInput style={[fontStyles.bold, style]} {...props} />
);

/**
 * Pretendard ExtraBold (800)
 */
export const TextInputExtraBold: React.FC<TextInputProps> = ({ style, ...props }) => (
  <TextInput style={[fontStyles.extraBold, style]} {...props} />
);

/**
 * Pretendard Black (900)
 */
export const TextInputBlack: React.FC<TextInputProps> = ({ style, ...props }) => (
  <TextInput style={[fontStyles.black, style]} {...props} />
);
