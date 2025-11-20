import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import {
  Alert,
  Dimensions,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { Text } from '~/shared/components/typography';
import { Icon } from '~/shared/components/ui';
import { GREY, PRIMARY } from '~/shared/styles';
import { useAppStore } from '~/stores/app/appStore';
import { useUserStore } from '~/stores/user/userStore';
import { useAuthStore } from '..';
import { useAuthSignIn } from '../hooks/useAuthSignIn';

const { width, height } = Dimensions.get('window');

export const Login: React.FC = () => {
  console.log('🔐 [LOGIN] 로그인 화면 렌더링');

  const { isLoading, signInWithGoogle, signInWithApple } = useAuthSignIn();
  const resetUserStore = useUserStore((state) => state.resetAppState);
  const resetAuthStore = useAuthStore((state) => state.logout);
  const resetAppStore = useAppStore((state) => state.resetAppState);

  const handleClearAllData = async () => {
    Alert.alert(
      '⚠️ 모든 데이터 삭제',
      'AsyncStorage와 Zustand의 모든 persist 데이터를 삭제합니다.\n계속하시겠습니까?',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ [DEBUG] AsyncStorage 전체 삭제 시작');

              // 1. AsyncStorage 전체 삭제
              await AsyncStorage.clear();
              console.log('✅ [DEBUG] AsyncStorage 삭제 완료');

              // 2. Zustand 스토어 초기화
              resetUserStore();
              resetAuthStore();
              resetAppStore();
              console.log('✅ [DEBUG] Zustand 스토어 초기화 완료');

              Alert.alert('✅ 완료', '모든 데이터가 삭제되었습니다.');
            } catch (error) {
              console.error('❌ [DEBUG] 데이터 삭제 실패:', error);
              Alert.alert('❌ 오류', '데이터 삭제 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

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
        {/* 메인 텍스트 */}
        <Icon name="title_run" style={styles.title_run}/>
        <Icon name="title_taeho" style={styles.title_taeho}/>

        {/* 캐릭터들 - 텍스트 위에 배치 */}
        <Icon name="character_1" style={styles.character1}/>
        <Icon name="character_2" style={styles.character2}/>
        <Icon name="character_3" style={styles.character3}/>
      </View>

      {/* 로그인 버튼들 */}
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

        {/* 디버그 버튼: 모든 persist 데이터 삭제 */}
        {__DEV__ && (
          <TouchableOpacity style={styles.debugButton} onPress={handleClearAllData}>
            <Text style={styles.debugButtonText}>🗑️ 모든 데이터 삭제 (DEBUG)</Text>
          </TouchableOpacity>
        )}
      </View>
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
    left: '12.1%', // 45.5/375 = 12.1%
    top: '20.6%', // 167/812 = 20.6%
    width: 284,
    height: 175,
  },
  title_run: {
    position: 'absolute',
    left: 0,
    top: 22, // 189 - 167 = 22
    height: 64,
    width: 200,
    zIndex: 1,
  },
  title_taeho: {
    position: 'absolute',
    left: 83.25, // 128.74 - 45.5 = 83.24
    top: 111.31, // 278.31 - 167 = 111.31
    height: 63.75,
    width: 201.16,
    zIndex: 1,
  },
  // 캐릭터 세 개: 타이틀 주변에 고정 위치 (Figma 기준)
  character2: {
    position: 'absolute',
    left: 79, // 124.5 - 45.5 = 79
    top: 0, // 167 - 167 = 0
    width: 29,
    height: 29,
    zIndex: 2,
  },
  character1: {
    position: 'absolute',
    left: 190, // 258.5 - 45.5 = 213
    top: 19, // 186 - 167 = 19
    width: 29,
    height: 29,
    transform: [{ rotate: '90deg' }],
    zIndex: 2,
  },
  character3: {
    position: 'absolute',
    left: 145, // 190.5 - 45.5 = 145
    top: 98, // 265 - 167 = 98
    width: 33,
    height: 28,
    zIndex: 2,
  },

  /** ---------- 버튼 영역 ---------- */
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 40,
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
  debugButton: {
    width: '100%',
    height: 38,
    backgroundColor: '#F44336',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});