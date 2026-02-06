/**
 * MediaPickerService
 * 카메라/갤러리 권한 처리 및 이미지 선택을 위한 싱글톤 서비스
 *
 * SPOT 원칙에 따라 권한 처리 로직을 단일 위치에서 관리
 * - 카메라/갤러리 권한 요청
 * - ImagePicker 실행
 * - 권한 거부 시 Alert + 설정 화면 유도
 */

import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type {
  MediaPickerOptions,
  MediaPickerResult,
  PermissionMessages,
} from '~/shared/types/media';
import {
  DEFAULT_PERMISSION_MESSAGES,
  DEFAULT_MEDIA_PICKER_OPTIONS,
} from '~/shared/types/media';

/**
 * ImagePicker에 전달할 옵션 (undefined 없음)
 */
interface ResolvedImagePickerOptions {
  allowsEditing: boolean;
  quality: number;
  aspect?: [number, number];
  mediaTypes: ('images' | 'videos')[];
}

export class MediaPickerService {
  private static instance: MediaPickerService;

  private constructor() {
    // 싱글톤 패턴
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  static getInstance(): MediaPickerService {
    if (!MediaPickerService.instance) {
      MediaPickerService.instance = new MediaPickerService();
    }
    return MediaPickerService.instance;
  }

  /**
   * 권한 거부 시 Alert 표시 (설정으로 이동 옵션 포함)
   */
  private showPermissionDeniedAlert(
    canAskAgain: boolean,
    requestMessage: string,
    deniedMessage: string
  ): void {
    if (!canAskAgain) {
      // 영구 거부된 경우: 설정으로 이동 버튼 표시
      Alert.alert('권한 필요', deniedMessage, [
        { text: '취소', style: 'cancel' },
        { text: '설정으로 이동', onPress: () => Linking.openSettings() },
      ]);
    } else {
      // 일시적 거부: 안내 메시지만 표시
      Alert.alert('권한 필요', requestMessage);
    }
  }

  /**
   * 옵션 병합 (기본값 + 사용자 옵션)
   * exactOptionalPropertyTypes를 준수하여 undefined 없는 객체 반환
   */
  private mergeOptions(options?: MediaPickerOptions): ResolvedImagePickerOptions {
    const resolved: ResolvedImagePickerOptions = {
      quality: options?.quality ?? DEFAULT_MEDIA_PICKER_OPTIONS.quality,
      allowsEditing: options?.allowsEditing ?? DEFAULT_MEDIA_PICKER_OPTIONS.allowsEditing,
      mediaTypes: options?.mediaTypes ?? DEFAULT_MEDIA_PICKER_OPTIONS.mediaTypes,
    };

    // aspect가 정의된 경우에만 추가
    if (options?.aspect) {
      resolved.aspect = options.aspect;
    }

    return resolved;
  }

  /**
   * 메시지 병합 (기본값 + 사용자 메시지)
   */
  private mergeMessages(messages?: PermissionMessages): Required<PermissionMessages> {
    return {
      cameraRequest: messages?.cameraRequest ?? DEFAULT_PERMISSION_MESSAGES.cameraRequest,
      cameraDenied: messages?.cameraDenied ?? DEFAULT_PERMISSION_MESSAGES.cameraDenied,
      galleryRequest: messages?.galleryRequest ?? DEFAULT_PERMISSION_MESSAGES.galleryRequest,
      galleryDenied: messages?.galleryDenied ?? DEFAULT_PERMISSION_MESSAGES.galleryDenied,
    };
  }

  /**
   * 카메라로 사진 촬영
   */
  async launchCamera(
    options?: MediaPickerOptions,
    messages?: PermissionMessages
  ): Promise<MediaPickerResult> {
    const mergedOptions = this.mergeOptions(options);
    const mergedMessages = this.mergeMessages(messages);

    try {
      // 1. 권한 요청
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        this.showPermissionDeniedAlert(
          permission.canAskAgain,
          mergedMessages.cameraRequest,
          mergedMessages.cameraDenied
        );
        return {
          success: false,
          uri: null,
          asset: null,
          cancelled: false,
          error: new Error('Camera permission denied'),
        };
      }

      // 2. 카메라 실행 옵션 구성
      const cameraOptions: ImagePicker.ImagePickerOptions = {
        allowsEditing: mergedOptions.allowsEditing,
        quality: mergedOptions.quality,
      };

      // aspect가 있는 경우에만 추가
      if (mergedOptions.aspect) {
        cameraOptions.aspect = mergedOptions.aspect;
      }

      // 3. 카메라 실행
      const result = await ImagePicker.launchCameraAsync(cameraOptions);

      // 4. 결과 처리
      if (result.canceled) {
        return {
          success: false,
          uri: null,
          asset: null,
          cancelled: true,
        };
      }

      const asset = result.assets[0];
      if (!asset) {
        return {
          success: false,
          uri: null,
          asset: null,
          error: new Error('No image selected'),
        };
      }

      return {
        success: true,
        uri: asset.uri,
        asset,
      };
    } catch (error) {
      console.error('[MediaPickerService] Camera launch failed:', error);
      Alert.alert('오류', '사진 촬영 중 오류가 발생했습니다.');
      return {
        success: false,
        uri: null,
        asset: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * 갤러리에서 이미지 선택
   */
  async launchImageLibrary(
    options?: MediaPickerOptions,
    messages?: PermissionMessages
  ): Promise<MediaPickerResult> {
    const mergedOptions = this.mergeOptions(options);
    const mergedMessages = this.mergeMessages(messages);

    try {
      // 1. 권한 요청
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        this.showPermissionDeniedAlert(
          permission.canAskAgain,
          mergedMessages.galleryRequest,
          mergedMessages.galleryDenied
        );
        return {
          success: false,
          uri: null,
          asset: null,
          cancelled: false,
          error: new Error('Gallery permission denied'),
        };
      }

      // 2. 갤러리 실행 옵션 구성
      const libraryOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: mergedOptions.mediaTypes,
        allowsEditing: mergedOptions.allowsEditing,
        quality: mergedOptions.quality,
      };

      // aspect가 있는 경우에만 추가
      if (mergedOptions.aspect) {
        libraryOptions.aspect = mergedOptions.aspect;
      }

      // 3. 갤러리 실행
      const result = await ImagePicker.launchImageLibraryAsync(libraryOptions);

      // 4. 결과 처리
      if (result.canceled) {
        return {
          success: false,
          uri: null,
          asset: null,
          cancelled: true,
        };
      }

      const asset = result.assets[0];
      if (!asset) {
        return {
          success: false,
          uri: null,
          asset: null,
          error: new Error('No image selected'),
        };
      }

      return {
        success: true,
        uri: asset.uri,
        asset,
      };
    } catch (error) {
      console.error('[MediaPickerService] Image library launch failed:', error);
      Alert.alert('오류', '사진을 불러오는 중 오류가 발생했습니다.');
      return {
        success: false,
        uri: null,
        asset: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * ActionSheet로 미디어 소스 선택 (카메라/갤러리)
   *
   * @returns Promise<MediaPickerResult | null> - 취소 시 cancelled: true 반환
   */
  showMediaSourceActionSheet(
    options?: MediaPickerOptions,
    messages?: PermissionMessages,
    actionSheetTitle?: string,
    actionSheetMessage?: string
  ): Promise<MediaPickerResult> {
    return new Promise((resolve) => {
      Alert.alert(
        actionSheetTitle ?? '사진 선택',
        actionSheetMessage ?? '사진을 어떻게 추가하시겠습니까?',
        [
          {
            text: '카메라로 촬영',
            onPress: async () => {
              const result = await this.launchCamera(options, messages);
              resolve(result);
            },
          },
          {
            text: '앨범에서 선택',
            onPress: async () => {
              const result = await this.launchImageLibrary(options, messages);
              resolve(result);
            },
          },
          {
            text: '취소',
            style: 'cancel',
            onPress: () => {
              resolve({
                success: false,
                uri: null,
                asset: null,
                cancelled: true,
              });
            },
          },
        ]
      );
    });
  }
}

// 싱글톤 인스턴스 export
export const mediaPickerService = MediaPickerService.getInstance();
