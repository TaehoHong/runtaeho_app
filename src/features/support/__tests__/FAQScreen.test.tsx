import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import FAQScreen from '@/user/faq';
import { renderWithProviders } from '~/test-utils/renderWithProviders';
import { routerMock } from '~/test-utils/mocks/native';

describe('FAQScreen', () => {
  it.each(['ios', 'android'] as const)('shows current platform instructions on %s and can expand the other platform', platform => {
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: platform });
    try {
      renderWithProviders(<FAQScreen />);

      expect(screen.getByText('운동했는데 기록이 안 들어와요.')).toBeOnTheScreen();
      expect(screen.getByText('러닝 기록 가져오기를 켜주세요.')).toBeOnTheScreen();
      const android = 'Health Connect > 앱 권한 > 달려라 태호군';
      const ios = '건강 앱 > 공유 > 앱 > 달려라 태호군';
      const other = platform === 'ios' ? android : ios;
      const toggleLabel = platform === 'ios' ? 'Android 안내' : 'iOS 안내';
      expect(screen.getByText(platform === 'ios' ? ios : android)).toBeOnTheScreen();
      expect(screen.queryByText(other)).toBeNull();
      fireEvent.press(screen.getByRole('button', { name: toggleLabel }));
      expect(screen.getByText(other)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: toggleLabel })).toHaveAccessibilityState({ expanded: true });
      fireEvent.press(screen.getByRole('button', { name: toggleLabel }));
      expect(screen.queryByText(other)).toBeNull();
      expect(screen.getByText('Garmin Connect 앱을 열어 동기화가 완료됐는지 확인해주세요.')).toBeOnTheScreen();

      fireEvent.press(screen.getByText('권한 설정으로 이동'));
      fireEvent.press(screen.getByText('1:1 문의하기'));

      expect(routerMock.push).toHaveBeenCalledWith('/user/permission-settings');
      expect(routerMock.push).toHaveBeenCalledWith('/user/inquiry');
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    }
  });
});
