describe('release API logging', () => {
  it('does not enable payload logging in a release even when env requests it', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, '__DEV__');
    const previous = process.env.EXPO_PUBLIC_ENABLE_LOGGING;
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      Object.defineProperty(globalThis, '__DEV__', { value: false, configurable: true });
      process.env.EXPO_PUBLIC_ENABLE_LOGGING = 'true';
      jest.isolateModules(() => {
        const { API_CONFIG } = jest.requireActual<typeof import('../config')>('../config');
        expect(API_CONFIG.LOGGING.ENABLED).toBe(false);
      });
    } finally {
      if (descriptor) Object.defineProperty(globalThis, '__DEV__', descriptor);
      if (previous === undefined) delete process.env.EXPO_PUBLIC_ENABLE_LOGGING;
      else process.env.EXPO_PUBLIC_ENABLE_LOGGING = previous;
      log.mockRestore();
    }
  });
});
