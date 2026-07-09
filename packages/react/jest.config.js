/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  roots: ['<rootDir>/src'],
  testMatch: ['**/src/**/(*.)+(spec|test).+(ts|tsx)'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true }],
  },
  // Transform workspace packages to CJS for Jest compatibility.
  transformIgnorePatterns: ['/node_modules/(?!@web-widget/)'],
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
