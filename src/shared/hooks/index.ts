/**
 * 공통 Hooks 모듈
 * 앱 전체에서 재사용되는 커스텀 훅들을 export
 */

export { usePermissionRequest } from './usePermissionRequest';
export { useMediaPicker } from './useMediaPicker';

// 타입 re-export (편의성)
export type {
  MediaPickerOptions,
  MediaPickerResult,
  PermissionMessages,
  UseMediaPickerConfig,
  UseMediaPickerReturn,
} from '~/shared/types/media';
