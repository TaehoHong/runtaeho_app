import { userService } from '~/features/user/services/userService';
import { apiClient } from '~/services/api/client';
import { API_ENDPOINTS } from '~/services/api/config';
import { AuthProviderType } from '~/features/auth/models';

jest.mock('~/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
}));

class MockFormData {
  entries: Array<[string, unknown]> = [];

  append(key: string, value: unknown) {
    this.entries.push([key, value]);
  }
}

describe('userService.updateProfile', () => {
  const originalFormData = global.FormData;
  const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
  const sampleUserDataDto = {
    id: 1,
    name: 'Runner',
    profileImageUrl: '/profile-images/runner.png',
    authorityType: 'ROLE_USER',
    totalPoint: 100,
    userAccounts: [
      { id: 11, email: 'runner@test.com', accountType: AuthProviderType.GOOGLE },
    ],
    avatarId: 1,
    haveRunningRecord: true,
    equippedItems: [],
  };

  beforeEach(() => {
    (global as unknown as { FormData: typeof FormData }).FormData =
      MockFormData as unknown as typeof FormData;
    mockApiClient.patch.mockResolvedValue({
      data: { id: 1, nickname: 'Runner' },
    });
    mockApiClient.get.mockResolvedValue({ data: sampleUserDataDto as any });
    mockApiClient.post.mockResolvedValue({ data: undefined as any });
    mockApiClient.delete.mockResolvedValue({ data: undefined as any });
  });

  afterAll(() => {
    (global as unknown as { FormData: typeof FormData }).FormData = originalFormData;
  });

  it('USER-SVC-001 builds multipart form data for nickname and profile image', async () => {
    await userService.updateProfile({
      nickname: 'Runner',
      profileImage: {
        uri: 'file://avatar.jpg',
        type: 'image/jpeg',
        name: 'avatar.jpg',
      },
    });

    expect(mockApiClient.patch).toHaveBeenCalledTimes(1);

    const requestBody = mockApiClient.patch.mock.calls[0]?.[1] as MockFormData;
    const nicknameEntry = requestBody.entries.find(([key]) => key === 'nickname');
    const imageEntry = requestBody.entries.find(([key]) => key === 'profileImage');

    expect(nicknameEntry?.[1]).toBe('Runner');
    expect(imageEntry?.[1]).toMatchObject({
      uri: 'file://avatar.jpg',
      type: 'image/jpeg',
      name: 'avatar.jpg',
    });
  });

  it('USER-SVC-002 builds multipart form data with nickname only when image is omitted', async () => {
    await userService.updateProfile({ nickname: 'OnlyName' });

    const requestBody = mockApiClient.patch.mock.calls[0]?.[1] as MockFormData;
    expect(requestBody.entries).toContainEqual(['nickname', 'OnlyName']);
    expect(requestBody.entries.find(([key]) => key === 'profileImage')).toBeUndefined();
  });

  it('USER-SVC-003 propagates profile update error from API', async () => {
    mockApiClient.patch.mockRejectedValueOnce(new Error('profile-failed'));

    await expect(userService.updateProfile({ nickname: 'Runner' })).rejects.toThrow(
      'profile-failed'
    );
    expect(mockApiClient.patch).toHaveBeenCalledTimes(1);
  });

  it('fetches user by id and user data endpoints', async () => {
    mockApiClient.get
      .mockResolvedValueOnce({ data: { id: 9, nickname: 'User9' } as any })
      .mockResolvedValueOnce({ data: sampleUserDataDto as any });

    const byId = await userService.getUserById(9);
    const userData = await userService.getUserData();

    expect(byId.id).toBe(9);
    expect(userData.name).toBe('Runner');
    expect(mockApiClient.get).toHaveBeenNthCalledWith(1, `${API_ENDPOINTS.USER.BASE}/9`);
    expect(mockApiClient.get).toHaveBeenNthCalledWith(2, API_ENDPOINTS.USER.ME);
  });

  it('transforms current user from UserDataDto', async () => {
    mockApiClient.get.mockResolvedValueOnce({ data: sampleUserDataDto as any });

    const user = await userService.getCurrentUser();

    expect(user.nickname).toBe('Runner');
    expect(user.userAccounts.length).toBeGreaterThan(0);
    expect(user.userAccounts.some((account) => account.provider === AuthProviderType.GOOGLE)).toBe(
      true
    );
  });

  it('calls account connect/disconnect and delete endpoints', async () => {
    await userService.connectAccount(1, 'GOOGLE', 'oauth-code');
    await userService.disconnectAccount(33);
    await userService.deleteUser();
    await userService.withdraw();

    expect(mockApiClient.post).toHaveBeenCalledWith(
      API_ENDPOINTS.USER.ACCOUNTS(1),
      expect.objectContaining({
        provider: 'GOOGLE',
        code: 'oauth-code',
      })
    );
    expect(mockApiClient.delete).toHaveBeenCalledWith(API_ENDPOINTS.USER.ACCOUNT_DISCONNECT(33));
    expect(mockApiClient.delete).toHaveBeenCalledWith(API_ENDPOINTS.USER.BASE);
    expect(mockApiClient.delete).toHaveBeenCalledWith(API_ENDPOINTS.USER.ME);
  });
});
