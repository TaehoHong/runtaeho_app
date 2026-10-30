import axios, { AxiosError, AxiosHeaders, CanceledError } from 'axios';
import { addBreadcrumb, reportError } from '~/config/sentry';
import { httpRequestLogging, httpResponseLogging } from '../interceptors';

jest.mock('~/config/sentry', () => ({ addBreadcrumb: jest.fn(), reportError: jest.fn() }));
jest.mock('../config', () => ({ API_CONFIG: { LOGGING: { ENABLED: true, LOG_REQUEST: true, LOG_RESPONSE: true, LOG_ERROR: true } } }));

describe('API diagnostics privacy', () => {
  afterEach(() => jest.restoreAllMocks());

  it('preserves successful payloads without recording headers, bodies or URL identifiers', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const client = axios.create({ adapter: async (config) => ({
      config, status: 200, statusText: 'OK', headers: new AxiosHeaders(), data: { token: 'private-response' },
    }) });
    httpRequestLogging(client);
    httpResponseLogging(client);
    const response = await client.post('/users/private-user?token=private-query', { password: 'private-body' }, {
      headers: { Authorization: 'Bearer private-header' }, params: { email: 'private-email' },
    });
    expect(response.data).toEqual({ token: 'private-response' });
    expect(log).toHaveBeenCalled();
    expect(JSON.stringify([log.mock.calls, jest.mocked(addBreadcrumb).mock.calls])).not.toContain('private-');
  });

  it('reports only safe error metadata while rejecting the original AxiosError', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    let original: AxiosError | undefined;
    const client = axios.create({ adapter: async (config) => {
      original = new AxiosError('private-error', 'ERR_BAD_RESPONSE', config, undefined, {
        config, status: 500, statusText: 'private-status', headers: new AxiosHeaders(), data: { token: 'private-response' },
      });
      throw original;
    } });
    httpRequestLogging(client);
    httpResponseLogging(client);
    await expect(client.get('/running/private-user?token=private-query', { headers: { Authorization: 'private-token' } })).rejects.toMatchObject({ message: 'private-error' });
    const reported = jest.mocked(reportError).mock.calls[0]?.[0];
    const context = jest.mocked(reportError).mock.calls[0]?.[1];
    expect(reported).not.toBe(original);
    expect(reported?.message).toBe('API GET running failed (500)');
    expect(context).toEqual({ type: 'api-error', operation: 'GET running', method: 'get', status: 500 });
    expect(JSON.stringify([reported, context, log.mock.calls, jest.mocked(addBreadcrumb).mock.calls])).not.toContain('private-');
  });

  it.each([
    new CanceledError('cancelled'),
    new AxiosError('Network Error', 'ERR_NETWORK'),
    Object.assign(new Error('superseded'), { name: 'SessionSupersededError' }),
  ])('does not report expected cancellation, session replacement or disconnection: $name', async error => {
    const client = axios.create({ adapter: async () => { throw error; } });
    httpResponseLogging(client);
    await expect(client.get('/running')).rejects.toBe(error);
    expect(reportError).not.toHaveBeenCalled();
  });

  it('does not report input validation but still reports unexpected permission failures', async () => {
    const client = axios.create({ adapter: async config => {
      throw new AxiosError('HTTP failure', 'ERR_BAD_REQUEST', config, undefined, {
        config, status: config.url === '/validation' ? 400 : 403, statusText: '', headers: new AxiosHeaders(), data: {},
      });
    } });
    httpResponseLogging(client);
    await expect(client.get('/validation')).rejects.toMatchObject({ response: { status: 400 } });
    expect(reportError).not.toHaveBeenCalled();
    await expect(client.get('/permission')).rejects.toMatchObject({ response: { status: 403 } });
    expect(reportError).toHaveBeenCalledTimes(1);
  });
});
