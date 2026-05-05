import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { AuthError, AuthErrorType } from '../models/AuthError';
import { GoogleAuthStrategy } from '../strategies/GoogleAuthStrategy';

const configureMock = GoogleSignin.configure as jest.MockedFunction<typeof GoogleSignin.configure>;
const hasPlayServicesMock = GoogleSignin.hasPlayServices as jest.MockedFunction<
  typeof GoogleSignin.hasPlayServices
>;
const signInMock = GoogleSignin.signIn as jest.MockedFunction<typeof GoogleSignin.signIn>;

const originalEnv = {
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  googleServerClientId: process.env.EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID,
};

const setExpoExtra = (extra: Record<string, unknown>): void => {
  Object.assign(Constants, {
    expoConfig: {
      extra,
    },
  });
};

describe('GoogleAuthStrategy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setExpoExtra({});
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = originalEnv.googleIosClientId;
    process.env.EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID = originalEnv.googleServerClientId;
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = originalEnv.googleIosClientId;
    process.env.EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID = originalEnv.googleServerClientId;
  });

  it('uses expo extra client ids before env fallback', () => {
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'ios-env-client-id';
    process.env.EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID = 'server-env-client-id';
    setExpoExtra({
      googleIosClientId: 'ios-extra-client-id',
      googleServerClientId: 'server-extra-client-id',
    });

    new GoogleAuthStrategy().configure();

    expect(configureMock).toHaveBeenCalledWith({
      iosClientId: 'ios-extra-client-id',
      webClientId: 'server-extra-client-id',
      offlineAccess: true,
    });
  });

  it('falls back to EXPO_PUBLIC env client ids', () => {
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'ios-env-client-id';
    process.env.EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID = 'server-env-client-id';

    new GoogleAuthStrategy().configure();

    expect(configureMock).toHaveBeenCalledWith({
      iosClientId: 'ios-env-client-id',
      webClientId: 'server-env-client-id',
      offlineAccess: true,
    });
  });

  it('fails before configure when the server web client id is missing', () => {
    delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    delete process.env.EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID;

    expect(() => new GoogleAuthStrategy().configure()).toThrow(AuthError);

    try {
      new GoogleAuthStrategy().configure();
    } catch (error) {
      expect(error).toBeInstanceOf(AuthError);
      expect((error as AuthError).type).toBe(AuthErrorType.UNAVAILABLE);
    }

    expect(configureMock).not.toHaveBeenCalled();
  });

  it('does not log the raw server auth code', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID = 'server-env-client-id';
    hasPlayServicesMock.mockResolvedValue(true);
    signInMock.mockResolvedValue({
      type: 'success',
      data: {
        serverAuthCode: 'raw-server-auth-code',
        idToken: null,
        scopes: [],
        user: {
          id: 'google-user-id',
          name: 'Runner',
          email: 'runner@test.com',
          photo: null,
          familyName: null,
          givenName: null,
        },
      },
    });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const result = await new GoogleAuthStrategy().getAuthorizationCode();

    expect(result.authorizationCode).toBe('raw-server-auth-code');
    expect(logSpy.mock.calls.flat()).not.toContain('raw-server-auth-code');

    logSpy.mockRestore();
  });
});
