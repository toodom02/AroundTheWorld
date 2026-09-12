'use strict';

const gtsConfig = require('gts/build/src/index.js');
const defineConfig = require('eslint/config').defineConfig;
const globals = require('globals');
const tseslint = require('typescript-eslint');

module.exports = defineConfig([
  ...gtsConfig,
  {
    ignores: ['build/', '**/node_modules/'],
  },
  {
    files: ['webpack.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
  {
    plugins: {'@typescript-eslint': tseslint.plugin},
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
      'prettier/prettier': ['error', {endOfLine: 'auto'}],
    },
  },
]);
