module.exports = {
    '@typescript-eslint/comma-dangle': ['error', 'always-multiline'],
    '@typescript-eslint/ban-types': [
      'error',
      {
        types: { '{}': false },
        extendDefaults: true,
      },
    ],
    '@typescript-eslint/no-explicit-any': ['error'],
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-use-before-define': ['error', { functions: false }],
    '@typescript-eslint/naming-convention': [
      'error',
      // From airbnb-eslint-typescript
      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
      // From airbnb-eslint-typescript
      {
        selector: 'function',
        format: ['camelCase', 'PascalCase'],
      },
      // Name interfaces using I letter
      {
        selector: 'interface',
        format: ['PascalCase'],
        custom: {
          regex: '^I[A-Z]',
          match: true,
        },
      },
      // Name types using T letter
      {
        selector: 'typeAlias',
        format: ['PascalCase'],
        custom: {
          regex: '^T[A-Z]',
          match: true,
        },
      },
    ],
  };