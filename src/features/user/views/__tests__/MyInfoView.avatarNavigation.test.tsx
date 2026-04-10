import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { MyInfoView } from '~/features/user/views/MyInfoView';
import { routerMock } from '~/test-utils/mocks/native';
import { renderWithProviders } from '~/test-utils/renderWithProviders';

jest.mock('~/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      nickname: '러너',
      profileImageURL: null,
    },
    totalPoint: 1200,
  }),
}));

jest.mock('~/features/point/views', () => ({
  PointHistoryView: () => null,
}));

jest.mock('~/features/shoes/views', () => ({
  ShoesListView: () => null,
}));

jest.mock('~/shared/components/ui', () => ({
  Icon: () => null,
}));

describe('MyInfoView avatar navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the avatar editor through the user avatar route instead of an RN modal', () => {
    renderWithProviders(<MyInfoView />);

    fireEvent.press(screen.getByText('아바타'));

    expect(routerMock.push).toHaveBeenCalledTimes(1);
    expect(routerMock.push).toHaveBeenCalledWith('/user/avatar');
  });
});
