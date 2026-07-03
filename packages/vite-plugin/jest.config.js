/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  roots: ['<rootDir>/src'],
  testMatch: ['**/src/**/(*.)+(spec|test).+(ts|tsx|js)'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^vite$': '<rootDir>/test/vite-stub.ts',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true }],
  },
  transformIgnorePatterns: ['/node_modules/(?!estree-walker)/'],
};
