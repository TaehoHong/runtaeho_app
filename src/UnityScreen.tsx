// UnityScreen.tsx - React Native 사용 예시
import React, { useEffect, useState } from 'react';
import { View, Button, StyleSheet, Alert, Text } from 'react-native';
import { UnityBridge } from './features/unity/bridge/UnityBridge';
import { getUnityBridgeService } from './features/unity/bridge/UnityBridgeService';

export const UnityScreen: React.FC = () => {
  const [isUnityReady, setIsUnityReady] = useState(false);
  const unityService = getUnityBridgeService();
  
  useEffect(() => {
    let cleanupFns: Array<() => void> = [];
    
    const setupUnity = async () => {
      try {
        // Unity Ready 리스너 등록
        const readyCleanup = UnityBridge.addEventListener('UnityReady', (event) => {
          console.log('Unity is ready:', event);
          setIsUnityReady(true);
        });
        cleanupFns.push(readyCleanup);
        
        // Unity Message 리스너 등록
        const messageCleanup = UnityBridge.addEventListener('UnityMessage', (event) => {
          console.log('Unity Message:', event);
          handleUnityMessage(event);
        });
        cleanupFns.push(messageCleanup);
        
        // Unity Error 리스너 등록
        const errorCleanup = UnityBridge.addEventListener('UnityError', (error) => {
          console.error('Unity Error:', error);
          Alert.alert('Unity Error', error.error || 'Unknown error occurred');
        });
        cleanupFns.push(errorCleanup);
        
        console.log('Unity setup completed');
      } catch (error) {
        console.error('Failed to setup Unity:', error);
        Alert.alert('Setup Error', 'Failed to initialize Unity');
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
      await UnityBridge.showUnity();
    } catch (error) {
      Alert.alert('Error', 'Failed to show Unity');
    }
  };
  
  const handleHideUnity = async () => {
    try {
      await UnityBridge.hideUnity();
    } catch (error) {
      Alert.alert('Error', 'Failed to hide Unity');
    }
  };
  
  const handleSendMessage = async () => {
    try {
      await UnityBridge.sendMessage('Charactor', 'SetSpeed', '5');
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
      <Text style={styles.status}>
        Unity Status: {isUnityReady ? 'Ready ✅' : 'Not Ready ❌'}
      </Text>
      
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
});

export default UnityScreen;