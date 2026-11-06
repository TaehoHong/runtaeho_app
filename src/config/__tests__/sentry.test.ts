import { initializeSentry, reportError, setUserContext } from '../sentry';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

jest.mock('expo-updates', () => ({ __esModule: true,
  updateId: 'synthetic-update', channel: 'production', runtimeVersion: '1.9.0', isEmbeddedLaunch: false,
}));

jest.mock('@sentry/react-native', () => ({ init: jest.fn(), reactNavigationIntegration: jest.fn(), setUser: jest.fn(), captureException: jest.fn() }));

afterEach(() => { jest.restoreAllMocks(); });

it('keeps local telemetry disabled when Metro retains another environment', () => {
  const original = { environment: process.env.EXPO_PUBLIC_ENV, dsn: process.env.EXPO_PUBLIC_SENTRY_DSN, extra: Constants.expoConfig?.extra };
  process.env.EXPO_PUBLIC_ENV = 'development';
  process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@example.invalid/1';
  Constants.expoConfig!.extra = { env: 'local' };
  jest.mocked(Sentry.init).mockClear();
  jest.mocked(Sentry.captureException).mockClear();
  jest.mocked(Sentry.setUser).mockClear();
  try {
    initializeSentry();
    reportError(new Error('local failure'));
    setUserContext('synthetic-user');
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(Sentry.setUser).not.toHaveBeenCalled();
  } finally {
    if (original.extra === undefined) delete Constants.expoConfig!.extra;
    else Constants.expoConfig!.extra = original.extra;
    if (original.environment === undefined) delete process.env.EXPO_PUBLIC_ENV;
    else process.env.EXPO_PUBLIC_ENV = original.environment;
    if (original.dsn === undefined) delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    else process.env.EXPO_PUBLIC_SENTRY_DSN = original.dsn;
  }
});

it('retains telemetry for the selected production profile despite a stale local env', () => {
  const original = { environment: process.env.EXPO_PUBLIC_ENV, dsn: process.env.EXPO_PUBLIC_SENTRY_DSN, extra: Constants.expoConfig?.extra };
  process.env.EXPO_PUBLIC_ENV = 'local';
  process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@example.invalid/1';
  Constants.expoConfig!.extra = { env: 'production' };
  jest.mocked(Sentry.init).mockClear();
  try {
    initializeSentry();
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ environment: 'production', enabled: true }));
  } finally {
    if (original.extra === undefined) delete Constants.expoConfig!.extra;
    else Constants.expoConfig!.extra = original.extra;
    if (original.environment === undefined) delete process.env.EXPO_PUBLIC_ENV;
    else process.env.EXPO_PUBLIC_ENV = original.environment;
    if (original.dsn === undefined) delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    else process.env.EXPO_PUBLIC_SENTRY_DSN = original.dsn;
  }
});

it('removes request secrets and excludes arbitrary console objects without logging events', async () => {
  const originalEnvironment = process.env.EXPO_PUBLIC_ENV;
  const originalDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  process.env.EXPO_PUBLIC_ENV = 'test';
  process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@example.invalid/1';
  const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    initializeSentry();
    const options = jest.mocked(Sentry.init).mock.calls.at(-1)?.[0];
    const event = await options?.beforeSend?.({
      type: undefined,
      request: { method: 'GET', url: '/oauth?code=synthetic-secret', headers: { Authorization: 'synthetic-token' } },
    }, {});
    expect(event?.request).toEqual({ method: 'GET' });
    expect(options?.beforeBreadcrumb?.({ category: 'console', data: { arguments: [{ token: 'synthetic-token' }] } }, {})).toBeNull();
    expect(log).not.toHaveBeenCalled();
  } finally {
    if (originalEnvironment === undefined) delete process.env.EXPO_PUBLIC_ENV;
    else process.env.EXPO_PUBLIC_ENV = originalEnvironment;
    if (originalDsn === undefined) delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    else process.env.EXPO_PUBLIC_SENTRY_DSN = originalDsn;
  }
});

