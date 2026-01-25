import React, { useMemo } from 'react';
import {
  Dimensions,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { Text } from '~/shared/components/typography';
import { Icon } from '~/shared/components/ui';
import { GREY, PRIMARY } from '~/shared/styles';
import { useAuthSignIn } from '../hooks/useAuthSignIn';
import { useAutoUpdate, UpdateOverlay } from '~/features/updates';

const DESIGN_WIDTH = 375;
const DESIGN_HEIGHT = 812;

export const Login: React.FC = () => {
  console.log('🔐 [LOGIN] 로그인 화면 렌더링');

  // 화면 크기 기반 스케일 계산
  const scale = useMemo(() => {
    const { width, height } = Dimensions.get('window');
    const widthScale = width / DESIGN_WIDTH;
    const heightScale = height / DESIGN_HEIGHT;

    // 85%~115% 범위로 제한
    const boundedWidthScale = Math.max(0.85, Math.min(1.15, widthScale));
    const boundedHeightScale = Math.max(0.85, Math.min(1.15, heightScale));

    return {
      sw: (size: number) => Math.round(size * boundedWidthScale),
      sh: (size: number) => Math.round(size * boundedHeightScale),
    };
  }, []);

  const { isLoading, signInWithGoogle, signInWithApple } = useAuthSignIn();

  // OTA 자동 업데이트
  const {
    status: updateStatus,
    progress: updateProgress,
    error: updateError,
    retryCount,
    maxRetries,
    retry: retryUpdate,
    skip: skipUpdate,
  } = useAutoUpdate({ autoStart: true });

  // 업데이트 진행 중 여부 (오버레이 표시 조건)
  const isUpdating = updateStatus === 'checking' ||
    updateStatus === 'downloading' ||
    updateStatus === 'applying' ||
    updateStatus === 'error';

  // 로그인 버튼 표시 조건 (업데이트 완료/없음/건너뛰기)
  const showLoginButtons = updateStatus === 'done' ||
    updateStatus === 'skipped' ||
    updateStatus === 'idle';

  return (
    <View style={styles.container}>
      {/* 장식 아이콘들 - 배경 */}
      <Icon name="point" 
        style={[styles.decorIcon, { left: -26, top: 113, width: 108, height: 108, transform: [{ rotate: '-16.95deg' }] }]}
      />
      <Icon name="pixel_shoes"
        style={[styles.decorIcon, { left: -22, top: 361, width: 133, height: 119, transform: [{ rotate: '-15deg' }] }]}
      />
      <Icon name="avatar"
        style={[styles.decorIcon, { right: 0, top: 157, width: 111, height: 111, transform: [{ rotate: '15.98deg' }] }]}
      />
      <Icon name="pixel_shoes"
        style={[styles.decorIcon, { right: 60, top: -40, width: 133, height: 119, opacity: 0.8, transform: [{ rotate: '26.93deg' }] }]}
      />
      <Icon name="point" 
        style={[styles.decorIcon, { right: -57, top: 453, width: 175, height: 175, transform: [{ rotate: '21.31deg' }] }]}
      />
      <Icon name="point" 
        style={[styles.decorIcon, { right: 59, top: 703, width: 113, height: 113, opacity: 0.8, transform: [{ rotate: '31.71deg' }] }]}
      />
      <Icon name="avatar"
        style={[styles.decorIcon, { left: -49, top: 642, width: 135, height: 135, transform: [{ rotate: '-27.39deg' }] }]}
      />

      {/* 메인 컨텐츠 */}
      <View style={styles.title_container}>
        {/* 메인 텍스트 - 동적 크기 */}
        <Icon
          name="title_run"
          style={[styles.title_run, {
            width: scale.sw(200),
            height: scale.sh(64),
          }]}
        />
        <Icon
          name="title_taeho"
          style={[styles.title_taeho, {
            width: scale.sw(201),
            height: scale.sh(64),
          }]}
        />

        {/* 캐릭터들 - 동적 크기 */}
        <Icon
          name="character_2"
          style={[styles.character2, {
            width: scale.sw(29),
            height: scale.sh(29),
          }]}
        />
        <Icon
          name="character_1"
          style={[styles.character1, {
            width: scale.sw(29),
            height: scale.sh(29),
          }]}
        />
        <Icon
          name="character_3"
          style={[styles.character3, {
            width: scale.sw(33),
            height: scale.sh(28),
          }]}
        />
      </View>

      {/* 로그인 버튼들 - 업데이트 완료 후에만 표시 */}
      {showLoginButtons && (
        <View style={styles.buttonContainer}>
          {/* Google 로그인 버튼 */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={signInWithGoogle}
            disabled={isLoading}
          >
            <Icon name="google" style={styles.buttonIcon} />
            <Text style={styles.googleButtonText}>
              {isLoading ? '로그인 중...' : 'Google로 시작하기'}
            </Text>
          </TouchableOpacity>

          {/* Apple 로그인 버튼 - iOS 전용 */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.appleButton}
              onPress={signInWithApple}
              disabled={isLoading}
            >
              <Icon name="apple" style={styles.buttonIcon}/>
              <Text style={styles.appleButtonText}>
                Apple로 시작하기
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 업데이트 오버레이 */}
      {isUpdating && (
        <UpdateOverlay
          status={updateStatus as 'checking' | 'downloading' | 'applying' | 'error'}
          progress={updateProgress}
          error={updateError}
          retryCount={retryCount}
          maxRetries={maxRetries}
          onRetry={retryUpdate}
          onSkip={skipUpdate}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIMARY[800],
  },

  /** ---------- 배경 데코 공통 ---------- */
  decorIcon: {
    position: 'absolute',
    opacity: 0.9,
    // 터치 막기
    pointerEvents: 'none' as const,
    shadowColor: 'black',
    shadowOpacity: 0.4,
    shadowOffset: {
      width: 15,
      height: 15
    }
  },

  /** ---------- 메인 타이틀/캐릭터 영역 ---------- */
  title_container: {
    position: 'absolute',
    left: '12.1%',   // 45.5/375 = 12.1% (좌측 여백)
    right: '12.1%',  // 45.5/375 = 12.1% (우측 여백 - 좌우 대칭)
    top: '20.6%',    // 167/812 = 20.6%
    height: 175,
    // width 제거 - left + right로 자동 계산
  },
  title_run: {
    position: 'absolute',
    left: 0,
    top: '12.6%',    // 22/175 = 12.6%
    zIndex: 1,
    resizeMode: 'contain',
    // width, height는 동적으로 전달됨
  },
  title_taeho: {
    position: 'absolute',
    left: '29.3%',   // 83.25/284 = 29.3%
    top: '63.6%',    // 111.31/175 = 63.6%
    zIndex: 1,
    resizeMode: 'contain',
    // width, height는 동적으로 전달됨
  },
  // 캐릭터 세 개: 타이틀 주변에 퍼센트 위치 (Figma 기준)
  character2: {
    position: 'absolute',
    left: '27.8%',   // 79/284 = 27.8%
    top: 0,
    zIndex: 2,
    resizeMode: 'contain',
    // width, height는 동적으로 전달됨
  },
  character1: {
    position: 'absolute',
    left: '67.6%',   // 192/284 = 67.6%
    top: '10.9%',    // 19/175 = 10.9%
    transform: [{ rotate: '90deg' }],
    zIndex: 2,
    resizeMode: 'contain',
    // width, height는 동적으로 전달됨
  },
  character3: {
    position: 'absolute',
    left: '51.1%',   // 145/284 = 51.1%
    top: '56%',      // 98/175 = 56%
    zIndex: 2,
    resizeMode: 'contain',
    // width, height는 동적으로 전달됨
  },

  /** ---------- 버튼 영역 ---------- */
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 104,
    gap: 16,
  },
  googleButton: {
    height: 48, // Figma 기준
    width: '100%',
    borderRadius: 6, // Figma 기준
    backgroundColor: GREY.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1A1A1A',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    flexDirection: 'row',
  },
  appleButton: {
    height: 48, // Figma 기준
    width: '100%',
    borderRadius: 6, // Figma 기준
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1A1A1A',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    flexDirection: 'row',
  },

  // 버튼 내부 아이콘/텍스트
  buttonIcon: {
    width: 20,
    height: 20,
    marginRight: 6, // Figma gap: 6px
  },
  googleButtonText: {
    fontFamily: 'Pretendard-Bold',
    color: '#2B2B2B',
    fontSize: 14, // Figma 기준
  },
  appleButtonText: {
    fontFamily: 'Pretendard-Bold',
    color: GREY.WHITE,
    fontSize: 14, // Figma 기준
  },

  /** ---------- 디버그/기타 기존 스타일 유지 ---------- */
  unityTestButton: {
    width: 240,
    height: 38,
    backgroundColor: '#9C27B0',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  unityTestButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});