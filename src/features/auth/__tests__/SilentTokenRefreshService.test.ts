import {
  SilentTokenRefreshService,
  type TokenPair,
} from '~/features/auth/services/SilentTokenRefreshService';

describe('SilentTokenRefreshService', () => {
  beforeEach(() => {
    SilentTokenRefreshService.resetForTest();
  });

  it('retries and returns tokens when refresh eventually succeeds', async () => {
    const service = SilentTokenRefreshService.getInstance();
    const internal = service as unknown as {
      refreshTokens: () => Promise<TokenPair>;
      delay: (ms: number) => Promise<void>;
    };

    const refreshSpy = jest
      .spyOn(internal, 'refreshTokens')
      .mockRejectedValueOnce(new Error('TemporaryNetworkError'))
      .mockResolvedValueOnce({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

    jest.spyOn(internal, 'delay').mockResolvedValue();

    const result = await service.performSilentRefresh('stored-refresh');

    expect(result).toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
    expect(refreshSpy).toHaveBeenCalledTimes(2);
  });

  it('throws immediately on RefreshTokenExpired without extra retries', async () => {
    const service = SilentTokenRefreshService.getInstance();
    const internal = service as unknown as {
      refreshTokens: () => Promise<TokenPair>;
      delay: (ms: number) => Promise<void>;
    };

    const refreshSpy = jest
      .spyOn(internal, 'refreshTokens')
      .mockRejectedValue(new Error('RefreshTokenExpired'));

    jest.spyOn(internal, 'delay').mockResolvedValue();

    await expect(service.performSilentRefresh('stored-refresh')).rejects.toThrow('RefreshTokenExpired');
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });
});


describe('refresh HTTP failure classification', () => {
  beforeEach(() => { SilentTokenRefreshService.resetForTest(); });
  afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

  it('rejects a refresh endpoint 403 immediately', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 403 } as Response);
    await expect(SilentTokenRefreshService.getInstance().performSilentRefresh('refresh-a')).rejects.toThrow('RefreshTokenExpired');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a 503 with the original credential and reports a transient failure', async () => {
    jest.useFakeTimers();
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 503 } as Response);
    const result = SilentTokenRefreshService.getInstance().performSilentRefresh('refresh-a');
    const rejection = expect(result).rejects.toThrow('MaxRetryExceeded');
    await jest.runAllTimersAsync();
    await rejection;
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(3, expect.any(String), expect.objectContaining({
      headers: { 'Content-Type': 'application/json', Refresh: 'Bearer refresh-a' },
    }));
  });
});
