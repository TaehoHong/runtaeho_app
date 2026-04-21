import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useUserStore, useAppStore, RunningState } from '~/stores';
import { StartButton } from './components/start-button';
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

    console.log('[RunningStartView] Checking permissions...');
    const permissionCheck = await permissionManager.checkRequiredPermissions();

    if (!permissionCheck.canStartRunning) {
      console.warn('[RunningStartView] Missing permissions:', permissionCheck);
      setShowPermissionModal(true);
      return;
    }

    try {
      console.log('✅ [RunningStartView] All permissions granted, starting running...');
      await startRunning();
      setRunningState(RunningState.Running);
      console.log('✅ [RunningStartView] 러닝 시작 완료');
    } catch (error) {
      console.error('❌ [RunningStartView] 러닝 시작 실패:', error);
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
