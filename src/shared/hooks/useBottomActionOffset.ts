import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBottomOffsetForPlatform } from '~/shared/utils/safeAreaPolicy';

/**
 * 하단 고정 UI(FAB/버튼 바) 오프셋을 플랫폼 정책에 맞춰 계산한다.
 */
export const useBottomActionOffset = (baseOffset: number): number => {
  const insets = useSafeAreaInsets();
  return getBottomOffsetForPlatform(baseOffset, insets.bottom, Platform.OS);
};
