import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '~/shared/components/typography';
import { GREY, PRIMARY } from '~/shared/styles';

/**
 * UpdateOverlay에서 사용하는 상태 (업데이트 진행 중인 상태만)
 */
type UpdateOverlayStatus = 'checking' | 'downloading' | 'applying' | 'error';

interface UpdateOverlayProps {
  /** 현재 업데이트 상태 (업데이트 진행 중인 상태만) */
  status: UpdateOverlayStatus;
  /** 다운로드 진행률 (0-100) */
  progress: number;
  /** 에러 정보 */
  error: Error | null;
  /** 현재 재시도 횟수 */
  retryCount: number;
  /** 최대 재시도 횟수 */
  maxRetries: number;
  /** 재시도 콜백 */
  onRetry: () => void;
  /** 건너뛰기 콜백 */
  onSkip: () => void;
}

/**
 * 업데이트 진행 상태를 표시하는 오버레이 컴포넌트
 *
 * 로그인 화면 위에 반투명 오버레이로 표시됨
 */
export function UpdateOverlay({
  status,
  progress,
  error,
  retryCount,
  maxRetries,
  onRetry,
  onSkip,
}: UpdateOverlayProps) {
  // 상태별 메시지
  const getStatusMessage = (): string => {
    switch (status) {
      case 'checking':
        return '업데이트 확인 중...';
      case 'downloading':
        return `업데이트 다운로드 중... ${Math.round(progress)}%`;
      case 'applying':
        return '업데이트 적용 중...';
      case 'error':
        return '업데이트 실패';
      default:
        return '';
    }
  };

  // 에러 상태 UI (기존 카드 모달 유지)
  if (status === 'error') {
    return (
      <View style={styles.errorOverlay}>
        <View style={styles.errorContentContainer}>
          <View style={styles.errorIcon}>
            <Text style={styles.errorIconText}>!</Text>
          </View>

          <Text style={styles.errorStatusText}>{getStatusMessage()}</Text>

          {error && (
            <Text style={styles.errorMessage} numberOfLines={2}>
              {error.message}
            </Text>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={onRetry}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>

            {retryCount >= maxRetries && (
              <TouchableOpacity
                style={styles.skipButton}
                onPress={onSkip}
                activeOpacity={0.8}
              >
                <Text style={styles.skipButtonText}>건너뛰기</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  // 진행 중 상태 UI (checking, downloading, applying) - 픽셀 스타일
  return (
    <View style={styles.overlay}>
      <View style={styles.contentContainer}>
        {/* 로딩 인디케이터 */}
        {(status === 'checking' || status === 'applying') && (
          <ActivityIndicator
            size="large"
            color={GREY.WHITE}
            style={styles.spinner}
          />
        )}

        {/* 상태 텍스트 */}
        <Text style={styles.statusText}>{getStatusMessage()}</Text>

        {/* 픽셀 스타일 프로그레스 바 (다운로드 중일 때만) */}
        {status === 'downloading' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <LinearGradient
                colors={['#B5F9A3', '#92F579', '#59EC3A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, Math.max(0, progress))}%` },
                ]}
              />
            </View>
          </View>
        )}

        {/* 재시도 횟수 표시 */}
        {retryCount > 0 && (
          <Text style={styles.retryText}>
            재시도 중... ({retryCount}/{maxRetries})
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 진행 중 상태 오버레이 (투명 배경, 하단 배치)
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 9999,
  },

  contentContainer: {
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
    paddingBottom: 80,
    alignItems: 'center',
    width: '100%',
  },

  spinner: {
    marginBottom: 16,
  },

  statusText: {
    fontSize: 18,
    fontFamily: 'Pretendard-Bold',
    color: GREY.WHITE,
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // 픽셀 스타일 프로그레스 바
  progressContainer: {
    width: '100%',
    marginBottom: 8,
  },

  progressBackground: {
    height: 32,
    backgroundColor: '#1a4d26',
    borderRadius: 4,
    borderWidth: 4,
    borderColor: GREY.WHITE,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  progressFill: {
    height: '100%',
    borderRadius: 0,
  },

  // 재시도 텍스트
  retryText: {
    fontSize: 14,
    fontFamily: 'Pretendard-SemiBold',
    color: GREY.WHITE,
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // 에러 상태 오버레이 (기존 스타일 유지)
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },

  errorContentContainer: {
    backgroundColor: GREY.WHITE,
    borderRadius: 16,
    padding: 32,
    marginHorizontal: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 280,
  },

  errorStatusText: {
    fontSize: 16,
    fontFamily: 'Pretendard-SemiBold',
    color: GREY[900],
    textAlign: 'center',
    marginBottom: 16,
  },

  // 에러 상태
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF4032',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  errorIconText: {
    fontSize: 28,
    fontFamily: 'Pretendard-Bold',
    color: GREY.WHITE,
  },

  errorMessage: {
    fontSize: 13,
    fontFamily: 'Pretendard-Regular',
    color: GREY[600],
    textAlign: 'center',
    marginBottom: 24,
  },

  // 버튼
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },

  retryButton: {
    backgroundColor: PRIMARY[500],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
  },

  retryButtonText: {
    fontSize: 14,
    fontFamily: 'Pretendard-SemiBold',
    color: GREY.WHITE,
    textAlign: 'center',
  },

  skipButton: {
    backgroundColor: GREY[200],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
  },

  skipButtonText: {
    fontSize: 14,
    fontFamily: 'Pretendard-SemiBold',
    color: GREY[700],
    textAlign: 'center',
  },
});
