import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { transformSync } from '@babel/core';
import { i18n, t } from '~/i18n';
import type { StatisticsSummaryCard } from '../StatisticsSummaryCard';

it('updates the compiled distance label when language changes with unchanged statistics', async () => {
  const filename = resolve(process.cwd(), 'src/features/statistics/views/components/StatisticsSummaryCard.tsx');
  const compiled = transformSync(readFileSync(filename, 'utf8'), {
    filename, babelrc: false, configFile: false,
    parserOpts: { plugins: ['typescript', 'jsx'] },
    plugins: ['babel-plugin-react-compiler'],
  })!.code!;
  expect(compiled).toContain('react/compiler-runtime');
  const executable = transformSync(compiled, {
    filename, babelrc: false, configFile: false, presets: ['babel-preset-expo'],
  })!.code!;
  const module = { exports: {} as { StatisticsSummaryCard: React.ComponentType<React.ComponentProps<typeof StatisticsSummaryCard>> } };
  const sourceRequire = (id: string) => require(id.startsWith('.') ? resolve(dirname(filename), id) : id);
  new Function('require', 'module', 'exports', executable)(sourceRequire, module, module.exports);
  await act(async () => { await i18n.changeLanguage('ja'); });
  const view = render(React.createElement(module.exports.StatisticsSummaryCard, {
    runCount: 0, totalDistance: 0, averagePace: 0,
  }));
  try {
    expect(screen.getByText('総距離')).toBeOnTheScreen();
    await act(async () => { await i18n.changeLanguage('ko'); });
    expect(t('총 거리')).toBe('총 거리');
    expect(screen.getByText('러닝')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByText('총 거리')).toBeOnTheScreen());
    await act(async () => { await i18n.changeLanguage('ja'); });
    await waitFor(() => expect(screen.getByText('総距離')).toBeOnTheScreen());
  } finally {
    view.unmount();
    await act(async () => { await i18n.changeLanguage('ko'); });
  }
});
