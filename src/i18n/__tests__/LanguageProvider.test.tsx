import React from 'react';
import { Alert, Text } from 'react-native';
import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react-native';
import { SettingsView } from '~/features/user/views/SettingsView';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '~/test-utils/queryClient';
import { renderWithProviders } from '~/test-utils/renderWithProviders';
import { createUser } from '~/features/user/models/User';
import { useUserStore } from '~/stores/user/userStore';
import { useAuthStore } from '~/features/auth/stores/authStore';
import { useLanguageSettings } from '~/features/user/hooks/useLanguageSettings';
import { userConfigurationService } from '~/features/user/services/userConfigurationService';
import type { UserConfiguration } from '~/features/user/models/UserConfiguration';
import { LanguageProvider } from '../LanguageProvider';
import { i18n, t, useAppLanguage } from '..';

let mockLocales = [{ languageCode: 'ja' }];
jest.mock('expo-localization', () => ({ useLocales: () => mockLocales }));
jest.mock('~/features/user/services/userConfigurationService', () => ({
  userConfigurationService: { get: jest.fn(), update: jest.fn() },
}));
jest.mock('~/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ logout: jest.fn() }) }));
const service = jest.mocked(userConfigurationService);
const configuration: UserConfiguration = {
  userId: 7, language: 'ja', healthImportEnabled: true, healthImportLastSyncedTimestamp: null,
};
const signIn = (id = 7) => {
  useUserStore.setState({ currentUser: createUser({ id, nickname: 'Runner' }) });
  useUserStore.getState().updateUserPreferences({ language: 'system' });
  useAuthStore.setState({ isLoggedIn: true, accessToken: `test-session-${id}` });
};
const Label = () => {
  useAppLanguage();
  return <Text>{t('설정')}</Text>;
};

beforeEach(async () => {
  useUserStore.getState().logout();
  useAuthStore.getState().logout();
  mockLocales = [{ languageCode: 'ja' }];
  service.get.mockReset().mockResolvedValue(configuration);
  service.update.mockReset().mockResolvedValue(configuration);
  await i18n.changeLanguage('ko');
});

it('uses system Japanese before login without requesting private settings', async () => {
  renderWithProviders(<LanguageProvider><Label /></LanguageProvider>);
  expect(await screen.findByText('設定')).toBeTruthy();
  expect(service.get).not.toHaveBeenCalled();
});

it('restores account Japanese, then returns to system Korean on logout', async () => {
  mockLocales = [{ languageCode: 'ko' }];
  signIn();
  renderWithProviders(<LanguageProvider><Label /></LanguageProvider>);
  expect(await screen.findByText('設定')).toBeTruthy();
  act(() => { useAuthStore.getState().logout(); useUserStore.getState().logout(); });
  expect(await screen.findByText('설정')).toBeTruthy();
  expect(service.update).not.toHaveBeenCalled();
});

it('ignores the previous account response after account switching', async () => {
  mockLocales = [{ languageCode: 'ko' }];
  signIn();
  let resolveOld!: (value: UserConfiguration) => void;
  service.get.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }));
  service.get.mockResolvedValue({ ...configuration, userId: 8, language: 'ko' });
  renderWithProviders(<LanguageProvider><Label /></LanguageProvider>);
  await waitFor(() => expect(service.get).toHaveBeenCalledTimes(1));
  act(() => { signIn(8); });
  await waitFor(() => expect(service.get).toHaveBeenCalledTimes(2));
  await act(async () => { resolveOld(configuration); });
  expect(screen.getByText('설정')).toBeTruthy();
  await waitFor(() => expect(useUserStore.getState().userPreferences.language).toBe('ko'));
});

