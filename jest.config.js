const { join } = require('path')

module.exports = {
    transform: { '^.+\\.ts?$': 'ts-jest' },
    clearMocks: true,
    testEnvironment: 'jsdom',
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec|e2e-spec))\\.tsx?$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    globalSetup: join(__dirname, 'global-setup.js'),
    setupFilesAfterEnv: [join(__dirname, 'jest.setup.js')],
    restoreMocks: true,
    moduleNameMapper: {
        '^axios$': 'axios/dist/node/axios.cjs',
    },
    // Run e2e tests sequentially to avoid database conflicts
    maxWorkers: 1,
}
