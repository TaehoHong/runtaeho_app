import '@testing-library/jest-native/extend-expect';
import 'react-native-gesture-handler/jestSetup';
import { act, cleanup } from '@testing-library/react-native';
import { notifyManager } from '@tanstack/react-query';
import './src/test-utils/mocks/native';

Object.defineProperty(global, '__DEV__', {
  value: true,
  writable: true,
});

notifyManager.setNotifyFunction((callback) => {
  act(() => {
    callback();
  });
});

const originalConsoleError = console.error.bind(console);
const ACT_WARNING_PATTERN = /not wrapped in act/i;
let consoleErrorSpy: jest.SpyInstance | null = null;

beforeAll(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const joined = args
      .map((arg) => (typeof arg === 'string' ? arg : ''))
      .join(' ');

    if (ACT_WARNING_PATTERN.test(joined)) {
      throw new Error(`Detected act warning: ${joined}`);
    }

    originalConsoleError(...(args as Parameters<typeof console.error>));
  });
});

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

afterAll(() => {
  consoleErrorSpy?.mockRestore();
  consoleErrorSpy = null;
});
