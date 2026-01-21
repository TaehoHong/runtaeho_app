import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { UpdateStatus } from '../../models/UpdateState';
import { useUpdateStore } from '../../stores/updateStore';
import { useUpdateDownload } from '../../hooks/useUpdateDownload';
import { PRIMARY, GREY } from '~/shared/styles/colors';

interface UpdateBannerProps {
  /** 배너 표시 여부 제어 */
  visible?: boolean;
}

export function UpdateBanner({ visible = true }: UpdateBannerProps) {
  const { status, progress, availableManifest } = useUpdateStore();
  const { downloadUpdate, applyUpdate, isDownloading, isReady } = useUpdateDownload();

  // 배너를 표시할 상태가 아니면 렌더링하지 않음
  const shouldShow = visible && (
    status === UpdateStatus.AVAILABLE ||
    status === UpdateStatus.DOWNLOADING ||
    status === UpdateStatus.READY
  );

  if (!shouldShow) {
    return null;
  }

  const handlePress = async () => {
    if (isReady) {
      await applyUpdate();
    } else if (!isDownloading) {
      await downloadUpdate();
    }
  };

  const renderContent = () => {
    if (isReady) {
      return (
        <>
          <View style={styles.textContainer}>
            <Text style={styles.title}>업데이트 준비 완료</Text>
            <Text style={styles.subtitle}>지금 적용하시겠습니까?</Text>
          </View>
          <TouchableOpacity style={styles.button} onPress={handlePress}>
            <Text style={styles.buttonText}>재시작</Text>
          </TouchableOpacity>
        </>
      );
    }

    if (isDownloading) {
      return (
        <>
          <View style={styles.textContainer}>
            <Text style={styles.title}>업데이트 다운로드 중...</Text>
            <Text style={styles.subtitle}>{Math.round(progress)}%</Text>
          </View>
          <ActivityIndicator size="small" color={GREY.WHITE} />
        </>
      );
    }

    // AVAILABLE 상태
    return (
      <>
        <View style={styles.textContainer}>
          <Text style={styles.title}>새 업데이트가 있습니다</Text>
          {availableManifest?.message && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {availableManifest.message}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.button} onPress={handlePress}>
          <Text style={styles.buttonText}>업데이트</Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {renderContent()}
      </View>
      {isDownloading && (
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: PRIMARY[700],
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: GREY.WHITE,
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    color: GREY.WHITE,
    fontSize: 12,
    opacity: 0.8,
    marginTop: 2,
  },
  button: {
    backgroundColor: GREY.WHITE,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  buttonText: {
    color: PRIMARY[700],
    fontSize: 13,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1.5,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: GREY.WHITE,
    borderRadius: 1.5,
  },
});
