import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, type ImageStyle, type StyleProp } from 'react-native';
import { ICONS, type IconName } from '~/shared/constants/images';

/**
 * Icon 컴포넌트
 * expo-image를 사용한 고성능 아이콘 컴포넌트
 *
 * @example
 * <Icon name="point" size={24} />
 * <Icon name="point" size={32} tintColor="#FF0000" />
 */

interface IconProps {
  /** 아이콘 이름 (images.ts에 정의된 아이콘) */
  name: IconName;
  /** 아이콘 크기 (width와 height 동일하게 적용) */
  size?: number;
  /** 아이콘 색상 (tintColor 적용) */
  tintColor?: string;
  /** 추가 스타일 */
  style?: StyleProp<ImageStyle>;
  /** contentFit 모드 (기본값: contain) */
  contentFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  tintColor,
  style,
  contentFit = 'contain',
}) => {
  return (
    <Image
      source={ICONS[name]}
      style={[
        styles.icon,
        { width: size, height: size },
        tintColor ? ({ tintColor } as ImageStyle) : undefined,
        style,
      ]}
      contentFit={contentFit}
      cachePolicy="memory-disk"
    />
  );
};

const styles = StyleSheet.create({
  icon: {
    // 기본 스타일
  },
});
