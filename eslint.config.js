import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
            globals: { ...globals.browser, ...globals.node }
        },
        plugins: {
            '@typescript-eslint': ts,
        },
        rules: {
            ...ts.configs.recommended.rules,
			'no-undef': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',        // 함수 인자 무시
                varsIgnorePattern: '^_',        // 일반 변수 무시
                caughtErrorsIgnorePattern: '^_', // try-catch 에러 변수 무시
            }],
        },
    },
    {
        ignores: ['dist/**', 'node_modules/**'],
    },
    prettier,
];

