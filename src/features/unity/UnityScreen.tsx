// UnityScreen.tsx - React Native 사용 예시
import React, { useEffect, useState } from 'react';
import { GREY } from '~/shared/styles';
import { Alert, Button, NativeModules, StyleSheet, View } from 'react-native';
import { Text } from '~/shared/components/typography';import { UnityBridge } from './bridge/UnityBridge';
import { UnityView } from './components/UnityView';

console.log('[UnityScreen] Import completed. UnityBridge:', UnityBridge);
console.log('[UnityScreen] UnityBridge type:', typeof UnityBridge);
console.log('[UnityScreen] UnityBridge methods:', Object.getOwnPropertyNames(UnityBridge));


export const UnityScreen: React.FC = () => {
  const [showUnityView, setShowUnityView] = useState(false);

  
  const handleUnityMessage = (message: any) => {
    // Unity에서 온 메시지 처리
    console.log('Processing Unity message:', message);
  };
  
  const handleShowUnity = async () => {
    try {
      console.log('🎮 [UnityScreen] Show Unity button pressed');
      console.log('🎮 [UnityScreen] showUnityView:', showUnityView);

      setShowUnityView(true);
      // UnityView 컴포넌트가 자동으로 Unity를 시작합니다
      console.log('✅ [UnityScreen] Unity view shown');
    } catch (error) {
      console.error('❌ [UnityScreen] Failed to show Unity:', error);
      Alert.alert('Error', 'Failed to show Unity');
    }
  };

  const handleHideUnity = async () => {
    try {
      console.log('[DEBUG] About to hide Unity view');
      setShowUnityView(false);
      // UnityView 컴포넌트가 자동으로 Unity를 정리합니다
    } catch (error) {
      console.error('[DEBUG] Failed to hide Unity:', error);
      Alert.alert('Error', 'Failed to hide Unity');
    }
  };
  
  const handleSendMessage = async () => {
    try {
      await UnityBridge.sendUnityMessage('Charactor', 'SetSpeed', '5');
      Alert.alert('Success', 'Message sent to Unity');
    } catch (error) {
      Alert.alert('Error', 'Failed to send message to Unity');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unity Bridge Demo</Text>
      {/* Unity 화면 (화면의 절반) - React Native UnityView 컴포넌트 */}
      <View style={styles.unityWrapper}>
        {showUnityView && <UnityView style={styles.unityView} />}
      </View>
      <View style={styles.controlsWrapper}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Unity Control</Text>
          <Button title="Show Unity" onPress={handleShowUnity} />
          <View style={styles.buttonSpacing} />
          <Button title="Hide Unity" onPress={handleHideUnity} />
          <View style={styles.buttonSpacing} />
          <Button title="Send Test Message" onPress={handleSendMessage} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: GREY[50],
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  unityWrapper: {
    flex: 0.5, // 전체 높이의 절반
    backgroundColor: 'black',
    borderRadius: 10,
    overflow: 'hidden',
  },
  unityView: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  buttonSpacing: {
    height: 10,
  },
  controlsWrapper: {
    flex: 0.5,
    paddingTop: 20,
  },
});

export default UnityScreen;