import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Platform, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { healthImportBridge } from '~/features/healthImport/native/HealthImportBridge';
import { healthImportService } from '~/features/healthImport/services/healthImportService';
import type { HealthPermissionStatus } from '~/features/healthImport/types';
import { permissionManager } from '~/services/PermissionManager';
import { TopScreenSafeAreaView } from '~/shared/components';
import { Text } from '~/shared/components/typography';
import { GREY, PRIMARY } from '~/shared/styles';

type PermissionState = {
  locationGranted: boolean;
  healthImportEnabled: boolean;
  healthPermissionStatus: HealthPermissionStatus;
};

type StatusVariant = 'enabled' | 'disabled' | 'warning';

const getHealthPermissionStatusView = (status: HealthPermissionStatus): {
  label: string;
  variant: StatusVariant;
} => {
  if (status === 'unavailable') {
    return { label: '지원 안 함', variant: 'disabled' };
  }

  if (Platform.OS === 'ios') {
    return { label: '건강 앱에서 확인', variant: 'disabled' };
  }

  if (status === 'granted') {
    return { label: '허용됨', variant: 'enabled' };
  }

  return { label: '권한 필요', variant: 'warning' };
};

export const PermissionSettingsView: React.FC = () => {
  const router = useRouter();
  const [permissions, setPermissions] = useState<PermissionState>({
    locationGranted: false,
    healthImportEnabled: false,
    healthPermissionStatus: 'unavailable',
  });
  const [isUpdatingHealthImportEnabled, setIsUpdatingHealthImportEnabled] = useState(false);

  const refreshPermissions = useCallback(async () => {
    try {
      const configuration = await healthImportService.getConfiguration();
      const locationPermission = await permissionManager.checkRequiredPermissions().catch(() => null);
      const healthAvailable = await healthImportBridge.isAvailable().catch(() => false);
      const healthPermissionStatus = healthAvailable
        ? await healthImportBridge.getPermissionStatus().catch(() => 'unavailable' as const)
        : 'unavailable';

      setPermissions({
        locationGranted: Boolean(locationPermission?.location && locationPermission.locationBackground),
        healthImportEnabled: configuration.healthImportEnabled,
        healthPermissionStatus,
      });
    } catch (error) {
      console.warn('[PermissionSettingsView] 권한 상태 확인 실패:', error);
      setPermissions({
        locationGranted: false,
        healthImportEnabled: false,
        healthPermissionStatus: 'unavailable',
      });
    }
  }, []);

  useEffect(() => {
    void refreshPermissions();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refreshPermissions();
      }
    });

    return () => subscription.remove();
  }, [refreshPermissions]);

  const openLocationSettings = async () => {
    await permissionManager.openAppSettings();
  };

  const requestHealthPermissionAndSync = useCallback(async () => {
    try {
      const available = await healthImportBridge.isAvailable();
      if (!available) {
        Alert.alert('Health 사용 불가', '이 기기에서는 Health 권한 설정을 사용할 수 없습니다.');
        return;
      }

      await healthImportBridge.requestPermissions({
        includeHistory: true,
        includeRoute: true,
      });

      if (Platform.OS === 'ios') {
        Alert.alert(
          'Health 권한 확인',
          '건강 앱 또는 설정 > Health > 데이터 접근 및 기기에서 달려라 태호군의 접근 권한을 확인해주세요.'
        );
      }

      await healthImportService.sync();
    } catch {
      Alert.alert('Health 권한 설정 실패', '기기 Health 설정에서 권한을 직접 변경해주세요.');
    } finally {
      void refreshPermissions();
    }
  }, [refreshPermissions]);

  const openHealthPermissionSettings = useCallback(async () => {
    try {
      const available = await healthImportBridge.isAvailable();
      if (!available) {
        Alert.alert('Health 사용 불가', '이 기기에서는 Health 권한 설정을 사용할 수 없습니다.');
        return;
      }

      if (Platform.OS === 'ios') {
        Alert.alert(
          'Health 권한 확인',
          '건강 앱 또는 설정 > Health > 데이터 접근 및 기기에서 달려라 태호군의 접근 권한을 확인해주세요.'
        );
        return;
      }

      await healthImportBridge.openHealthSettings();
    } catch {
      Alert.alert('Health 권한 설정 실패', '기기 Health 설정에서 권한을 직접 변경해주세요.');
    } finally {
      void refreshPermissions();
    }
  }, [refreshPermissions]);

  const handleHealthImportEnabledChange = async (enabled: boolean) => {
    setIsUpdatingHealthImportEnabled(true);
    try {
      const configuration = await healthImportService.setHealthImportEnabled(enabled);
      setPermissions((previous) => ({
        ...previous,
        healthImportEnabled: configuration.healthImportEnabled,
      }));

      if (enabled) {
        await requestHealthPermissionAndSync();
      } else {
        await refreshPermissions();
      }
    } catch {
      Alert.alert('설정 변경 실패', 'Health 앱 사용 설정을 변경할 수 없습니다.');
    } finally {
      setIsUpdatingHealthImportEnabled(false);
    }
  };

  return (
    <TopScreenSafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={GREY[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>권한 설정</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>기기 권한 상태</Text>
          <Text style={styles.infoDescription}>
            OS 설정에서 허용된 권한을 기준으로 표시돼요
          </Text>
        </View>

        <View style={styles.section}>
          <PermissionRow
            title="위치 권한"
            description="러닝 경로 측정에 사용"
            statusLabel={permissions.locationGranted ? '활성화' : '비활성화'}
            statusVariant={permissions.locationGranted ? 'enabled' : 'disabled'}
            onPress={openLocationSettings}
          />
          <View style={styles.separator} />
          <HealthPermissionSection
            appEnabled={permissions.healthImportEnabled}
            permissionStatus={permissions.healthPermissionStatus}
            isUpdating={isUpdatingHealthImportEnabled}
            onToggleAppEnabled={handleHealthImportEnabledChange}
            onPressPermission={openHealthPermissionSettings}
          />
        </View>

        <Text style={styles.note}>위치 권한과 Health OS 권한 상태를 눌러 기기 설정을 확인할 수 있습니다.</Text>
      </View>
    </TopScreenSafeAreaView>
  );
};

type PermissionRowProps = {
  title: string;
  description: string;
  statusLabel: string;
  statusVariant: StatusVariant;
  onPress: () => void;
};

const PermissionRow: React.FC<PermissionRowProps> = ({
  title,
  description,
  statusLabel,
  statusVariant,
  onPress,
}) => (
  <TouchableOpacity style={styles.permissionRow} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.permissionText}>
      <Text style={styles.permissionTitle}>{title}</Text>
      <Text style={styles.permissionDescription}>{description}</Text>
    </View>
    <View style={styles.permissionAction}>
      <StatusBadge label={statusLabel} variant={statusVariant} />
      <Ionicons name="chevron-forward" size={18} color={GREY[300]} />
    </View>
  </TouchableOpacity>
);

