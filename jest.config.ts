import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',
    '^@/(.*)$': '<rootDir>/app/$1',
    '^assets/(.*)$': '<rootDir>/assets/$1',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/src/test-utils/mocks/fileMock.ts',
  },
  collectCoverageFrom: [
    'src/features/auth/**/*.{ts,tsx}',
    'src/features/running/**/*.{ts,tsx}',
    'src/features/league/**/*.{ts,tsx}',
    'src/features/user/**/*.{ts,tsx}',
    'src/features/point/**/*.{ts,tsx}',
    'src/features/statistics/**/*.{ts,tsx}',
    '!**/index.ts',
    '!**/__tests__/**',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/src/test-utils/'],
  clearMocks: true,
  resetMocks: false,
};

export default config;
