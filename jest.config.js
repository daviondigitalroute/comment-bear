module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // Gate against coverage regressions. Thresholds are set a little below the
  // current numbers so they catch real drops without being brittle.
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 72,
      functions: 90,
      lines: 90
    }
  }
};
