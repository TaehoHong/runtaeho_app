import { Alert } from 'react-native';
import { t } from '~/i18n';
import { getRunningRejectionMessage, RunningValidationError } from '~/features/running/services/runningRejection';
import type { HealthImportSyncResult } from '../types';
import { HealthImportPartialSyncError } from './healthImportService';

export const showHealthImportRejections = (result: HealthImportSyncResult | HealthImportPartialSyncError) => {
  const summary = result instanceof HealthImportPartialSyncError ? result.partialResult : result;
  if (!summary.rejectedCount) return;
  const reasons = (summary.rejectionCodes ?? []).map((code) => getRunningRejectionMessage(new RunningValidationError(code)));
  Alert.alert(t('일부 Health 기록을 가져오지 못했어요'), [
    t('가져오지 못한 기록: {{count}}개', { count: summary.rejectedCount }),
    ...reasons,
  ].join('\n'));
};
