import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import FAQScreen from '@/user/faq';
import { renderWithProviders } from '~/test-utils/renderWithProviders';
import { routerMock } from '~/test-utils/mocks/native';

describe('FAQScreen', () => {
  it('shows the workout import FAQ and links to permission settings and inquiry', () => {
    renderWithProviders(<FAQScreen />);

    expect(screen.getByText('운동했는데 기록이 안 들어와요.')).toBeOnTheScreen();
    expect(screen.getByText('앱 사용 설정을 켜주세요.')).toBeOnTheScreen();
    expect(screen.getByText('Health Connect > 앱 권한 > 달려라 태호군')).toBeOnTheScreen();
    expect(screen.getByText('건강 앱 > 공유 > 앱 > 달려라 태호군')).toBeOnTheScreen();
    expect(screen.getByText('Garmin Connect 앱을 열어 동기화가 완료됐는지 확인해주세요.')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('권한 설정으로 이동'));
    fireEvent.press(screen.getByText('1:1 문의하기'));

    expect(routerMock.push).toHaveBeenCalledWith('/user/permission-settings');
    expect(routerMock.push).toHaveBeenCalledWith('/user/inquiry');
  });
});