type HealthPermissionSectionProps = {
  appEnabled: boolean;
  permissionStatus: HealthPermissionStatus;
  isUpdating: boolean;
  onToggleAppEnabled: (enabled: boolean) => void;
  onPressPermission: () => void;
};

const HealthPermissionSection: React.FC<HealthPermissionSectionProps> = ({
  appEnabled,
  permissionStatus,
  isUpdating,
  onToggleAppEnabled,
  onPressPermission,
}) => {
  const statusView = getHealthPermissionStatusView(permissionStatus);

  return (
    <View style={styles.healthSection}>
      <Text style={styles.permissionTitle}>Health 권한</Text>

      <View style={styles.healthAppRow}>
        <View style={styles.permissionText}>
          <Text style={styles.healthSubTitle}>앱 사용 설정</Text>
          <Text style={styles.permissionDescription}>Health 러닝 기록 가져오기 사용</Text>
        </View>
        <Switch
          testID="health-import-enabled-switch"
          value={appEnabled}
          disabled={isUpdating}
          onValueChange={onToggleAppEnabled}
          trackColor={{ false: GREY[200], true: PRIMARY[600] }}
          thumbColor={GREY.WHITE}
          ios_backgroundColor={GREY[200]}
        />
      </View>

      <View style={styles.separator} />

      <TouchableOpacity
        testID="health-os-permission-row"
        style={styles.healthStatusRow}
        onPress={onPressPermission}
        activeOpacity={0.7}
      >
        <View style={styles.permissionText}>
          <Text style={styles.healthSubTitle}>OS 권한 상태</Text>
          <Text style={styles.permissionDescription}>건강 앱 권한 기준</Text>
        </View>
        <View style={styles.permissionAction}>
          <StatusBadge label={statusView.label} variant={statusView.variant} />
          <Ionicons name="chevron-forward" size={18} color={GREY[300]} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

type StatusBadgeProps = {
  label: string;
  variant: StatusVariant;
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ label, variant }) => (
  <View style={[styles.statusBadge, getStatusBadgeStyle(variant)]}>
    <Text style={[styles.statusText, getStatusTextStyle(variant)]}>{label}</Text>
  </View>
);

function getStatusBadgeStyle(variant: StatusVariant) {
  if (variant === 'enabled') return styles.enabledBadge;
  if (variant === 'warning') return styles.warningBadge;
  return styles.disabledBadge;
}

function getStatusTextStyle(variant: StatusVariant) {
  if (variant === 'enabled') return styles.enabledText;
  if (variant === 'warning') return styles.warningText;
  return styles.disabledText;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GREY[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: GREY.WHITE,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Pretendard',
    color: GREY[900],
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 20,
    gap: 16,
  },
  infoSection: {
    backgroundColor: GREY.WHITE,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Pretendard',
    color: GREY[900],
  },
  infoDescription: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Pretendard',
    color: GREY[500],
  },
  section: {
    backgroundColor: GREY.WHITE,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  permissionRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  permissionText: {
    flex: 1,
    gap: 6,
  },
  permissionTitle: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Pretendard',
    color: GREY[900],
  },
  healthSubTitle: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Pretendard',
    color: GREY[900],
  },
  permissionDescription: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Pretendard',
    color: GREY[500],
  },
  permissionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  healthSection: {
    paddingVertical: 16,
    gap: 14,
  },
  healthAppRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  healthStatusRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusBadge: {
    minWidth: 64,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  enabledBadge: {
    backgroundColor: PRIMARY[50],
  },
  disabledBadge: {
    backgroundColor: GREY[100],
  },
  warningBadge: {
    backgroundColor: '#FFF3F2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Pretendard',
  },
  enabledText: {
    color: PRIMARY[700],
  },
  disabledText: {
    color: GREY[500],
  },
  warningText: {
    color: '#F9514E',
  },
  separator: {
    height: 1,
    backgroundColor: GREY[100],
  },
  note: {
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Pretendard',
    color: GREY[500],
  },
});