it('does not print a user identity when local telemetry is disabled', () => {
  const originalEnvironment = process.env.EXPO_PUBLIC_ENV;
  process.env.EXPO_PUBLIC_ENV = 'local';
  const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  try {
    setUserContext('123');
    expect(log).toHaveBeenCalledWith('[Sentry Disabled] Set User Context');
  } finally {
    if (originalEnvironment === undefined) delete process.env.EXPO_PUBLIC_ENV;
    else process.env.EXPO_PUBLIC_ENV = originalEnvironment;
  }
});

it('sends only the internal user ID', () => {
  const originalDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@example.invalid/1';
  try {
    setUserContext('123');
    expect(jest.mocked(Sentry.setUser).mock.calls[0]?.[0]).toStrictEqual({ id: '123' });
  } finally {
    if (originalDsn === undefined) delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    else process.env.EXPO_PUBLIC_SENTRY_DSN = originalDsn;
  }
});

it('groups API failures by safe operation and status without leaking arbitrary context', () => {
  const originalDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@example.invalid/1';
  try {
    reportError(new Error('API failure'), { type: 'api-error', operation: 'GET running', method: 'get', status: 500, token: 'private-token' });
    const capture = jest.mocked(Sentry.captureException).mock.calls[0]?.[1];
    expect(capture).toMatchObject({ fingerprint: ['api-error', 'GET running', '500'], tags: { operation: 'GET running' } });
    expect(JSON.stringify(capture)).not.toContain('private-');
  } finally {
    if (originalDsn === undefined) delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    else process.env.EXPO_PUBLIC_SENTRY_DSN = originalDsn;
  }
});

it('uses native SDK release detection and identifies the active OTA without request payloads', async () => {
  const original = { environment: process.env.EXPO_PUBLIC_ENV, dsn: process.env.EXPO_PUBLIC_SENTRY_DSN };
  process.env.EXPO_PUBLIC_ENV = 'production';
  process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@example.invalid/1';
  try {
    initializeSentry();
    const options = jest.mocked(Sentry.init).mock.calls.at(-1)![0]!;
    expect(options.release).toBeUndefined();
    expect(options.dist).toBeUndefined();
    expect(options.initialScope).toMatchObject({ tags: {
      'expo-update-id': 'synthetic-update', 'expo-channel': 'production',
      'expo-runtime-version': '1.9.0', 'expo-is-embedded-update': false,
    } });
    const event = await options.beforeSendTransaction?.({
      type: 'transaction', transaction: 'running', contexts: { custom: { status: 500, token: 'private-token' } },
      request: { method: 'POST', url: '/running?code=private-code', data: 'private-body' },
      user: { id: '123', email: 'private-email', username: 'private-name', ip_address: 'private-ip' },
      extra: { payload: 'private-extra' },
    }, {});
    expect(event?.request).toEqual({ method: 'POST' });
    expect(event?.user).toEqual({ id: '123' });
    expect(event?.contexts?.custom).toEqual({ status: 500 });
    expect(JSON.stringify(event)).not.toContain('private-');
    const span = options.beforeSendSpan?.({
      op: 'http.client', description: 'POST https://example.invalid/private-path',
      span_id: '123', trace_id: '456', start_timestamp: 0, timestamp: 1,
      data: { 'http.request.method': 'POST', 'http.response.status_code': 500, 'url.full': 'private-url' },
    });
    expect(span?.data).toEqual({ 'http.request.method': 'POST', 'http.response.status_code': 500 });
    expect(JSON.stringify(span)).not.toContain('private-');
    const legacySpan = options.beforeSendSpan?.({
      op: 'http.client', description: 'POST https://example.invalid/private-path',
      span_id: '123', trace_id: '456', start_timestamp: 0, timestamp: 1,
      data: { 'http.method': 'POST', 'http.status_code': 500, 'http.url': 'private-url' },
    });
    expect(legacySpan?.data).toEqual({ 'http.method': 'POST', 'http.status_code': 500 });
  } finally {
    if (original.environment === undefined) delete process.env.EXPO_PUBLIC_ENV;
    else process.env.EXPO_PUBLIC_ENV = original.environment;
    if (original.dsn === undefined) delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    else process.env.EXPO_PUBLIC_SENTRY_DSN = original.dsn;
  }
});
