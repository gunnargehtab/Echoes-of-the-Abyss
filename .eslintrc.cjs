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
    },
    {
      // The skirmish AI must play the game the player plays. Its only inputs
      // are the map briefing it is handed once and the per-slot EchoSnapshot
      // it is handed each Echo tick — the same resolved payload a human
      // client receives, with contacts under opaque handles. An AI that could
      // read the ECS would not merely be unfair, it would be playing a
      // different game in the same room, and the whole point of this opponent
      // is that a commander restricted to resolved contacts can still play.
      //
      // seat.ts is the single deliberate crossing point: it applies the
      // commander's commands to the Match and assembles the briefing, and it
      // is short enough to read in one sitting for exactly that reason.
      files: ['packages/backend/src/ai/**/*.ts'],
      excludedFiles: ['packages/backend/src/ai/seat.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/sim/**', '../sim/*', '**/rooms/**', 'bitecs'],
                message:
                  'The AI may only read the EchoSnapshot it is given. Reaching into the simulation would make it a different opponent than the one the design calls for — see packages/backend/src/ai/types.ts.'
              }
            ]
          }
        ],
        // Its decisions feed the simulation, so they inherit the simulation's
        // reproducibility requirement: same seed, same commands, same match.
        'no-restricted-properties': [
          'error',
          {
            object: 'Math',
            property: 'random',
            message:
              'An AI that rolls dice breaks replay. Derive variation from the snapshot tick instead.'
          }
        ],
        'no-restricted-globals': [
          'error',
          {
            name: 'Date',
            message: 'The AI must not read wall-clock. Use the snapshot tick.'
          }
        ]
      }
    }
  ],
  ignorePatterns: ['node_modules/', 'dist/', 'build/', 'coverage/']
};
