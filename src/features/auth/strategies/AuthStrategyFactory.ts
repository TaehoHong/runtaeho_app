import { AuthProviderType } from '../models/AuthType';
import { AppleAuthStrategy } from './AppleAuthStrategy';
import { type AuthProviderStrategy } from './AuthProviderStrategy';
import { GoogleAuthStrategy } from './GoogleAuthStrategy';

export class AuthStrategyFactory {
  private static strategies = new Map<AuthProviderType, AuthProviderStrategy>();

  static getStrategy(provider: AuthProviderType): AuthProviderStrategy {
    if (!this.strategies.has(provider)) {
      const strategy = this.createStrategy(provider);
      strategy.configure();
      this.strategies.set(provider, strategy);
    }

    return this.strategies.get(provider)!;
  }

  private static createStrategy(provider: AuthProviderType): AuthProviderStrategy {
    switch (provider) {
      case AuthProviderType.GOOGLE:
        return new GoogleAuthStrategy();
      case AuthProviderType.APPLE:
        return new AppleAuthStrategy();
      default:
        throw new Error(`Unsupported auth provider: ${provider}`);
    }
  }
}