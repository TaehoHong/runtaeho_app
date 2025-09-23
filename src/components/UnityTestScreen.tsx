/**
 * Unity Bridge 테스트 화면
 * Unity Bridge 기능을 테스트할 수 있는 UI 컴포넌트
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import { useUnityBridge } from '../contexts/UnityBridgeContext';
import { CharacterMotion, AvatarItem } from '../types/UnityTypes';
import UnityView, { UnityViewRef } from '../features/unity/components/UnityView';

export default function UnityTestScreen() {
  const {
    isConnected,
    isLoading,
    error,
    characterState,
    currentAvatar,
    unityStatus,
    setCharacterSpeed,
    stopCharacter,
    setCharacterMotion,
    changeAvatar,
    getUnityStatus,
  } = useUnityBridge();

  const [speedInput, setSpeedInput] = useState('5.0');
  const [showDebugInfo, setShowDebugInfo] = useState(true);
  const unityViewRef = useRef<UnityViewRef>(null);

  // ==========================================
  // Character Control Tests
  // ==========================================

  const testSetSpeed = async () => {
    try {
      const speed = parseFloat(speedInput);
      if (isNaN(speed)) {
        Alert.alert('오류', '올바른 숫자를 입력해주세요');
        return;
      }
      await setCharacterSpeed(speed);
      Alert.alert('성공', `캐릭터 속도를 ${speed}로 설정했습니다`);
    } catch (error) {
      Alert.alert('오류', `속도 설정 실패: ${error}`);
    }
  };

  const testStopCharacter = async () => {
    try {
      await stopCharacter();
      Alert.alert('성공', '캐릭터를 정지시켰습니다');
    } catch (error) {
      Alert.alert('오류', `캐릭터 정지 실패: ${error}`);
    }
  };

  const testSetMotion = async (motion: CharacterMotion) => {
    try {
      await setCharacterMotion(motion);
      Alert.alert('성공', `캐릭터 모션을 ${motion}로 설정했습니다`);
    } catch (error) {
      Alert.alert('오류', `모션 설정 실패: ${error}`);
    }
  };

  // ==========================================
  // Avatar Tests
  // ==========================================

  const testChangeAvatar = async () => {
    const testAvatarItems: AvatarItem[] = [
      {
        name: 'New_Hair_02',
        part: 'Hair',
        itemPath: 'Assets/05.Resource/Hair/New_Hair_02',
      },
      {
        name: 'New_Cloth_02',
        part: 'Cloth',
        itemPath: 'Assets/05.Resource/Cloth/New_Cloth_02',
      },
      {
        name: 'New_Pant_03',
        part: 'Pant',
        itemPath: 'Assets/05.Resource/Pant/New_Pant_03',
      },
    ];

    try {
      await changeAvatar(testAvatarItems);
      Alert.alert('성공', '아바타 변경을 요청했습니다');
    } catch (error) {
      Alert.alert('오류', `아바타 변경 실패: ${error}`);
    }
  };

  // ==========================================
  // Status Tests
  // ==========================================

  const testGetStatus = async () => {
    try {
      await getUnityStatus();
      Alert.alert('성공', 'Unity 상태 정보를 요청했습니다');
    } catch (error) {
      Alert.alert('오류', `상태 정보 요청 실패: ${error}`);
    }
  };

  // ==========================================
  // Render Helpers
  // ==========================================

  const renderConnectionStatus = () => (
    <View style={styles.statusContainer}>
      <Text style={styles.statusTitle}>연결 상태</Text>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Unity 연결:</Text>
        <Text style={[styles.statusValue, { color: isConnected ? '#4CAF50' : '#F44336' }]}>
          {isConnected ? '연결됨' : '연결 안됨'}
        </Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>로딩 중:</Text>
        <Text style={styles.statusValue}>{isLoading ? '예' : '아니오'}</Text>
      </View>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>에러:</Text>
          <Text style={styles.errorText}>{error.message}</Text>
          <Text style={styles.errorType}>타입: {error.type}</Text>
        </View>
      )}
    </View>
  );

  const renderCharacterState = () => (
    <View style={styles.statusContainer}>
      <Text style={styles.statusTitle}>캐릭터 상태</Text>
      {characterState ? (
        <>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>모션:</Text>
            <Text style={styles.statusValue}>{characterState.motion}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>속도:</Text>
            <Text style={styles.statusValue}>{characterState.speed}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>움직임:</Text>
            <Text style={styles.statusValue}>{characterState.isMoving ? '움직임' : '정지'}</Text>
          </View>
        </>
      ) : (
        <Text style={styles.noDataText}>캐릭터 상태 없음</Text>
      )}
    </View>
  );

  const renderUnityStatus = () => (
    <View style={styles.statusContainer}>
      <Text style={styles.statusTitle}>Unity 상태</Text>
      {unityStatus ? (
        <>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>캐릭터 매니저:</Text>
            <Text style={styles.statusValue}>
              {unityStatus.characterManagerExists ? '존재함' : '없음'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>현재 속도:</Text>
            <Text style={styles.statusValue}>{unityStatus.currentSpeed}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>타임스탬프:</Text>
            <Text style={styles.statusValue}>{unityStatus.timestamp}</Text>
          </View>
        </>
      ) : (
        <Text style={styles.noDataText}>Unity 상태 없음</Text>
      )}
    </View>
  );

  const renderAvatarInfo = () => (
    <View style={styles.statusContainer}>
      <Text style={styles.statusTitle}>아바타 정보</Text>
      {currentAvatar && currentAvatar.items.length > 0 ? (
        currentAvatar.items.map((item, index) => (
          <View key={index} style={styles.avatarItem}>
            <Text style={styles.avatarItemText}>
              {item.part}: {item.name}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.noDataText}>아바타 정보 없음</Text>
      )}
    </View>
  );

  // Unity View 이벤트 핸들러들
  const handleUnityReady = (event: { nativeEvent: { message: string; timestamp: string } }) => {
    console.log('[UnityTestScreen] Unity Ready:', event.nativeEvent);
    Alert.alert('Unity 준비 완료', event.nativeEvent.message);
  };

  const handleUnityError = (event: { nativeEvent: { error: string; timestamp: string } }) => {
    console.error('[UnityTestScreen] Unity Error:', event.nativeEvent);
    Alert.alert('Unity 오류', event.nativeEvent.error);
  };

  const handleCharacterStateChanged = (event: { nativeEvent: { state: string; timestamp: string } }) => {
    console.log('[UnityTestScreen] Character State Changed:', event.nativeEvent);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Unity Bridge 테스트</Text>

      {/* Unity View */}
      <View style={styles.unityContainer}>
        <Text style={styles.sectionTitle}>Unity 화면</Text>
        <UnityView
          ref={unityViewRef}
          style={styles.unityView}
          onUnityReady={handleUnityReady}
          onUnityError={handleUnityError}
          onCharacterStateChanged={handleCharacterStateChanged}
        />
      </View>

      {/* Debug Toggle */}
      <View style={styles.debugToggle}>
        <Text style={styles.debugLabel}>디버그 정보 표시</Text>
        <Switch
          value={showDebugInfo}
          onValueChange={setShowDebugInfo}
        />
      </View>

      {/* Connection Status */}
      {showDebugInfo && renderConnectionStatus()}

      {/* Character Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>캐릭터 제어</Text>

        <View style={styles.speedInputContainer}>
          <Text style={styles.inputLabel}>속도:</Text>
          <TextInput
            style={styles.speedInput}
            value={speedInput}
            onChangeText={setSpeedInput}
            keyboardType="numeric"
            placeholder="5.0"
          />
          <TouchableOpacity style={styles.button} onPress={testSetSpeed}>
            <Text style={styles.buttonText}>속도 설정</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.stopButton} onPress={testStopCharacter}>
          <Text style={styles.buttonText}>캐릭터 정지</Text>
        </TouchableOpacity>

        <View style={styles.motionButtons}>
          <TouchableOpacity
            style={styles.motionButton}
            onPress={() => testSetMotion('IDLE')}
          >
            <Text style={styles.buttonText}>대기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.motionButton}
            onPress={() => testSetMotion('MOVE')}
          >
            <Text style={styles.buttonText}>이동</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.motionButton}
            onPress={() => testSetMotion('ATTACK')}
          >
            <Text style={styles.buttonText}>공격</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.motionButton}
            onPress={() => testSetMotion('DAMAGED')}
          >
            <Text style={styles.buttonText}>피해</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Avatar Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>아바타 제어</Text>
        <TouchableOpacity style={styles.button} onPress={testChangeAvatar}>
          <Text style={styles.buttonText}>테스트 아바타 적용</Text>
        </TouchableOpacity>
      </View>

      {/* Unity Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Unity 상태</Text>
        <TouchableOpacity style={styles.button} onPress={testGetStatus}>
          <Text style={styles.buttonText}>상태 정보 요청</Text>
        </TouchableOpacity>
      </View>

      {/* Debug Information */}
      {showDebugInfo && (
        <>
          {renderCharacterState()}
          {renderUnityStatus()}
          {renderAvatarInfo()}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  debugToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  debugLabel: {
    fontSize: 16,
    color: '#333',
  },
  unityContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  unityView: {
    width: '100%',
    height: 300,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  speedInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    minWidth: 40,
  },
  speedInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  stopButton: {
    backgroundColor: '#F44336',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  motionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  motionButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 6,
    flex: 1,
    minWidth: 70,
    alignItems: 'center',
  },
  statusContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    marginBottom: 2,
  },
  errorType: {
    fontSize: 12,
    color: '#999',
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  avatarItem: {
    paddingVertical: 4,
  },
  avatarItemText: {
    fontSize: 14,
    color: '#333',
  },
});