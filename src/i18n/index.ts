import { createInstance } from 'i18next';
import { useCallback } from 'react';
import { initReactI18next, useTranslation } from 'react-i18next';
import ko from './locales/ko.json';
import ja from './locales/ja.json';
import type { AppLanguage } from './language';

export const i18n = createInstance();
void i18n.use(initReactI18next).init({
  resources: { ko: { translation: ko }, ja: { translation: ja } },
  lng: 'ko',
  fallbackLng: 'ko',
  supportedLngs: ['ko', 'ja'],
  keySeparator: false,
  nsSeparator: false,
  initImmediate: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export const t = (key: string, values?: Record<string, unknown>): string =>
  i18n.t(key, { ...values, defaultValue: key });

export const useAppLanguage = (): AppLanguage => {
  useTranslation(undefined, { i18n });
  return i18n.resolvedLanguage === 'ja' ? 'ja' : 'ko';
};

export const useAppTranslation = (): typeof t => {
  const { t: translate } = useTranslation(undefined, { i18n });
  return useCallback((key: string, values?: Record<string, unknown>) =>
    translate(key, { ...values, defaultValue: key }), [translate]);
};
