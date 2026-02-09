import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { BackgroundOption } from '../../models/types';
import { BACKGROUND_OPTIONS } from '../../constants/shareOptions';
import { BACKGROUND_THUMBNAILS, type BackgroundThumbnailKey } from '~/shared/constants/images';
import { useMediaPicker } from '~/shared/hooks';
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

  /**
   * 사진 결과 처리 공통 함수
   * 카메라 촬영 또는 갤러리 선택 후 호출
   */
  const handlePhotoResult = useCallback((uri: string) => {
    const newPhotoOption: BackgroundOption = {
      id: `photo_${Date.now()}`,
      name: '사용자 사진',
      source: uri,
      type: 'photo',
      photoUri: uri,
    };

    // 사진 목록에 추가 (최대 5개 유지)
    setUserPhotos((prev) => {
      const updated = [newPhotoOption, ...prev];
      return updated.slice(0, 5);
    });

    // 선택된 배경으로 설정
    onSelect(newPhotoOption);
  }, [onSelect]);

  const { pickMedia } = useMediaPicker({
    defaultOptions: {
      aspect: [1, 1],
      quality: 0.9,
      allowsEditing: true,
    },
    messages: {
      cameraRequest: '배경 사진 촬영을 위해 카메라 권한이 필요합니다.',
      cameraDenied: '카메라 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.',
      galleryRequest: '배경 사진 선택을 위해 갤러리 권한이 필요합니다.',
      galleryDenied: '갤러리 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.',
    },
    onSuccess: (result) => {
      if (result.uri) {
        handlePhotoResult(result.uri);
      }
    },
  });

  /**
   * 사진 추가 버튼 핸들러 (ActionSheet 표시)
   */
  const handleAddPhoto = useCallback(() => {
    pickMedia();
  }, [pickMedia]);

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
            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.sectionCard}>
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
            <Ionicons name="add" size={24} color={GREY[500]} />
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
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    marginHorizontal: 16,
    marginBottom: 14,
    paddingVertical: 16,
    // 카드 그림자
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#364153',
    marginBottom: 12,
    paddingHorizontal: 16,
    fontFamily: 'Pretendard-SemiBold',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  addPhotoButton: {
    width: 64,
    height: 64,
    borderRadius: 14,
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
  addPhotoText: {
    fontSize: 10,
    color: GREY[500],
    marginTop: 2,
    fontFamily: 'Pretendard-Regular',
  },
  optionButton: {
    width: 64,
    height: 64,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    borderWidth: 3,
    borderColor: PRIMARY[500],
  },
  optionPreview: {
    width: '100%',
    height: '100%',
  },
  checkmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: PRIMARY[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BackgroundSelector;
