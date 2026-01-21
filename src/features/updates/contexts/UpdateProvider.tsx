import React, { ReactNode, createContext, useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUpdateCheck } from '../hooks/useUpdateCheck';
import { useUpdateDownload } from '../hooks/useUpdateDownload';
import { UpdateBanner } from '../views/components/UpdateBanner';
import { isUpdatesEnabled } from '../services/updateService';

interface UpdateContextValue {
  /** 업데이트 사용 가능 여부 */
  hasUpdate: boolean;
  /** 업데이트 확인 중 여부 */
  isChecking: boolean;
  /** 다운로드 중 여부 */
  isDownloading: boolean;
  /** 업데이트 적용 준비 완료 여부 */
  isReady: boolean;
  /** 다운로드 진행률 (0-100) */
  progress: number;
  /** 수동 업데이트 확인 */
  checkForUpdate: (force?: boolean) => Promise<boolean>;
  /** 업데이트 다운로드 */
  downloadUpdate: () => Promise<boolean>;
  /** 업데이트 적용 (앱 재시작) */
  applyUpdate: () => Promise<void>;
}

const UpdateContext = createContext<UpdateContextValue | null>(null);

interface UpdateProviderProps {
  children: ReactNode;
  /** 앱 시작 시 업데이트 체크 (기본값: true) */
  checkOnLaunch?: boolean;
  /** 포그라운드 복귀 시 업데이트 체크 (기본값: true) */
  checkOnForeground?: boolean;
  /** 업데이트 배너 표시 (기본값: true) */
  showBanner?: boolean;
  /** 자동 다운로드 (기본값: false) */
  autoDownload?: boolean;
}

export function UpdateProvider({
  children,
  checkOnLaunch = true,
  checkOnForeground = true,
  showBanner = true,
  autoDownload = false,
}: UpdateProviderProps) {
  const insets = useSafeAreaInsets();

  // Updates가 활성화되어 있지 않으면 children만 렌더링
  if (!isUpdatesEnabled()) {
    return <>{children}</>;
  }

  return (
    <UpdateProviderInner
      checkOnLaunch={checkOnLaunch}
      checkOnForeground={checkOnForeground}
      showBanner={showBanner}
      autoDownload={autoDownload}
      topInset={insets.top}
    >
      {children}
    </UpdateProviderInner>
  );
}

interface UpdateProviderInnerProps extends Omit<UpdateProviderProps, 'children'> {
  children: ReactNode;
  topInset: number;
}

function UpdateProviderInner({
  children,
  checkOnLaunch,
  checkOnForeground,
  showBanner,
  autoDownload,
  topInset,
}: UpdateProviderInnerProps) {
  const {
    hasUpdate,
    isChecking,
    checkForUpdate,
  } = useUpdateCheck({
    checkOnLaunch,
    checkOnForeground,
  });

  const {
    isDownloading,
    isReady,
    progress,
    downloadUpdate,
    applyUpdate,
  } = useUpdateDownload();

  // 자동 다운로드가 활성화되어 있고 업데이트가 있으면 자동으로 다운로드
  React.useEffect(() => {
    if (autoDownload && hasUpdate && !isDownloading && !isReady) {
      downloadUpdate();
    }
  }, [autoDownload, hasUpdate, isDownloading, isReady, downloadUpdate]);

  const contextValue: UpdateContextValue = {
    hasUpdate,
    isChecking,
    isDownloading,
    isReady,
    progress,
    checkForUpdate,
    downloadUpdate,
    applyUpdate,
  };

  return (
    <UpdateContext.Provider value={contextValue}>
      <View style={styles.container}>
        {showBanner && (
          <View style={[styles.bannerContainer, { paddingTop: topInset }]}>
            <UpdateBanner />
          </View>
        )}
        <View style={styles.content}>
          {children}
        </View>
      </View>
    </UpdateContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  content: {
    flex: 1,
  },
});

/**
 * UpdateProvider의 context에 접근하는 훅
 */
export function useUpdate(): UpdateContextValue {
  const context = useContext(UpdateContext);

  if (!context) {
    // Development 모드에서는 기본값 반환
    if (__DEV__) {
      return {
        hasUpdate: false,
        isChecking: false,
        isDownloading: false,
        isReady: false,
        progress: 0,
        checkForUpdate: async () => false,
        downloadUpdate: async () => false,
        applyUpdate: async () => {},
      };
    }
    throw new Error('useUpdate must be used within an UpdateProvider');
  }

  return context;
}
