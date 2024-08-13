export default {
  roots: ['<rootDir>/src'],
  testMatch: ['**/src/**/(*.)+(spec|test).+(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true }],
  },
  transformIgnorePatterns: ['/node_modules/'],
  testEnvironment: 'miniflare',
  testEnvironmentOptions: {
    compatibilityFlags: ['streams_enable_constructors'],
  },
  extensionsToTreatAsEsm: ['.ts'],
};
