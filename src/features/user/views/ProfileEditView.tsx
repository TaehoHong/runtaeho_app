import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '~/features/auth/hooks/useAuth';
import { Text } from '~/shared/components/typography';
import { GREY, PRIMARY } from '~/shared/styles';
import { userService } from '../services/userService';

/**
 * 프로필 편집 화면
 * 닉네임과 프로필 이미지 수정
 */
export const ProfileEditView: React.FC = () => {
  const router = useRouter();
  const { user: currentUser, refreshUserData } = useAuth();

  const [nickname, setNickname] = useState(currentUser?.nickname || '');
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const currentProfileImage = currentUser?.profileImageURL;

  // 이미지 source 결정
  const imageSource = selectedImage
    ? { uri: selectedImage.uri }
    : currentProfileImage
      ? { uri: currentProfileImage }
      : require('assets/images/default-profile-image.png');

  /**
   * 이미지 선택 옵션 표시
   */
  const handleImagePress = () => {
    Alert.alert('프로필 사진 변경', '사진을 선택해주세요.', [
      {
        text: '카메라',
        onPress: openCamera,
      },
      {
        text: '갤러리',
        onPress: openGallery,
      },
      {
        text: '취소',
        style: 'cancel',
      },
    ]);
  };

  /**
   * 카메라 열기
   */
  const openCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      if (!permission.canAskAgain) {
        Alert.alert(
          '권한 필요',
          '카메라 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.',
          [
            { text: '취소', style: 'cancel' },
            { text: '설정으로 이동', onPress: () => Linking.openSettings() },
          ]
        );
      } else {
        Alert.alert('권한 필요', '카메라 사용을 위해 권한이 필요합니다.');
      }
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0]);
    }
  };

  /**
   * 갤러리 열기
   */
  const openGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      if (!permission.canAskAgain) {
        Alert.alert(
          '권한 필요',
          '갤러리 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.',
          [
            { text: '취소', style: 'cancel' },
            { text: '설정으로 이동', onPress: () => Linking.openSettings() },
          ]
        );
      } else {
        Alert.alert('권한 필요', '갤러리 접근을 위해 권한이 필요합니다.');
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0]);
    }
  };

  /**
   * 변경 사항 저장
   */
  const handleSave = async () => {
    const nicknameChanged = nickname.trim() !== currentUser?.nickname;
    const imageChanged = selectedImage !== null;

    if (!nicknameChanged && !imageChanged) {
      router.back();
      return;
    }

    // 닉네임 유효성 검사
    if (nicknameChanged && nickname.trim().length < 2) {
      Alert.alert('알림', '닉네임은 2자 이상이어야 합니다.');
      return;
    }

    setIsLoading(true);
    try {
      const updateParams: Parameters<typeof userService.updateProfile>[0] = {};

      if (nicknameChanged) {
        updateParams.nickname = nickname.trim();
      }

      if (selectedImage) {
        updateParams.profileImage = {
          uri: selectedImage.uri,
          type: selectedImage.mimeType || 'image/jpeg',
          name: selectedImage.fileName || `profile_${Date.now()}.jpg`,
        };
      }

      await userService.updateProfile(updateParams);

      // 사용자 정보 새로고침
      await refreshUserData();

      Alert.alert('완료', '프로필이 수정되었습니다.', [
        {
          text: '확인',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('프로필 수정 실패:', error);
      Alert.alert('오류', '프로필 수정에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 뒤로가기 (변경사항 확인)
   */
  const handleBack = () => {
    const nicknameChanged = nickname.trim() !== currentUser?.nickname;
    const imageChanged = selectedImage !== null;

    if (nicknameChanged || imageChanged) {
      Alert.alert('변경 사항 취소', '수정된 내용이 저장되지 않습니다. 나가시겠습니까?', [
        { text: '계속 편집', style: 'cancel' },
        { text: '나가기', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={GREY[900]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>프로필 편집</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.headerButton}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={PRIMARY[500]} />
            ) : (
              <Text style={styles.saveButtonText}>저장</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* 프로필 이미지 */}
          <TouchableOpacity
            style={styles.imageContainer}
            onPress={handleImagePress}
            disabled={isLoading}
          >
            <Image source={imageSource} style={styles.profileImage} contentFit="cover" />
            <View style={styles.cameraIconContainer}>
              <Ionicons name="camera" size={16} color={GREY.WHITE} />
            </View>
          </TouchableOpacity>

          {/* 닉네임 입력 */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>닉네임</Text>
            <TextInput
              style={styles.textInput}
              value={nickname}
              onChangeText={setNickname}
              placeholder="닉네임을 입력하세요"
              placeholderTextColor={GREY[400]}
              maxLength={20}
              autoCorrect={false}
              editable={!isLoading}
            />
            <Text style={styles.charCount}>{nickname.length}/20</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GREY.WHITE,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: GREY[100],
  },
  headerButton: {
    padding: 4,
    minWidth: 44,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Pretendard',
    color: GREY[900],
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Pretendard',
    color: PRIMARY[500],
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 20,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 32,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: GREY[100],
  },
  cameraIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GREY[700],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: GREY.WHITE,
  },
  inputSection: {
    width: '100%',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Pretendard',
    color: GREY[700],
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: GREY[200],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Pretendard',
    color: GREY[900],
    backgroundColor: GREY.WHITE,
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Pretendard',
    color: GREY[400],
    textAlign: 'right',
    marginTop: 4,
  },
});
