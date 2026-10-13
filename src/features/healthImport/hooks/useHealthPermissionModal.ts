import { getSessionSnapshot, isSessionCurrent } from '~/features/auth/stores/authStore';
import { SessionSupersededError } from '~/utils/storage/errors';
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
    } catch {
      console.warn('[HealthImport] permission notice check failed');
    }
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    void markSeen();
  }, []);

  const requestPermission = useCallback(() => {
    setVisible(false);
    const snapshot = getSessionSnapshot();
    void (async () => {
      try {
        await healthImportBridge.requestPermissions({
          includeHistory: true,
          includeRoute: true,
        });
        if (!isSessionCurrent(snapshot)) throw new SessionSupersededError();
        await healthImportService.setHealthImportEnabled(true, snapshot);
        await healthImportService.sync(snapshot);
      } catch (error) {
        console.warn('[HealthImport] permission request failed', {
          errorCode: error instanceof SessionSupersededError ? 'session_superseded' : 'health_permission_failed',
        });
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
