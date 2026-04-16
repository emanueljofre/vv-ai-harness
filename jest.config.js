/** @type {import('jest').Config} */
module.exports = {
    // Only pick up *.test.js files co-located with tools
    testMatch: ['<rootDir>/tools/**/__tests__/**/*.test.js'],

    // Never let Jest touch Playwright specs or node_modules
    testPathIgnorePatterns: ['/node_modules/', '/testing/', '/tools/explore/'],

    // Coverage for tool source code only
    collectCoverageFrom: [
        'tools/**/*.js',
        '!tools/**/__tests__/**',
        '!tools/explore/**',
        '!tools/helpers/vv-browser-probes.js',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'text-summary', 'lcov'],

    // Fail fast on first broken test during CI
    bail: process.env.CI ? 1 : 0,

    // Increase timeout for tests that parse large XML fixtures
    testTimeout: 10_000,
};
