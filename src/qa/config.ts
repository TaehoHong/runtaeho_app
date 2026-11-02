import Constants from 'expo-constants';

// Use the selected app-profile manifest; Metro's virtual env can retain dotenv values.
export const isUiQaEnabled = (dev: boolean, environment?: string, flag?: string): boolean =>
  dev && environment === 'local' && flag === '1';

export const UI_QA_ENABLED = isUiQaEnabled(
  __DEV__, Constants.expoConfig?.extra?.env, process.env.EXPO_PUBLIC_UI_QA
);

if (__DEV__ && process.env.EXPO_PUBLIC_UI_QA === '1') {
  console.info(`[UI_QA] gate=${UI_QA_ENABLED}; profile=${Constants.expoConfig?.extra?.env}`);
}

export const QA_TOKEN_PREFIX = 'ui-qa.';

export function assertQaTokenIsLocal(enabled: boolean, token: string | null | undefined): void {
  if (!enabled && token?.startsWith(QA_TOKEN_PREFIX)) {
    throw new Error('Local UI QA session: log out before using the normal API.');
  }
}
