module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2021: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    'no-console': 'off'
  },
  overrides: [
    {
      files: ['*.js'],
      rules: {}
    },
    {
      files: ['*.ts', '*.tsx'],
      rules: {}
    }
  ],
  ignorePatterns: ['node_modules/', 'dist/', 'build/', 'coverage/']
};
