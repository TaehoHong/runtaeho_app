import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useUserStore, useAppStore, RunningState } from '~/stores';
import { StartButton } from '~/shared/components';
import { useRunning } from '../contexts';
import { permissionManager } from '~/services/PermissionManager';

/**
 * 러닝 시작 화면
 */
export const RunningStartView: React.FC = () => {
  const setRunningState = useAppStore((state) => state.setRunningState);
  const haveRunningRecord = useUserStore((state) => state.haveRunningRecord)
  console.log('[RunningStartView] haveRunningRecord: ', haveRunningRecord)

  const { startRunning } = useRunning();

  const handleStartRunning = async () => {
    console.log('🏃 [RunningStartView] 러닝 시작 버튼 눌러짐');

    // ===== 1. 권한 확인 =====
    console.log('[RunningStartView] Checking permissions...');
    const permissionCheck = await permissionManager.checkRequiredPermissions();

    if (!permissionCheck.hasAllPermissions) {
      console.warn('[RunningStartView] Missing permissions:', permissionCheck);

      // 거부된 권한 메시지 생성
      const message = permissionManager.getMissingPermissionsMessage(permissionCheck);

      // 설정으로 이동 안내
      Alert.alert(
        '권한이 필요합니다',
        `러닝을 시작하려면 다음 권한이 필요합니다.\n\n${message}\n\n설정에서 권한을 허용해주세요.`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '설정으로 이동',
            onPress: () => permissionManager.openAppSettings()
          }
        ]
      );
      return;
    }

    // ===== 2. 러닝 시작 =====
    try {
      console.log('✅ [RunningStartView] All permissions granted, starting running...');

      // RunningViewModel.startRunning() 호출 (GPS 추적, 타이머 시작)
      await startRunning();

      // 러닝 상태로 전환
      setRunningState(RunningState.Running);
      console.log('✅ [RunningStartView] 러닝 시작 완료');
    } catch (error) {
      console.error('❌ [RunningStartView] 러닝 시작 실패:', error);
      // 에러가 발생해도 UI 상태는 Running으로 전환 (ViewModel에서 더미 데이터 생성)
      setRunningState(RunningState.Running);
    }
  };

  return (
    <View style={styles.container}>
      <StartButton 
        onPress={handleStartRunning} 
        haveRunningRecord={haveRunningRecord}
      />
    </View>
  );
};

// 역호환성을 위한 export
export const RunningStart = RunningStartView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
});