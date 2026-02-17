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

    const result = await service.performSilentRefresh();

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

    await expect(service.performSilentRefresh()).rejects.toThrow('RefreshTokenExpired');
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });
});
