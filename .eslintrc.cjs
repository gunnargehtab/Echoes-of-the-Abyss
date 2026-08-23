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
    },
    {
      // The simulation must be reproducible: same seed and same commands must
      // produce the same match, or replays, the balance harness and every
      // "this build order beats that one" claim are worthless. Draw from
      // `world.rng` instead — see packages/backend/src/sim/rng.ts.
      //
      // rng.ts itself is exempt: `randomSeed()` is where a seed comes from
      // when nobody supplied one, which is the one place wall-clock and
      // entropy legitimately enter, and the seed it returns is recorded.
      files: ['packages/backend/src/sim/**/*.ts'],
      excludedFiles: ['packages/backend/src/sim/rng.ts'],
      rules: {
        'no-restricted-properties': [
          'error',
          {
            object: 'Math',
            property: 'random',
            message:
              'The simulation must be deterministic. Use world.rng (sim/rng.ts) instead of Math.random().'
          }
        ],
        'no-restricted-globals': [
          'error',
          {
            name: 'Date',
            message:
              'The simulation must not read wall-clock. Use world.tick for time in the sim.'
          }
        ]
      }
    }
  ],
  ignorePatterns: ['node_modules/', 'dist/', 'build/', 'coverage/']
};
