module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
    },
    env: {
        node: true,
        jest: true,
    },
    extends: [
        '@doist/eslint-config/recommended-requiring-type-checking',
        '@doist/eslint-config/simple-import-sort',
    ],
    root: true,
    ignorePatterns: ['scripts/', '.eslintrc.js', 'global-setup.js', 'jest.config.js'],
    rules: {
        '@typescript-eslint/no-useless-constructor': 'error',
        '@typescript-eslint/no-unnecessary-condition': 'error',
        'no-restricted-imports': [
            'error',
            {
                patterns: [
                    {
                        group: ['@doist/ui-extensions-server/dist/*'],
                        message: 'Import directly from the package root, not the "dist" directory',
                    },
                ],
            },
        ],
    },
    overrides: [
        {
            files: ['*.spec.*', 'fixtures.ts'],
            rules: {
                '@typescript-eslint/unbound-method': 'off',
                'no-restricted-imports': 'off',
            },
        },
    ],
}
