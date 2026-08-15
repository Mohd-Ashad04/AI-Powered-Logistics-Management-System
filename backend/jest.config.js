module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/setup/testSetup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testTimeout: 600000 // 10 minutes to allow downloading mongo binaries
};
