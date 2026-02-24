import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useUpdateStore } from '../../stores/updateStore';
import { useUpdateDownload } from '../../hooks/useUpdateDownload';
import { PRIMARY, GREY } from '~/shared/styles/colors';

interface UpdateModalProps {
  /** 모달 표시 여부 */
  visible: boolean;
  /** 모달 닫기 콜백 */
  onClose?: () => void;
  /** 필수 업데이트 여부 (닫기 버튼 숨김) */
  mandatory?: boolean;
}

export function UpdateModal({
  visible,
  onClose,
  mandatory = false,
}: UpdateModalProps) {
  const { progress, availableManifest } = useUpdateStore();
  const { downloadUpdate, applyUpdate, isDownloading, isReady, hasError, error } = useUpdateDownload();

  const handleDownload = async () => {
    await downloadUpdate();
  };

  const handleApply = async () => {
    await applyUpdate();
  };

  const handleClose = () => {
    if (!mandatory && onClose) {
      onClose();
    }
  };

  const renderContent = () => {
    if (hasError) {
      return (
        <>
          <Text style={styles.title}>업데이트 실패</Text>
          <Text style={styles.message}>
            업데이트 중 오류가 발생했습니다.{'\n'}
            {error?.message ?? '알 수 없는 오류'}
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.retryButton]}
              onPress={handleDownload}
            >
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
            {!mandatory && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>나중에</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      );
    }

    if (isReady) {
      return (
        <>
          <Text style={styles.title}>업데이트 준비 완료</Text>
          <Text style={styles.message}>
            새로운 버전이 다운로드되었습니다.{'\n'}
            앱을 재시작하여 업데이트를 적용하세요.
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleApply}
            >
              <Text style={styles.primaryButtonText}>지금 재시작</Text>
            </TouchableOpacity>
            {!mandatory && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>나중에</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      );
    }

    if (isDownloading) {
      return (
        <>
          <Text style={styles.title}>업데이트 다운로드 중</Text>
          <View style={styles.progressContainer}>
            <ActivityIndicator size="large" color={PRIMARY[500]} />
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.message}>잠시만 기다려주세요...</Text>
        </>
      );
    }

    // AVAILABLE 상태
    return (
      <>
        <Text style={styles.title}>
          {mandatory ? '필수 업데이트' : '새 업데이트가 있습니다'}
        </Text>
        <Text style={styles.message}>
          {availableManifest?.message ?? '앱을 최신 버전으로 업데이트해주세요.'}
        </Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleDownload}
          >
            <Text style={styles.primaryButtonText}>업데이트</Text>
          </TouchableOpacity>
          {!mandatory && (
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>나중에</Text>
            </TouchableOpacity>
          )}
        </View>
      </>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: GREY.WHITE,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: GREY[900],
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: GREY[600],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY[500],
    marginLeft: 12,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: GREY[200],
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: PRIMARY[500],
    borderRadius: 3,
  },
  buttonContainer: {
    flexDirection: 'column',
    width: '100%',
    gap: 8,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: PRIMARY[500],
  },
  primaryButtonText: {
    color: GREY.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: PRIMARY[500],
  },
  retryButtonText: {
    color: GREY.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: GREY[100],
  },
  cancelButtonText: {
    color: GREY[600],
    fontSize: 16,
    fontWeight: '500',
  },
});
