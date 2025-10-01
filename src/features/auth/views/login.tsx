import { router } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthSignIn } from '../hooks/useAuthSignIn';

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

  const { isLoading, signInWithGoogle, signInWithApple } = useAuthSignIn();

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

        {/* Unity 테스트를 위한 임시 버튼 */}
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