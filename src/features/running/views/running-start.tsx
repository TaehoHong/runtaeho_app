import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useUserStore, useAppStore, RunningState } from '~/stores';
import { StartButton } from '~/shared/components';
import { useRunning } from '../contexts';
import { permissionManager } from '~/services/PermissionManager';
import { PermissionRequestModal } from '~/features/permissions/views/PermissionRequestModal';

/**
 * 러닝 시작 화면
 */
export const RunningStartView: React.FC = () => {
  const setRunningState = useAppStore((state) => state.setRunningState);
  const haveRunningRecord = useUserStore((state) => state.haveRunningRecord)
  console.log('[RunningStartView] haveRunningRecord: ', haveRunningRecord)

  const { startRunning } = useRunning();
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const handleStartRunning = async () => {
    console.log('🏃 [RunningStartView] 러닝 시작 버튼 눌러짐');

    // ===== 1. 권한 확인 =====
    console.log('[RunningStartView] Checking permissions...');
    const permissionCheck = await permissionManager.checkRequiredPermissions();

    if (!permissionCheck.hasAllPermissions) {
      console.warn('[RunningStartView] Missing permissions:', permissionCheck);
      // 권한이 없으면 모달 표시
      setShowPermissionModal(true);
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

  const handlePermissionModalClose = () => {
    setShowPermissionModal(false);
  };

  return (
    <View style={styles.container}>
      <StartButton
        onPress={handleStartRunning}
        haveRunningRecord={haveRunningRecord}
      />
      <PermissionRequestModal
        visible={showPermissionModal}
        onClose={handlePermissionModalClose}
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