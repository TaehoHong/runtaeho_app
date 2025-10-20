import { router } from 'expo-router';
import React from 'react';
import {
  Alert,
  Dimensions,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from '~/shared/components/typography';
import { useAuthSignIn } from '../hooks/useAuthSignIn';
import { useUserStore } from '~/stores/user/userStore';
import { useAuthStore } from '~/stores/auth/';
import { useAppStore } from '~/stores/app/appStore';

const { width, height } = Dimensions.get('window');

// iOS 전용 Apple Sign-In 모듈: 웹/안드로이드에선 로드하지 않음
let AppleButton: any = null;
if (Platform.OS === 'ios') {
  const mod = require('@invertase/react-native-apple-authentication');
  AppleButton = mod.AppleButton;
}

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
      <View style={styles.buttonContainer}>

        {/* Google 로그인 버튼 */}
        <TouchableOpacity
          style={[styles.googleButton, { backgroundColor: '#4285F4', justifyContent: 'center', alignItems: 'center' }]}
          onPress={signInWithGoogle}
          disabled={isLoading}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>
            {isLoading ? '로그인 중...' : 'Google로 로그인'}
          </Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && AppleButton ? (
          <AppleButton
            buttonStyle={AppleButton.Style.BLACK}
            buttonType={AppleButton.Type.SIGN_IN}
            style={styles.appleButton}
            onPress={signInWithApple}
          />
        ) : null}

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
    backgroundColor: '#FFFFFF',
  },
  buttonContainer: {
    position: 'absolute',
    left: (width - 240) / 2,
    top: height * 0.75 - 80,
    gap: 10,
  },
  googleButton: {
    width: 240,
    height: 38,
  },
  appleButton: {
    width: 240,
    height: 38,
  },
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
    width: 240,
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