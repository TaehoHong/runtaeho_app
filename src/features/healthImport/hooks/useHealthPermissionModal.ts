import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import { healthImportBridge } from '../native/HealthImportBridge';
import { healthImportService } from '../services/healthImportService';

const HEALTH_PERMISSION_NOTICE_SEEN_KEY = '@health_permission_modal_completed';

const markSeen = async () => {
  await AsyncStorage.setItem(HEALTH_PERMISSION_NOTICE_SEEN_KEY, 'true');
};

export const useHealthPermissionModal = () => {
  const [visible, setVisible] = useState(false);

  const showIfNeeded = useCallback(async () => {
    try {
      const completed = await AsyncStorage.getItem(HEALTH_PERMISSION_NOTICE_SEEN_KEY);
      if (completed === 'true') return;

      const available = await healthImportBridge.isAvailable();
      if (!available) {
        await markSeen();
        return;
      }

      setVisible(true);
    } catch (error) {
      console.warn('[HealthImport] 최초 Health 권한 안내 확인 실패:', error);
    }
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    void markSeen();
  }, []);

  const requestPermission = useCallback(() => {
    setVisible(false);
    void (async () => {
      try {
        await healthImportBridge.requestPermissions({
          includeHistory: true,
          includeRoute: true,
        });
        await healthImportService.setHealthImportEnabled(true);
        await healthImportService.sync();
      } catch (error) {
        console.warn('[HealthImport] 최초 Health 권한 요청 실패:', error);
      } finally {
        await markSeen();
      }
    })();
  }, []);

  return {
    visible,
    showIfNeeded,
    close,
    requestPermission,
  };
};
