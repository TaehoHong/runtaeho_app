import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useAppTranslation } from '~/i18n';
import { Text } from '~/shared/components/typography';
import { GREY } from '~/shared/styles';
import type { RunningRecord } from '../../models';

const isGarmin = (record: RunningRecord): boolean => record.source === 'GARMIN' || (
  record.source === 'HEALTH' && record.sourceAppId === 'com.garmin.android.apps.connectmobile'
);

export const getRunningRecordSourceLabel = (
  record: RunningRecord,
  t: ReturnType<typeof useAppTranslation>,
): string | null => {
  if (isGarmin(record)) return 'Garmin';
  switch (record.source) {
    case 'HEALTH': {
      const appName = record.sourceAppName?.trim();
      return appName ? t("건강 연동 · {{appName}}", { appName }) : t("건강 연동");
    }
    case 'APPLE_WATCH': return t("Apple Watch");
    case 'WEAR_OS': return t("Wear OS");
    default: return null;
  }
};

export const RunningRecordSource: React.FC<{
  record: RunningRecord;
  variant?: 'compact' | 'detail';
}> = ({ record, variant = 'compact' }) => {
  const t = useAppTranslation();
  const label = getRunningRecordSourceLabel(record, t);
  if (!label) return null;

  return (
    <View style={[styles.source, variant === 'detail' ? styles.detail : styles.compact]}>
      {isGarmin(record) ? (
        <Image source={require('../../../../../assets/images/garmin-connect.png')} style={styles.logo} accessible={false} />
      ) : null}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  source: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  compact: { marginTop: 8 },
  detail: { maxWidth: 132, flexShrink: 1, justifyContent: 'flex-end' },
  logo: { width: 20, height: 20, resizeMode: 'contain' },
  label: { flexShrink: 1, fontSize: 12, lineHeight: 18, fontWeight: '500', color: GREY[700] },
});
