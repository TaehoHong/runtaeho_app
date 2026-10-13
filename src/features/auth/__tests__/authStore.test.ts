import { useAuthStore } from '~/features/auth/stores/authStore';
import { resetAllStores } from '~/test-utils/resetState';
import { tokenStorage } from '~/utils/storage';

jest.mock('~/utils/storage', () => ({
  tokenStorage: {
    loadTokens: jest.fn(),
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
  },
}));

const mockTokenStorage = tokenStorage as jest.Mocked<typeof tokenStorage>;

describe('authStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAllStores();
    useAuthStore.setState({ tokensRevoked: false });
  });

  it('AUTH-STORE-001 handles token and login state transitions', () => {
    const authState = useAuthStore.getState();

    authState.setAccessToken('access-token');
    authState.setRefreshToken('refresh-token');
    authState.setLoggedIn(true);
    authState.setLoading(true);

    expect(useAuthStore.getState().isLoggedIn).toBe(true);
    expect(useAuthStore.getState().accessToken).toBe('access-token');
    expect(useAuthStore.getState().refreshToken).toBe('refresh-token');
    expect(useAuthStore.getState().isLoading).toBe(true);

    authState.logout();

    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('AUTH-STORE-002 initializes token state from secure storage', async () => {
    mockTokenStorage.loadTokens.mockResolvedValue({
      accessToken: 'stored-access',
      refreshToken: 'stored-refresh',
    });

    await useAuthStore.getState().initializeTokens();

    expect(useAuthStore.getState().accessToken).toBe('stored-access');
    expect(useAuthStore.getState().refreshToken).toBe('stored-refresh');
  });

  it('AUTH-STORE-003 falls back to secure storage when access token is not in memory', async () => {
    mockTokenStorage.getAccessToken.mockResolvedValue('fallback-access');

    const accessToken = await useAuthStore.getState().getAccessTokenSafe();

    expect(accessToken).toBe('fallback-access');
    expect(useAuthStore.getState().accessToken).toBe('fallback-access');
  });

  it('falls back to secure storage when refresh token is not in memory', async () => {
    mockTokenStorage.getRefreshToken.mockResolvedValue('fallback-refresh');

    const refreshToken = await useAuthStore.getState().getRefreshTokenSafe();

    expect(refreshToken).toBe('fallback-refresh');
    expect(useAuthStore.getState().refreshToken).toBe('fallback-refresh');
  });
});


it('does not restore a token read begun before logout', async () => {
  let resolve!: (token: string) => void;
  useAuthStore.setState({ accessToken: null, tokensRevoked: false });
  mockTokenStorage.getAccessToken.mockReturnValue(new Promise<string>(yes => { resolve = yes; }));
  const read = useAuthStore.getState().getAccessTokenSafe();
  useAuthStore.getState().logout();
  resolve('old-access');
  await expect(read).resolves.toBeNull();
  expect(useAuthStore.getState().accessToken).toBeNull();
});

it('does not revive deleted credentials even when disk deletion previously failed', async () => {
  useAuthStore.getState().logout();
  mockTokenStorage.getAccessToken.mockResolvedValue('undeleted-token');
  await expect(useAuthStore.getState().getAccessTokenSafe()).resolves.toBeNull();
});
