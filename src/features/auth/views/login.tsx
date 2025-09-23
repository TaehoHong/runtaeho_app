import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Alert,
  Platform,
  Text,
  TouchableOpacity,
} from 'react-native';
import {
  GoogleSigninButton,
} from '@react-native-google-signin/google-signin';
import { AuthViewModel } from '../viewmodels/auth-view-model';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

// iOS 전용 Apple Sign-In 모듈: 웹/안드로이드에선 로드하지 않음
let AppleButton: any = null;
if (Platform.OS === 'ios') {
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
        <GoogleSigninButton
          style={styles.googleButton}
          size={GoogleSigninButton.Size.Wide}
          color={GoogleSigninButton.Color.Light}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
        />

        {Platform.OS === 'ios' && AppleButton ? (
          <AppleButton
            buttonStyle={AppleButton.Style.BLACK}
            buttonType={AppleButton.Type.SIGN_IN}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />
        ) : null}

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