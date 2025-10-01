export enum AuthErrorType {
  CANCELLED = 'CANCELLED',
  IN_PROGRESS = 'IN_PROGRESS',
  UNAVAILABLE = 'UNAVAILABLE',
  NO_AUTH_CODE = 'NO_AUTH_CODE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export class AuthError extends Error {
  constructor(
    public readonly type: AuthErrorType,
    message: string
  ) {
    super(message);
    this.name = 'AuthError';
  }

  static cancelled(message: string = 'Sign in cancelled'): AuthError {
    return new AuthError(AuthErrorType.CANCELLED, message);
  }

  static inProgress(message: string = 'Sign in already in progress'): AuthError {
    return new AuthError(AuthErrorType.IN_PROGRESS, message);
  }

  static unavailable(message: string = 'Sign in not available'): AuthError {
    return new AuthError(AuthErrorType.UNAVAILABLE, message);
  }

  static noAuthCode(message: string = 'No authorization code received'): AuthError {
    return new AuthError(AuthErrorType.NO_AUTH_CODE, message);
  }

  static networkError(message: string = 'Network error occurred'): AuthError {
    return new AuthError(AuthErrorType.NETWORK_ERROR, message);
  }

  static unknown(message: string = 'Unknown error occurred'): AuthError {
    return new AuthError(AuthErrorType.UNKNOWN, message);
  }
}