import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import AvatarPage from '../../../../app/user/avatar';
import { routerMock } from '~/test-utils/mocks/native';
import { renderWithProviders } from '~/test-utils/renderWithProviders';

jest.mock('~/features/avatar/views', () => {
  const React = require('react');
  const { TouchableOpacity, View } = require('react-native');

  return {
    AvatarView: ({ onClose }: { onClose: () => void }) =>
      React.createElement(
        TouchableOpacity,
        { testID: 'avatar-route-close', onPress: onClose },
        React.createElement(View, { testID: 'avatar-route-screen' })
      ),
  };
});

describe('AvatarPage route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates back when the avatar screen requests close', () => {
    renderWithProviders(<AvatarPage />);

    expect(screen.getByTestId('avatar-route-screen')).toBeTruthy();

    fireEvent.press(screen.getByTestId('avatar-route-close'));

    expect(routerMock.back).toHaveBeenCalledTimes(1);
  });
});
