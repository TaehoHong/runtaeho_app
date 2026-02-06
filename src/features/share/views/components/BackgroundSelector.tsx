/**
 * BackgroundSelector Component
 * 배경 선택 UI 컴포넌트 (Unity 배경 썸네일 + 단색 배경 + 사진 선택)
 *
 * Unity API 호출은 상위 viewmodel에서 처리하므로
 * 이 컴포넌트는 UI와 콜백만 담당
 */

import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import type { BackgroundOption } from '../../models/types';
import { BACKGROUND_OPTIONS } from '../../constants/shareOptions';
import { BACKGROUND_THUMBNAILS, type BackgroundThumbnailKey } from '~/shared/constants/images';
import { GREY, PRIMARY } from '~/shared/styles';

interface BackgroundSelectorProps {
  /** 선택된 배경 */
  selectedBackground: BackgroundOption;
  /** 배경 선택 콜백 (async 가능) */
  onSelect: (background: BackgroundOption) => void | Promise<void>;
}

export const BackgroundSelector: React.FC<BackgroundSelectorProps> = ({
  selectedBackground,
  onSelect,
}) => {
  // 사용자 사진 목록 (최근 선택한 사진들)
  const [userPhotos, setUserPhotos] = useState<BackgroundOption[]>([]);

  // 배경 선택 핸들러 (Unity API는 viewmodel에서 처리)
  const handleBackgroundSelect = useCallback((option: BackgroundOption) => {
    onSelect(option);
  }, [onSelect]);

  // 사진 선택 핸들러
  const handleAddPhoto = useCallback(async () => {
    try {
      // 권한 확인
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          '권한 필요',
          '사진을 선택하려면 갤러리 접근 권한이 필요합니다.',
          [{ text: '확인' }]
        );
        return;
      }

      // 이미지 선택
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [9, 16], // 9:16 비율
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const newPhotoOption: BackgroundOption = {
          id: `photo_${Date.now()}`,
          name: '사용자 사진',
          source: asset.uri,
          type: 'photo',
          photoUri: asset.uri,
        };

        // 사진 목록에 추가 (최대 5개 유지)
        setUserPhotos((prev) => {
          const updated = [newPhotoOption, ...prev];
          return updated.slice(0, 5);
        });

        // 선택된 배경으로 설정
        onSelect(newPhotoOption);
      }
    } catch (error) {
      console.error('[BackgroundSelector] Photo selection failed:', error);
      Alert.alert('오류', '사진을 불러오는 중 오류가 발생했습니다.');
    }
  }, [onSelect]);

  // 배경 옵션 렌더링
  const renderBackgroundOption = (option: BackgroundOption) => {
    const isSelected = selectedBackground.id === option.id;

    // Unity 배경인 경우 썸네일 이미지 사용
    const isUnityBackground = option.type === 'unity' && option.id in BACKGROUND_THUMBNAILS;
    const thumbnailSource = isUnityBackground
      ? BACKGROUND_THUMBNAILS[option.id as BackgroundThumbnailKey]
      : null;

    // 접근성 레이블 생성
    const getAccessibilityLabel = (): string => {
      if (option.type === 'photo') {
        return '사용자 사진 배경 선택';
      }
      return `${option.name} 배경 선택`;
    };

    return (
      <TouchableOpacity
        key={option.id}
        style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
        onPress={() => handleBackgroundSelect(option)}
        activeOpacity={0.7}
        accessible={true}
        accessibilityLabel={getAccessibilityLabel()}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
      >
        {isUnityBackground && thumbnailSource ? (
          // Unity 배경: 썸네일 이미지 표시
          <Image
            source={thumbnailSource}
            style={styles.optionPreview}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={option.id}
          />
        ) : option.type === 'photo' && option.photoUri ? (
          // 사용자 사진 배경
          <Image
            source={{ uri: option.photoUri }}
            style={styles.optionPreview}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={option.id}
          />
        ) : (
          // 단색 배경
          <View
            style={[
              styles.optionPreview,
              { backgroundColor: typeof option.source === 'string' ? option.source : GREY[200] },
            ]}
          />
        )}
        {isSelected && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>배경</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 사진 추가 버튼 */}
        <TouchableOpacity
          style={styles.addPhotoButton}
          onPress={handleAddPhoto}
          activeOpacity={0.7}
          accessible={true}
          accessibilityLabel="사진 추가"
          accessibilityRole="button"
        >
          <View style={styles.addPhotoContent}>
            <Text style={styles.addPhotoIcon}>+</Text>
            <Text style={styles.addPhotoText}>사진</Text>
          </View>
        </TouchableOpacity>

        {/* 사용자 선택 사진들 */}
        {userPhotos.map(renderBackgroundOption)}

        {/* 배경 옵션들 (Unity 배경 + 단색 배경) */}
        {BACKGROUND_OPTIONS.map(renderBackgroundOption)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: GREY[800],
    marginBottom: 12,
    paddingHorizontal: 16,
    fontFamily: 'Pretendard-SemiBold',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  addPhotoButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: GREY[100],
    borderWidth: 2,
    borderColor: GREY[300],
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoContent: {
    alignItems: 'center',
  },
  addPhotoIcon: {
    fontSize: 18,
    color: GREY[500],
    fontWeight: '300',
  },
  addPhotoText: {
    fontSize: 8,
    color: GREY[500],
    marginTop: 2,
    fontFamily: 'Pretendard-Regular',
  },
  optionButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    borderColor: PRIMARY[500],
  },
  optionPreview: {
    width: '100%',
    height: '100%',
  },
  checkmark: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PRIMARY[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default BackgroundSelector;
