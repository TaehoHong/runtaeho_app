import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { transformSync } from '@babel/core';
import { i18n, t } from '~/i18n';

jest.mock('~/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { nickname: 'QA', profileImageURL: 'https://example.invalid/avatar' }, totalPoint: 1 }),
}));
jest.mock('~/features/ads/AdBanner', () => ({ AdBanner: () => null }));
jest.mock('~/features/point/views', () => ({ PointHistoryView: () => null }));
jest.mock('~/features/shoes/views', () => ({ ShoesListView: () => null }));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('~/shared/components/ui', () => ({ Icon: () => null }));

it('updates the compiler-transformed MyInfo screen when the language changes', async () => {
  const filename = resolve(process.cwd(), 'src/features/user/views/MyInfoView.tsx');
  const source = readFileSync(filename, 'utf8');
  const compiled = transformSync(source, {
    filename, babelrc: false, configFile: false,
    parserOpts: { plugins: ['typescript', 'jsx'] },
    plugins: ['babel-plugin-react-compiler'],
  })!.code!;
  expect(compiled).toContain('react/compiler-runtime');
  const executable = transformSync(compiled, {
    filename, babelrc: false, configFile: false, presets: ['babel-preset-expo'],
  })!.code!;
  const module = { exports: {} as { MyInfoView: React.ComponentType } };
  new Function('require', 'module', 'exports', executable)(require, module, module.exports);
  await act(async () => { await i18n.changeLanguage('ko'); });
  const view = render(React.createElement(module.exports.MyInfoView));
  try {
    expect(screen.getByText('알림함')).toBeTruthy();
    await act(async () => { await i18n.changeLanguage('ja'); });
    expect(i18n.resolvedLanguage).toBe('ja');
    expect(t('알림함')).toBe('通知一覧');
    await waitFor(() => expect(screen.getByText('通知一覧')).toBeTruthy());
    await act(async () => { await i18n.changeLanguage('ko'); });
    await waitFor(() => expect(screen.getByText('알림함')).toBeTruthy());
  } finally {
    view.unmount();
    await act(async () => { await i18n.changeLanguage('ko'); });
  }
});
