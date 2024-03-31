module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./test/setup.ts'],
  moduleNameMapper: {
    '^@shared/(.*)': '<rootDir>/../shared/$1',
    '^@models/(.*)': '<rootDir>/models/$1',
  },
  collectCoverage: true,
  coverageReporters: ['text', 'cobertura'],
};