const renderSettings = () => {
  const client = createTestQueryClient();
  return renderHook(() => useLanguageSettings(), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
};

it('migrates the old hardcoded Korean default to system without resetting other preferences', async () => {
  const migrate = useUserStore.persist.getOptions().migrate;
  expect(await migrate?.({ userPreferences: { language: 'ko', soundEnabled: false } }, 0))
    .toMatchObject({ userPreferences: { language: 'system', soundEnabled: false } });
});

it('does not change the preference until the server confirms it', async () => {
  signIn();
  let resolveSave!: (value: UserConfiguration) => void;
  service.update.mockReturnValueOnce(new Promise((resolve) => { resolveSave = resolve; }));
  const { result } = renderSettings();
  let saving!: Promise<UserConfiguration>;
  act(() => { saving = result.current.mutateAsync('ja'); });
  await waitFor(() => expect(service.update).toHaveBeenCalledWith({ language: 'ja' }, expect.any(AbortSignal)));
  expect(useUserStore.getState().userPreferences.language).toBe('system');
  await act(async () => { resolveSave(configuration); await saving; });
  expect(useUserStore.getState().userPreferences.language).toBe('ja');
});

it('keeps the existing preference when saving fails and does not retry automatically', async () => {
  signIn();
  service.update.mockRejectedValueOnce(new Error('offline'));
  const { result } = renderSettings();
  await act(async () => { await expect(result.current.mutateAsync('ja')).rejects.toThrow('offline'); });
  expect(useUserStore.getState().userPreferences.language).toBe('system');
  expect(service.update).toHaveBeenCalledTimes(1);
});

it('does not restore the old account preference when a save finishes after logout', async () => {
  signIn();
  let resolveSave!: (value: UserConfiguration) => void;
  service.update.mockReturnValueOnce(new Promise((resolve) => { resolveSave = resolve; }));
  const { result } = renderSettings();
  let saving!: Promise<UserConfiguration>;
  act(() => { saving = result.current.mutateAsync('ja'); });
  await waitFor(() => expect(service.update).toHaveBeenCalledTimes(1));
  act(() => { useAuthStore.getState().logout(); useUserStore.getState().logout(); });
  expect(service.update.mock.calls[0]?.[1]?.aborted).toBe(true);
  await act(async () => { resolveSave(configuration); await saving; });
  expect(useUserStore.getState().userPreferences.language).toBe('system');
});

it('applies a confirmed preference after a token refresh within the same account', async () => {
  signIn();
  let resolveSave!: (value: UserConfiguration) => void;
  service.update.mockReturnValueOnce(new Promise((resolve) => { resolveSave = resolve; }));
  const { result } = renderSettings();
  let saving!: Promise<UserConfiguration>;
  act(() => { saving = result.current.mutateAsync('ja'); });
  await waitFor(() => expect(service.update).toHaveBeenCalledTimes(1));
  act(() => { useAuthStore.getState().setAccessToken('renewed-test-session'); });
  await act(async () => { resolveSave(configuration); await saving; });
  expect(useUserStore.getState().userPreferences.language).toBe('ja');
});

it('switches the settings screen to Japanese after saving the selected radio option', async () => {
  signIn();
  service.get.mockResolvedValue({ ...configuration, language: 'ko' });
  renderWithProviders(<LanguageProvider><SettingsView /></LanguageProvider>);
  await waitFor(() => expect(useUserStore.getState().userPreferences.language).toBe('ko'));
  fireEvent.press(screen.getByTestId('settings-language-menu'));
  fireEvent.press(screen.getByTestId('settings-language-ja'));
  expect(await screen.findByText('設定')).toBeTruthy();
  expect(screen.getByText('アクセス権限')).toBeTruthy();
  expect(service.update).toHaveBeenCalledWith({ language: 'ja' }, expect.any(AbortSignal));
});

it('shows a retry message and keeps the settings screen Korean when saving fails', async () => {
  signIn();
  service.get.mockResolvedValue({ ...configuration, language: 'ko' });
  service.update.mockRejectedValueOnce(new Error('offline'));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  renderWithProviders(<LanguageProvider><SettingsView /></LanguageProvider>);
  await waitFor(() => expect(useUserStore.getState().userPreferences.language).toBe('ko'));
  fireEvent.press(screen.getByTestId('settings-language-menu'));
  fireEvent.press(screen.getByTestId('settings-language-ja'));
  await waitFor(() => expect(alert).toHaveBeenCalledWith(
    '언어 저장 실패', '언어 설정을 저장하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.'
  ));
  expect(screen.getByText('설정')).toBeTruthy();
  expect(useUserStore.getState().userPreferences.language).toBe('ko');
  alert.mockRestore();
});
