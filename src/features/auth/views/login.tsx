import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthViewModel } from '../viewmodels/AuthViewModel';

const { width, height } = Dimensions.get('window');

// iOS 전용 Apple Sign-In 모듈: 웹/안드로이드에선 로드하지 않음
let AppleButton: any = null;
if (Platform.OS === 'ios') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@invertase/react-native-apple-authentication');
  AppleButton = mod.AppleButton;
}

export const Login: React.FC = () => {
  console.log('🔐 [LOGIN] 로그인 화면 렌더링');
  const [isLoading, setIsLoading] = useState(false);

  const authViewModel = useMemo(() => {
    console.log('🏗️ [LOGIN] AuthViewModel 생성');
    return new AuthViewModel();
  }, []);

  const handleGoogleSignIn = async () => {
    if (isLoading) return;

    console.log('🟦 [LOGIN] Google 로그인 시도');
    setIsLoading(true);

    try {
      const result = await authViewModel.signInWithGoogle();
      if (result.success) {
        console.log('✅ [LOGIN] Google 로그인 성공');
      } else {
        console.log('❌ [LOGIN] Google 로그인 실패:', result.error);
        Alert.alert('로그인 실패', result.error || '알 수 없는 오류가 발생했습니다.');
      }
    } catch (error: any) {
      console.error('❌ [LOGIN] Google 로그인 예외:', error);
      Alert.alert('로그인 실패', '로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (isLoading || Platform.OS !== 'ios') return;

    console.log('🍎 [LOGIN] Apple 로그인 시도');
    setIsLoading(true);

    try {
      const result = await authViewModel.signInWithApple();
      if (result.success) {
        console.log('✅ [LOGIN] Apple 로그인 성공');
      } else {
        console.log('❌ [LOGIN] Apple 로그인 실패:', result.error);
        Alert.alert('로그인 실패', result.error || '알 수 없는 오류가 발생했습니다.');
      }
    } catch (error: any) {
      console.error('❌ [LOGIN] Apple 로그인 예외:', error);
      Alert.alert('로그인 실패', '로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnityTest = () => {
    console.log('🎮 [LOGIN] Unity 테스트 페이지로 이동');
    router.push('/unity-test');
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>

        {/* Google 로그인 버튼 */}
        <TouchableOpacity
          style={[styles.googleButton, { backgroundColor: '#4285F4', justifyContent: 'center', alignItems: 'center' }]}
          onPress={handleGoogleSignIn}
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
            onPress={handleAppleSignIn}
          />
        ) : null}

        {/* Unity 테스트를 위한 임시 버튼 */}
        <TouchableOpacity
          style={[styles.googleButton, { backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginTop: 10 }]}
          onPress={() => router.push('/unity-test')}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>
            Unity 테스트 (임시)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.unityTestButton} onPress={handleUnityTest}>
          <Text style={styles.unityTestButtonText}>🎮 Unity Bridge 테스트</Text>
        </TouchableOpacity>
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
});