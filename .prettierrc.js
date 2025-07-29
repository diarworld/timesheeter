module.exports = {
    trailingComma: 'all',
    singleQuote: true,
    useTabs: false,
    printWidth: 120,
    tabWidth: 2,
    semi: true,
    arrowParens: 'always',
    bracketSpacing: true,
    endOfLine: 'lf',
    overrides: [
      {
        files: ['*.ts'],
        options: {
          parser: 'typescript',
        },
      },
      {
        files: ['*.tsx'],
        options: {
          parser: 'typescript',
          jsxBracketSameLine: false,
          jsxSingleQuote: false,
        },
      },
      {
        files: ['*.json'],
        options: {
          parser: 'json',
        },
      },
    ],
  };