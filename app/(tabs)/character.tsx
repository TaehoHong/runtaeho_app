/**
 * Character 탭 화면
 * Unity 캐릭터 관리 및 아바타 커스터마이징
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useUnityBridge } from '~/contexts/UnityBridgeContext';
import {
  setCharacterSpeed,
  stopCharacter,
  setCharacterMotion,
  changeAvatar,
  getUnityStatus,
  checkUnityConnection,
  selectUnityState,
  selectIsUnityConnected,
  selectCharacterState,
  selectCurrentAvatar,
  selectUnityLoading,
  selectUnityError,
} from '~/store/slices/unitySlice';
import type { AvatarItem, CharacterMotion } from '~/types/UnityTypes';
import UnityView, { UnityViewRef } from '~/components/UnityView';

export default function CharacterScreen() {
  const dispatch = useDispatch();
  const unityViewRef = useRef<UnityViewRef>(null);

  // Redux state
  const unityState = useSelector(selectUnityState);
  const isConnected = useSelector(selectIsUnityConnected);
  const characterState = useSelector(selectCharacterState);
  const currentAvatar = useSelector(selectCurrentAvatar);
  const isLoading = useSelector(selectUnityLoading);
  const error = useSelector(selectUnityError);

  // Unity Bridge Context (백업용)
  const unityBridge = useUnityBridge();

  useEffect(() => {
    // 컴포넌트 마운트 시 Unity 연결 상태 확인
    dispatch(checkUnityConnection() as any);
  }, [dispatch]);

  // ==========================================
  // Unity View 이벤트 핸들러들
  // ==========================================

  const handleUnityReady = (event: any) => {
    console.log('[Character] Unity ready:', event.nativeEvent);
    Alert.alert('Unity 준비 완료', 'Unity가 성공적으로 로드되었습니다.');
  };

  const handleUnityError = (event: any) => {
    console.error('[Character] Unity error:', event.nativeEvent);
    Alert.alert('Unity 오류', `Unity 로드 중 오류가 발생했습니다: ${event.nativeEvent.error}`);
  };

  const handleUnityCharacterStateChanged = (event: any) => {
    console.log('[Character] Unity character state changed:', event.nativeEvent);
    // Redux 상태 업데이트는 기존 Unity Bridge Context에서 처리
  };

  // ==========================================
  // 캐릭터 제어 함수들
  // ==========================================

  const handleSetSpeed = async (speed: number) => {
    try {
      await dispatch(setCharacterSpeed(speed) as any).unwrap();
      Alert.alert('성공', `캐릭터 속도를 ${speed}로 설정했습니다`);
    } catch (error: any) {
      Alert.alert('오류', `속도 설정 실패: ${error.message}`);
    }
  };

  const handleStopCharacter = async () => {
    try {
      await dispatch(stopCharacter() as any).unwrap();
      Alert.alert('성공', '캐릭터를 정지시켰습니다');
    } catch (error: any) {
      Alert.alert('오류', `캐릭터 정지 실패: ${error.message}`);
    }
  };

  const handleSetMotion = async (motion: CharacterMotion) => {
    try {
      await dispatch(setCharacterMotion(motion) as any).unwrap();
      Alert.alert('성공', `캐릭터 모션을 ${motion}로 설정했습니다`);
    } catch (error: any) {
      Alert.alert('오류', `모션 설정 실패: ${error.message}`);
    }
  };

  const handleChangeAvatar = async () => {
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
      await dispatch(changeAvatar(testAvatarItems) as any).unwrap();
      Alert.alert('성공', '아바타 변경을 완료했습니다');
    } catch (error: any) {
      Alert.alert('오류', `아바타 변경 실패: ${error.message}`);
    }
  };

  const handleGetStatus = async () => {
    try {
      await dispatch(getUnityStatus() as any).unwrap();
      Alert.alert('성공', 'Unity 상태 정보를 요청했습니다');
    } catch (error: any) {
      Alert.alert('오류', `상태 정보 요청 실패: ${error.message}`);
    }
  };

  const handleCheckConnection = async () => {
    try {
      const result = await dispatch(checkUnityConnection() as any).unwrap();
      Alert.alert(
        '연결 상태',
        result.isConnected ? 'Unity가 연결되어 있습니다' : 'Unity가 연결되어 있지 않습니다'
      );
    } catch (error: any) {
      Alert.alert('오류', `연결 확인 실패: ${error.message}`);
    }
  };

  // ==========================================
  // 렌더링 함수들
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

  const renderControlButtons = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>캐릭터 제어</Text>

      <View style={styles.speedButtons}>
        <TouchableOpacity
          style={styles.speedButton}
          onPress={() => handleSetSpeed(3)}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>천천히</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.speedButton}
          onPress={() => handleSetSpeed(5)}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>보통</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.speedButton}
          onPress={() => handleSetSpeed(8)}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>빠르게</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.stopButton}
        onPress={handleStopCharacter}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>캐릭터 정지</Text>
      </TouchableOpacity>

      <View style={styles.motionButtons}>
        <TouchableOpacity
          style={styles.motionButton}
          onPress={() => handleSetMotion('IDLE')}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>대기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.motionButton}
          onPress={() => handleSetMotion('MOVE')}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>이동</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.motionButton}
          onPress={() => handleSetMotion('ATTACK')}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>공격</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.motionButton}
          onPress={() => handleSetMotion('DAMAGED')}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>피해</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAvatarControls = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>아바타 커스터마이징</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={handleChangeAvatar}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>테스트 아바타 적용</Text>
      </TouchableOpacity>
    </View>
  );

  const renderUtilityButtons = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>유틸리티</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={handleCheckConnection}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>연결 상태 확인</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={handleGetStatus}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>Unity 상태 요청</Text>
      </TouchableOpacity>
    </View>
  );

  const renderUnityView = () => (
    <View style={styles.unityContainer}>
      <Text style={styles.sectionTitle}>Unity 캐릭터 뷰</Text>
      <UnityView
        ref={unityViewRef}
        style={styles.unityView}
        onUnityReady={handleUnityReady}
        onUnityError={handleUnityError}
        onCharacterStateChanged={handleUnityCharacterStateChanged}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>캐릭터 관리</Text>

      {renderConnectionStatus()}
      {renderUnityView()}
      {renderControlButtons()}
      {renderAvatarControls()}
      {renderUtilityButtons()}
      {renderCharacterState()}
      {renderAvatarInfo()}
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
    borderRadius: 8,
    backgroundColor: '#000',
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
  speedButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  speedButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
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