// UnityScreen.tsx - React Native 사용 예시
import React, { useEffect, useState } from 'react';
import { View, Button, StyleSheet, Alert } from 'react-native';
import { UnityBridge, UnityView } from './UnityBridge';

export const UnityScreen: React.FC = () => {
  const [isUnityReady, setIsUnityReady] = useState(false);

  useEffect(() => {
    let readyListener: any;
    let eventListener: any;
    let errorListener: any;

    const setupUnity = async () => {
      try {
        // Unity 초기화
        await UnityBridge.initialize();
        
        // 이벤트 리스너 등록
        readyListener = UnityBridge.addEventListener('UnityReady', (event) => {
          console.log('Unity is ready:', event);
          setIsUnityReady(true);
        });

        eventListener = UnityBridge.addEventListener('UnityEvent', (event) => {
          console.log('Unity Event:', event.eventName, event.data);
          // Unity에서 온 이벤트 처리
          handleUnityEvent(event);
        });

        errorListener = UnityBridge.addEventListener('UnityError', (error) => {
          console.error('Unity Error:', error);
          Alert.alert('Unity Error', error.message);
        });

      } catch (error) {
        console.error('Failed to setup Unity:', error);
        Alert.alert('Setup Failed', 'Failed to initialize Unity');
      }
    };

    setupUnity();

    // Cleanup
    return () => {
      UnityBridge.removeEventListener(readyListener);
      UnityBridge.removeEventListener(eventListener);
      UnityBridge.removeEventListener(errorListener);
    };
  }, []);

  const handleUnityEvent = (event: any) => {
    switch (event.eventName) {
      case 'PlayerScored':
        // 점수 처리
        console.log('Player scored:', event.data);
        break;
      case 'GameOver':
        // 게임 오버 처리
        console.log('Game over:', event.data);
        break;
      default:
        console.log('Unknown event:', event);
    }
  };

  const sendMessageToUnity = async (action: string) => {
    try {
      // Unity의 GameManager 오브젝트의 메서드 호출
      await UnityBridge.sendMessage('GameManager', action, JSON.stringify({ 
        timestamp: Date.now(),
        userId: 'user123'
      }));
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Unity View */}
      <UnityView style={styles.unityView} />
      
      {/* Control Buttons */}
      <View style={styles.controls}>
        <Button 
          title="Start Game" 
          onPress={() => sendMessageToUnity('StartGame')}
          disabled={!isUnityReady}
        />
        <Button 
          title="Pause" 
          onPress={() => UnityBridge.pause(true)}
          disabled={!isUnityReady}
        />
        <Button 
          title="Resume" 
          onPress={() => UnityBridge.pause(false)}
          disabled={!isUnityReady}
        />
        <Button 
          title="Reset" 
          onPress={() => sendMessageToUnity('ResetGame')}
          disabled={!isUnityReady}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  unityView: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
});
