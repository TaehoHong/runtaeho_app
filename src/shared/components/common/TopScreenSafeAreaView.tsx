import React from 'react';
import { Platform } from 'react-native';
import { SafeAreaView, type SafeAreaViewProps } from 'react-native-safe-area-context';
import { getTopScreenEdgesForPlatform } from '~/shared/utils/safeAreaPolicy';

type TopScreenSafeAreaViewProps = Omit<SafeAreaViewProps, 'edges'>;

/**
 * 상단 중심 화면용 공통 SafeArea 래퍼.
 * 플랫폼 분기는 이 컴포넌트 내부에만 두고, 화면에서는 공통 규칙만 사용한다.
 */
export const TopScreenSafeAreaView: React.FC<TopScreenSafeAreaViewProps> = ({
  children,
  ...props
}) => {
  const edges = getTopScreenEdgesForPlatform(Platform.OS);

  return (
    <SafeAreaView {...props} edges={edges}>
      {children}
    </SafeAreaView>
  );
};
