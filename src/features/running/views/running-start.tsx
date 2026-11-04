import { getSessionSnapshot, isSessionCurrent } from '~/features/auth/stores/authStore';
import { AdBanner } from '~/features/ads/AdBanner';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMainTabBarScrollContentPaddingBottom } from '~/shared/utils/safeAreaPolicy';
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
  const haveRunningRecord = useUserStore((state) => state.haveRunningRecord);

  const { startRunning, isStarting } = useRunning();
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();

  useEffect(() => {
    console.log('[RunningStartView] haveRunningRecord: ', haveRunningRecord);
  }, [haveRunningRecord]);

  const handleStartRunning = async () => {
    const session = getSessionSnapshot();
    console.log('🏃 [RunningStartView] 러닝 시작 버튼 눌러짐');

    console.log('[RunningStartView] Checking permissions...');
    const permissionCheck = await permissionManager.checkRequiredPermissions();
    if (!isSessionCurrent(session)) return;

    if (!permissionCheck.canStartRunning) {
      console.warn('[RunningStartView] Missing permissions:', permissionCheck);
      setShowPermissionModal(true);
      return;
    }

    try {
      console.log('✅ [RunningStartView] All permissions granted, starting running...');
      await startRunning();
      if (isSessionCurrent(session)) setRunningState(RunningState.Running);
      console.log('✅ [RunningStartView] 러닝 시작 완료');
    } catch (error) {
      console.error('❌ [RunningStartView] 러닝 시작 실패:', error);
    }
  };

  const handlePermissionModalClose = () => {
    setShowPermissionModal(false);
  };

  return (
    <>
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: getMainTabBarScrollContentPaddingBottom(insets.bottom, fontScale) },
      ]}
    >
      <AdBanner visible={!isStarting && !showPermissionModal} />
      <StartButton
        disabled={isStarting}
        onPress={handleStartRunning}
        haveRunningRecord={haveRunningRecord}
      />
    </ScrollView>
      <PermissionRequestModal
        visible={showPermissionModal}
        onClose={handlePermissionModalClose}
      />
    </>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingTop: 16,
  },
});
