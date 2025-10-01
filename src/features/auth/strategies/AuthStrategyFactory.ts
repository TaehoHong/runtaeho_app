import { AuthProvider } from '../models/auth-types';
import { AppleAuthStrategy } from './AppleAuthStrategy';
import { AuthProviderStrategy } from './AuthProviderStrategy';
import { GoogleAuthStrategy } from './GoogleAuthStrategy';

export class AuthStrategyFactory {
  private static strategies = new Map<AuthProvider, AuthProviderStrategy>();

  static getStrategy(provider: AuthProvider): AuthProviderStrategy {
    if (!this.strategies.has(provider)) {
      const strategy = this.createStrategy(provider);
      strategy.configure();
      this.strategies.set(provider, strategy);
    }

    return this.strategies.get(provider)!;
  }

  private static createStrategy(provider: AuthProvider): AuthProviderStrategy {
    switch (provider) {
      case AuthProvider.GOOGLE:
        return new GoogleAuthStrategy();
      case AuthProvider.APPLE:
        return new AppleAuthStrategy();
      default:
        throw new Error(`Unsupported auth provider: ${provider}`);
    }
  }
}