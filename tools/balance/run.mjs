#!/usr/bin/env node
/**
 * Balance harness launcher.
 *
 * The harness itself lives in `packages/backend/src/balance/`, because it has
 * to import `Match` and `AiSeat` — backend TypeScript compiled with
 * `moduleResolution: bundler` and real `.ts` import extensions. Standing that
 * up outside the workspace would mean a second copy of the backend's build
 * configuration whose only job is to drift out of sync with the first.
 *
 * So this file is what `tools/echo-sim/sim.js` is: the thing you run. It adds
 * no logic, forwards every argument, and exists so the harness has one obvious
 * entry point next to the baselines it produces.
 *
 *   node tools/balance/run.mjs --help
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const entry = join(repoRoot, 'packages', 'backend', 'src', 'balance', 'cli.ts');

const result = spawnSync(
  process.execPath,
  ['--import', 'tsx', entry, ...process.argv.slice(2)],
  { stdio: 'inherit', cwd: repoRoot }
);

if (result.error) {
  console.error(`Could not start the harness: ${result.error.message}`);
  console.error('Run `npm ci` first — the harness needs tsx from the workspace.');
  process.exit(1);
}
process.exit(result.status ?? 1);
