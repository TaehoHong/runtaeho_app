/**
 * 미디어 피커 관련 타입 정의
 * SPOT 원칙에 따라 카메라/갤러리 관련 타입을 단일 위치에서 관리
 */

import type { ImagePickerAsset } from 'expo-image-picker';

/**
 * 미디어 피커 옵션
 */
export interface MediaPickerOptions {
  /** 이미지 비율 (예: [1, 1] 정사각형, [9, 16] 세로) */
  aspect?: [number, number];
  /** 이미지 품질 (0-1, 기본값: 0.8) */
  quality?: number;
  /** 편집 허용 여부 (기본값: true) */
  allowsEditing?: boolean;
  /** 허용 미디어 타입 (기본값: ['images']) */
  mediaTypes?: ('images' | 'videos')[];
}

/**
 * 미디어 피커 결과
 */
export interface MediaPickerResult {
  /** 성공 여부 */
  success: boolean;
  /** 선택된 이미지 URI (성공 시) */
  uri: string | null;
  /** 전체 asset 정보 (성공 시) */
  asset: ImagePickerAsset | null;
  /** 에러 정보 (실패 시) */
  error?: Error;
  /** 취소 여부 */
  cancelled?: boolean;
}

/**
 * 권한 관련 메시지 커스터마이징
 */
export interface PermissionMessages {
  /** 카메라 권한 요청 메시지 */
  cameraRequest?: string;
  /** 카메라 권한 거부 메시지 */
  cameraDenied?: string;
  /** 갤러리 권한 요청 메시지 */
  galleryRequest?: string;
  /** 갤러리 권한 거부 메시지 */
  galleryDenied?: string;
}

/**
 * useMediaPicker 훅 설정
 */
export interface UseMediaPickerConfig {
  /** 기본 옵션 (개별 호출 시 override 가능) */
  defaultOptions?: MediaPickerOptions;
  /** 권한 메시지 커스터마이징 */
  messages?: PermissionMessages;
  /** 성공 콜백 */
  onSuccess?: (result: MediaPickerResult) => void;
  /** 에러 콜백 */
  onError?: (error: Error) => void;
  /** 취소 콜백 */
  onCancel?: () => void;
}

/**
 * useMediaPicker 훅 반환 타입
 */
export interface UseMediaPickerReturn {
  /** 카메라로 사진 촬영 */
  pickFromCamera: (options?: MediaPickerOptions) => Promise<MediaPickerResult>;
  /** 갤러리에서 이미지 선택 */
  pickFromGallery: (options?: MediaPickerOptions) => Promise<MediaPickerResult>;
  /** ActionSheet로 선택 (카메라/갤러리) */
  pickMedia: (options?: MediaPickerOptions) => Promise<MediaPickerResult>;
  /** 로딩 상태 */
  isLoading: boolean;
}

/**
 * 기본 권한 메시지
 */
export const DEFAULT_PERMISSION_MESSAGES: Required<PermissionMessages> = {
  cameraRequest: '사진 촬영을 위해 카메라 권한이 필요합니다.',
  cameraDenied: '카메라 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.',
  galleryRequest: '사진 선택을 위해 갤러리 권한이 필요합니다.',
  galleryDenied: '갤러리 권한이 거부되었습니다. 설정에서 권한을 허용해주세요.',
};

/**
 * 기본 미디어 피커 옵션 (aspect 제외)
 * aspect는 optional이므로 기본값에서 제외
 */
export const DEFAULT_MEDIA_PICKER_OPTIONS = {
  quality: 0.8,
  allowsEditing: true,
  mediaTypes: ['images'] as const,
} satisfies Omit<Required<MediaPickerOptions>, 'aspect'>;
