import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Platform, StyleSheet, Text } from 'react-native';
import { AvatarHeader } from '~/features/avatar/views/components/AvatarHeader';
import { PointInfoBar } from '~/features/running/views/components/point-info-bar';
import { StatisticsSummaryCard } from '~/features/statistics/views/components/StatisticsSummaryCard';
import { getNumberFontStyle } from '../fontUtils';

jest.mock('~/shared/components/ui', () => ({ Icon: () => null }));

const originalPlatformOS = Platform.OS;

afterEach(() => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatformOS });
});

describe('numeric screens', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
  });

  it('uses the bundled extra-bold face for summary numbers at their existing size', () => {
    render(<StatisticsSummaryCard runCount={7} totalDistance={12300} averagePace={6} />);

    expect(screen.getByText('12.30')).toHaveStyle({
      fontFamily: 'Pretendard-ExtraBold', fontSize: 52, lineHeight: 60, fontWeight: '800',
    });
    expect(screen.getByText('7회')).toHaveStyle({
      fontFamily: 'Pretendard-SemiBold', fontSize: 14, lineHeight: 20, fontWeight: '600',
    });
    expect(StyleSheet.flatten(screen.getByText('총 거리').props.style)).not.toHaveProperty('fontFamily');
  });

  it('uses bold for completion points without changing the existing tracking', () => {
    render(<PointInfoBar earnedPoints={124} totalPoints={12345} />);

    expect(screen.getByText('+124 P')).toHaveStyle({
      fontFamily: 'Pretendard-Bold', fontSize: 13, lineHeight: 14, fontWeight: '700', letterSpacing: -0.3,
    });
    expect(screen.getByText('12,345 P')).toHaveStyle({
      fontFamily: 'Pretendard-Bold', fontSize: 13, lineHeight: 14, fontWeight: '700', letterSpacing: -0.3,
    });
  });

  it('uses semibold for avatar points while preserving the title font', () => {
    render(<AvatarHeader points={12345} onClose={jest.fn()} />);

    expect(screen.getByText('12,345')).toHaveStyle({
      fontFamily: 'Pretendard-SemiBold', fontSize: 14, fontWeight: '600',
    });
    expect(StyleSheet.flatten(screen.getByText('아바타').props.style)).not.toHaveProperty('fontFamily');
  });
});

it.each([
  ['400', 'Pretendard-Regular'],
  ['600', 'Pretendard-SemiBold'],
  ['800', 'Pretendard-ExtraBold'],
] as const)('uses the registered %s face for Android numbers without tracking compensation', (weight, family) => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  render(<Text testID="number" style={[{ fontSize: 13, lineHeight: 14, letterSpacing: -0.3 }, getNumberFontStyle(weight)]}>123</Text>);

  expect(screen.getByTestId('number')).toHaveStyle({
    fontFamily: family, fontWeight: 'normal', fontSize: 13, lineHeight: 14, letterSpacing: -0.3,
  });
});
