
 import { useState, useCallback, useMemo } from 'react';
import { mediaPickerService } from '~/services/MediaPickerService';
import type {
  MediaPickerOptions,
  MediaPickerResult,
  UseMediaPickerConfig,
  UseMediaPickerReturn,
} from '~/shared/types/media';

/**
 * 미디어 피커 훅
 *
 * @param config - 훅 설정 (기본 옵션, 메시지, 콜백)
 * @returns pickFromCamera, pickFromGallery, pickMedia, isLoading
 */
export const useMediaPicker = (config?: UseMediaPickerConfig): UseMediaPickerReturn => {
  const [isLoading, setIsLoading] = useState(false);

  const { defaultOptions, messages, onSuccess, onError, onCancel } = config ?? {};

  /**
   * 옵션 병합 (기본 옵션 + 호출 시 옵션)
   */
  const mergeOptions = useCallback(
    (callOptions?: MediaPickerOptions): MediaPickerOptions => ({
      ...defaultOptions,
      ...callOptions,
    }),
    [defaultOptions]
  );

  /**
   * 결과 처리 공통 로직
   */
  const handleResult = useCallback(
    (result: MediaPickerResult): MediaPickerResult => {
      if (result.success) {
        onSuccess?.(result);
      } else if (result.cancelled) {
        onCancel?.();
      } else if (result.error) {
        onError?.(result.error);
      }
      return result;
    },
    [onSuccess, onError, onCancel]
  );

  /**
   * 카메라로 사진 촬영
   */
  const pickFromCamera = useCallback(
    async (options?: MediaPickerOptions): Promise<MediaPickerResult> => {
      setIsLoading(true);
      try {
        const mergedOptions = mergeOptions(options);
        const result = await mediaPickerService.launchCamera(mergedOptions, messages);
        return handleResult(result);
      } finally {
        setIsLoading(false);
      }
    },
    [mergeOptions, messages, handleResult]
  );

  /**
   * 갤러리에서 이미지 선택
   */
  const pickFromGallery = useCallback(
    async (options?: MediaPickerOptions): Promise<MediaPickerResult> => {
      setIsLoading(true);
      try {
        const mergedOptions = mergeOptions(options);
        const result = await mediaPickerService.launchImageLibrary(mergedOptions, messages);
        return handleResult(result);
      } finally {
        setIsLoading(false);
      }
    },
    [mergeOptions, messages, handleResult]
  );

  /**
   * ActionSheet로 미디어 소스 선택 (카메라/갤러리)
   */
  const pickMedia = useCallback(
    async (options?: MediaPickerOptions): Promise<MediaPickerResult> => {
      setIsLoading(true);
      try {
        const mergedOptions = mergeOptions(options);
        const result = await mediaPickerService.showMediaSourceActionSheet(
          mergedOptions,
          messages
        );
        return handleResult(result);
      } finally {
        setIsLoading(false);
      }
    },
    [mergeOptions, messages, handleResult]
  );

  return useMemo(
    () => ({
      pickFromCamera,
      pickFromGallery,
      pickMedia,
      isLoading,
    }),
    [pickFromCamera, pickFromGallery, pickMedia, isLoading]
  );
};
