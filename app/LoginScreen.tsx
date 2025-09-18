import React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useAuthViewModel } from '~/features/auth/hooks/useAuthViewModel';

const { width, height } = Dimensions.get('window');

// iOS 전용 Apple Sign-In 모듈: 웹/안드로이드에선 로드하지 않음
let AppleButton: any = null;
let appleAuth: any = null;
if (Platform.OS === 'ios') {
  const mod = require('@invertase/react-native-apple-authentication');
  AppleButton = mod.AppleButton;
  appleAuth = mod.appleAuth;
}

const LoginScreen: React.FC = () => {
  const { signIn, isLoading, error } = useAuthViewModel();

  React.useEffect(() => {
    // Google Sign-In 설정
    GoogleSignin.configure({
      iosClientId: '620303212609-581f7f3bgj104gtaermbtjqqf8u6khb8.apps.googleusercontent.com',
      webClientId: '620303212609-tqerha7lmhgr719hd8qsd09kualf72l7.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

  React.useEffect(() => {
    if (error) {
      Alert.alert('로그인 실패', error, [
        {
          text: '확인',
          style: 'cancel',
        },
      ]);
    }
  }, [error]);

  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      if (userInfo.data?.serverAuthCode) {
        await signIn('GOOGLE', userInfo.data?.serverAuthCode);
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // 사용자가 취소함
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // 이미 진행 중
      } else {
        console.error('Google Sign-In Error:', error);
      }
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios' || !appleAuth) return;
    try {
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      if (appleAuthRequestResponse.authorizationCode) {
        await signIn('APPLE', appleAuthRequestResponse.authorizationCode);
      }
    } catch (error: any) {
      if (error.code === appleAuth.Error.CANCELED) {
        // 사용자가 취소함
      } else {
        console.error('Apple Sign-In Error:', error);
      }
    }
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
    top: height * 0.75 - 50, // iOS와 동일한 위치
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
});

export default LoginScreen;