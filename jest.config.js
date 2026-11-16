/** Two suites: pure logic (fast, offline) and database/RLS (needs DATABASE_URL). */
const shared = {
  preset: 'jest-expo/node',
  moduleNameMapper: {
    '^@core/(.*)$': '<rootDir>/supabase/functions/_shared/core/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

module.exports = {
  maxWorkers: 2,
  projects: [
    { ...shared, displayName: 'core', testMatch: ['<rootDir>/tests/core/**/*.test.ts'] },
    { ...shared, displayName: 'db', testMatch: ['<rootDir>/tests/db/**/*.test.ts'] },
  ],
};
