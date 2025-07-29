const { genRestrictedPaths } = require('./helpers');

module.exports = {
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
  'no-console': ['error', { allow: ['warn', 'error'] }],

  // To enable support of Next.Link passHref
  'jsx-a11y/anchor-is-valid': 'off',
  // We want to use assert: either instead of both https://github.com/airbnb/javascript/pull/1951
  'jsx-a11y/label-has-associated-control': [
    'error',
    {
      labelComponents: [],
      labelAttributes: [],
      controlComponents: [],
      assert: 'either',
      depth: 25,
    },
  ],
  'react/jsx-props-no-spreading': 'off',
  'react/function-component-definition': 'off',
  'react/no-unstable-nested-components': ['error', { allowAsProps: true }],
  'react/prop-types': 'off',
  'react/react-in-jsx-scope': 'off',
  'react/require-default-props': 'off',
  'react/jsx-filename-extension': ['error', { extensions: ['.jsx', '.tsx'] }],
  'react-perf/jsx-no-new-array-as-prop': 'off',
  'react-perf/jsx-no-new-object-as-prop': 'off',
  'react-perf/jsx-no-new-function-as-prop': 'off',

  'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
  'import/prefer-default-export': 'off',
  'import/extensions': ['error', 'ignorePackages', { ts: 'never', tsx: 'never', js: 'never', jsx: 'never' }],

  // To support https://feature-sliced.design/
  'import/no-restricted-paths': [
    'error',
    {
      zones: [
        ...genRestrictedPaths([
          './src/1-app',
          './src/2-processes',
          './src/3-pages',
          './src/4-widgets',
          './src/5-features',
          './src/6-entities',
          './src/7-shared',
        ]),
      ],
    },
  ],
  'no-restricted-syntax': [
    'error',
    {
      selector:
        'ImportDeclaration[source.value=/(1-app|2-processes|3-pages|4-widgets|5-features|6-entities|7-shared)/]',
      message: 'Layer access only by alias',
    },
  ],
  'no-restricted-imports': ['error', { patterns: ['../*'] }],
  'no-param-reassign': 'off',
  'react/no-danger': 'off',
};