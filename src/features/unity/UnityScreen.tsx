// UnityScreen.tsx - React Native 사용 예시
import React, { useEffect, useState } from 'react';
import { Alert, Button, NativeModules, StyleSheet, Text, View } from 'react-native';
import { UnityBridge } from './bridge/UnityBridge';
import { getUnityBridgeService } from './bridge/UnityBridgeService';
import { UnityView } from './components/UnityView';

console.log('[UnityScreen] Import completed. UnityBridge:', UnityBridge);
console.log('[UnityScreen] UnityBridge type:', typeof UnityBridge);
console.log('[UnityScreen] UnityBridge methods:', Object.getOwnPropertyNames(UnityBridge));


export const UnityScreen: React.FC = () => {
  const [showUnityView, setShowUnityView] = useState(false);
  const unityService = getUnityBridgeService();
  
  useEffect(() => {
    let cleanupFns: Array<() => void> = [];

    const setupUnity = async () => {
      try {
        // 네이티브 모듈 디버깅
        console.log('🔍 All NativeModules:', Object.keys(NativeModules));
        console.log('🔍 RNUnityBridge in NativeModules:', !!NativeModules.RNUnityBridge);
        console.log('🔍 RNUnityBridge module:', NativeModules.RNUnityBridge);

        // RNUnityBridge 이벤트 리스너 등록
        const statusCleanup = UnityBridge.addEventListener('onUnityStatus', (event) => {
          console.log('✅ [UnityScreen] Unity status:', event);
        });
        cleanupFns.push(statusCleanup);

        const errorCleanup = UnityBridge.addEventListener('onUnityError', (error) => {
          console.error('❌ [UnityScreen] Unity Error:', error);
          Alert.alert('Unity Error', error.message || 'Unknown error occurred');
        });
        cleanupFns.push(errorCleanup);

        const characterStateCleanup = UnityBridge.addEventListener('onCharacterStateChanged', (event) => {
          console.log('🎮 [UnityScreen] Character state changed:', event);
        });
        cleanupFns.push(characterStateCleanup);

        console.log('✅ [UnityScreen] Unity event listeners setup completed');
      } catch (error) {
        console.error('Failed to setup Unity:', error);
        Alert.alert('Setup Error', 'Failed to initialize Unity listeners');
      }
    };

    setupUnity();

    // Cleanup
    return () => {
      cleanupFns.forEach(cleanup => cleanup());
    };
  }, []);
  
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
  
  const handleMoveCharacter = async () => {
    if (!unityService) {
      Alert.alert('Error', 'Unity service not initialized');
      return;
    }
    
    try {
      await unityService.startMoving(5.0);
    } catch (error) {
      Alert.alert('Error', 'Failed to move character');
    }
  };
  
  const handleStopCharacter = async () => {
    if (!unityService) {
      Alert.alert('Error', 'Unity service not initialized');
      return;
    }
    
    try {
      await unityService.stopMoving();
    } catch (error) {
      Alert.alert('Error', 'Failed to stop character');
    }
  };
  
  const handleAttack = async () => {
    if (!unityService) {
      Alert.alert('Error', 'Unity service not initialized');
      return;
    }
    
    try {
      await unityService.performAttack();
    } catch (error) {
      Alert.alert('Error', 'Failed to perform attack');
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Character Control</Text>
          <Button title="Move Character" onPress={handleMoveCharacter} />
          <View style={styles.buttonSpacing} />
          <Button title="Stop Character" onPress={handleStopCharacter} />
          <View style={styles.buttonSpacing} />
          <Button title="Attack" onPress={handleAttack} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
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