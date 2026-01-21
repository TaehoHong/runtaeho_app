import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { PRIMARY, GREY, RED } from '~/shared/styles/colors';
import { ForceUpdateStatus } from '../../models/ForceUpdateState';
import { getStoreUrl } from '../../constants';
import { getAppVersion } from '../../services/forceUpdateService';

interface ForceUpdateModalProps {
  /** 모달 표시 여부 */
  visible: boolean;
  /** 현재 상태 */
  status: ForceUpdateStatus;
  /** 최소 요구 버전 */
  minimumVersion: string | null;
  /** 업데이트 메시지 */
  message: string | null;
  /** 에러 객체 */
  error: Error | null;
  /** 재시도 콜백 */
  onRetry: () => void;
}

export function ForceUpdateModal({
  visible,
  status,
  minimumVersion,
  message,
  error,
  onRetry,
}: ForceUpdateModalProps) {
  const currentVersion = getAppVersion();

  /**
   * 앱스토어 열기
   */
  const handleOpenStore = async () => {
    const storeUrl = getStoreUrl();

    try {
      const canOpen = await Linking.canOpenURL(storeUrl);
      if (canOpen) {
        await Linking.openURL(storeUrl);
      } else {
        if (__DEV__) {
          console.error('[ForceUpdate] Cannot open store URL:', storeUrl);
        }
      }
    } catch (err) {
      if (__DEV__) {
        console.error('[ForceUpdate] Error opening store:', err);
      }
    }
  };

  /**
   * 체크 중 콘텐츠 렌더링
   */
  const renderChecking = () => (
    <>
      <ActivityIndicator size="large" color={PRIMARY[500]} />
      <Text style={styles.message}>버전을 확인하고 있습니다...</Text>
    </>
  );

  /**
   * 업데이트 필요 콘텐츠 렌더링
   */
  const renderUpdateRequired = () => (
    <>
      <Text style={styles.title}>업데이트가 필요합니다</Text>
      <Text style={styles.message}>
        {message ?? '더 나은 러닝 경험을 위해 업데이트해 주세요.'}
      </Text>
      <View style={styles.versionContainer}>
        <Text style={styles.versionLabel}>현재 버전</Text>
        <Text style={styles.versionValue}>{currentVersion}</Text>
      </View>
      <View style={styles.versionContainer}>
        <Text style={styles.versionLabel}>최소 요구 버전</Text>
        <Text style={styles.versionValue}>{minimumVersion}</Text>
      </View>
      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleOpenStore}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryButtonText}>업데이트하기</Text>
      </TouchableOpacity>
    </>
  );

  /**
   * 에러 콘텐츠 렌더링
   */
  const renderError = () => (
    <>
      <Text style={styles.title}>연결 오류</Text>
      <Text style={styles.errorMessage}>
        네트워크 연결을 확인할 수 없습니다.{'\n'}
        인터넷 연결 상태를 확인해 주세요.
      </Text>
      {__DEV__ && error && (
        <Text style={styles.debugText}>{error.message}</Text>
      )}
      <TouchableOpacity
        style={[styles.button, styles.retryButton]}
        onPress={onRetry}
        activeOpacity={0.8}
      >
        <Text style={styles.retryButtonText}>다시 시도</Text>
      </TouchableOpacity>
    </>
  );

  /**
   * 콘텐츠 렌더링
   */
  const renderContent = () => {
    switch (status) {
      case ForceUpdateStatus.CHECKING:
        return renderChecking();
      case ForceUpdateStatus.UPDATE_REQUIRED:
        return renderUpdateRequired();
      case ForceUpdateStatus.ERROR:
        return renderError();
      default:
        return null;
    }
  };

  // 표시할 필요가 없는 상태
  if (
    status === ForceUpdateStatus.IDLE ||
    status === ForceUpdateStatus.UP_TO_DATE
  ) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // 강제 업데이트이므로 모달을 닫을 수 없음
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>{renderContent()}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: GREY.WHITE,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: GREY[900],
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: GREY[600],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  errorMessage: {
    fontSize: 15,
    color: GREY[600],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  debugText: {
    fontSize: 12,
    color: RED.DEFAULT,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'monospace',
  },
  versionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: GREY[50],
    borderRadius: 8,
    marginBottom: 8,
  },
  versionLabel: {
    fontSize: 14,
    color: GREY[600],
  },
  versionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: GREY[800],
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: PRIMARY[500],
  },
  primaryButtonText: {
    color: GREY.WHITE,
    fontSize: 17,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: GREY[800],
  },
  retryButtonText: {
    color: GREY.WHITE,
    fontSize: 17,
    fontWeight: '600',
  },
});
