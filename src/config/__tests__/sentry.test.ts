import { initializeSentry, setUserContext } from '../sentry';
import * as Sentry from '@sentry/react-native';

jest.mock('@sentry/react-native', () => ({ init: jest.fn(), reactNavigationIntegration: jest.fn(), setUser: jest.fn() }));

afterEach(() => { jest.restoreAllMocks(); });

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
    setUserContext('123', 'synthetic@example.invalid', 'Synthetic User');
    expect(log).toHaveBeenCalledWith('[Sentry Disabled] Set User Context');
  } finally {
    if (originalEnvironment === undefined) delete process.env.EXPO_PUBLIC_ENV;
    else process.env.EXPO_PUBLIC_ENV = originalEnvironment;
  }
});
