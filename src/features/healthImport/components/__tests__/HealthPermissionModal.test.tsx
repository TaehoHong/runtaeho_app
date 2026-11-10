import React from 'react';
import { Modal } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { HealthPermissionModal } from '../HealthPermissionModal';
import { renderWithProviders } from '~/test-utils/renderWithProviders';

describe('HealthPermissionModal', () => {
  it('explains Apple Health imports and continues to the system permission request', () => {
    const requestPermission = jest.fn();
    const props = { visible: true, onClose: jest.fn(), onRequestPermission: requestPermission };
    renderWithProviders(<HealthPermissionModal {...props} />);

    expect(screen.getByText('Apple 건강 연동')).toBeTruthy();
    expect(screen.getByText(/Apple 건강에 저장된 러닝 기록을 가져와 기록과 통계에 표시합니다\./)).toBeTruthy();
    expect(screen.queryByText('나중에')).toBeNull();
    fireEvent.press(screen.getByText('계속'));
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it('does not let a native close request bypass the system permission request', () => {
    const close = jest.fn();
    const requestPermission = jest.fn();
    const props = { visible: true, onClose: close, onRequestPermission: requestPermission };
    renderWithProviders(<HealthPermissionModal {...props} />);

    fireEvent(screen.UNSAFE_getByType(Modal), 'requestClose');

    expect(close).not.toHaveBeenCalled();
    expect(requestPermission).not.toHaveBeenCalled();
    expect(screen.getByText('계속')).toBeTruthy();
  });
});
