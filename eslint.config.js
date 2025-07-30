const path = require('path');
const baseRules = require('./lint/base-rules');
const typescriptRules = require('./lint/typescript-rules');

module.exports = [
  // Base configuration for all files
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      import: require('eslint-plugin-import'),
      prettier: require('eslint-plugin-prettier'),
      'react-perf': require('eslint-plugin-react-perf'),
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      react: require('eslint-plugin-react'),
      'react-hooks': require('eslint-plugin-react-hooks'),
      'jsx-a11y': require('eslint-plugin-jsx-a11y'),
    },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: process.cwd(),
        },
      },
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...baseRules,
      // Prettier rules
      'prettier/prettier': [
        'error',
        {
          singleQuote: true,
          printWidth: 120,
          trailingComma: 'all',
        },
        {
          usePrettierrc: false,
        },
      ],
      // React performance rules
      'react-perf/jsx-no-new-array-as-prop': 'off',
      'react-perf/jsx-no-new-object-as-prop': 'off',
      'react-perf/jsx-no-new-function-as-prop': 'off',
    },
  },

  // TypeScript-specific configuration
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      '@next/next': require('@next/eslint-plugin-next'),
    },
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        project: path.join(process.cwd(), 'tsconfig.json'),
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      ...typescriptRules,
      // TypeScript-specific rules
      '@typescript-eslint/no-empty-object-type': 'error',
      '@typescript-eslint/no-explicit-any': ['error'],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-use-before-define': ['error', { functions: false }],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: {
            regex: '^I[A-Z]',
            match: true,
          },
        },
        {
          selector: 'typeAlias',
          format: ['PascalCase'],
          custom: {
            regex: '^T[A-Z]',
            match: true,
          },
        },
      ],
      // Next.js specific rules
      '@next/next/no-html-link-for-pages': 'error',
      '@next/next/no-img-element': 'error',
      '@next/next/no-sync-scripts': 'error',
      '@next/next/no-title-in-document-head': 'error',
      '@next/next/no-unwanted-polyfillio': 'error',
    },
  },

  // Storybook files
  {
    files: ['**/*.stories.{js,jsx,ts,tsx}', '**/*.story.{js,jsx,ts,tsx}'],
    plugins: {
      storybook: require('eslint-plugin-storybook'),
    },
    rules: {
      'storybook/prefer-pascal-case': 'error',
      'storybook/no-redundant-story-name': 'error',
      'storybook/csf-component': 'error',
      'storybook/no-uninstalled-addons': 'error',
    },
  },
]; 