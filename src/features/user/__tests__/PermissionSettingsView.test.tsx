import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import { PermissionSettingsView } from '~/features/user/views/PermissionSettingsView';
import { renderWithProviders } from '~/test-utils/renderWithProviders';

const mockCheckPermissions = jest.fn();

jest.mock('~/services/PermissionManager', () => ({
  permissionManager: {
    checkRequiredPermissions: () => mockCheckPermissions(),
  },
}));
jest.mock('~/features/healthImport/services/healthImportService', () => ({
  healthImportService: {
    getConfiguration: jest.fn().mockResolvedValue({ healthImportEnabled: false }),
  },
}));
jest.mock('~/features/healthImport/native/HealthImportBridge', () => ({
  healthImportBridge: {
    isAvailable: jest.fn().mockResolvedValue(false),
  },
}));

describe('PermissionSettingsView', () => {
  it('shows location as enabled with only while-in-use permission', async () => {
    mockCheckPermissions.mockResolvedValue({
      location: true, motion: true, canStartRunning: true, hasAllPermissions: true,
    });
    renderWithProviders(<PermissionSettingsView />);
    await waitFor(() => expect(screen.getByText('활성화')).toBeTruthy());
    expect(screen.queryByText('비활성화')).toBeNull();
    expect(screen.getByText('Apple 건강 연동')).toBeTruthy();
    expect(screen.getByText('Apple 건강에 저장된 러닝 기록을 가져와 기록과 통계에 표시합니다.')).toBeTruthy();
  });
});
