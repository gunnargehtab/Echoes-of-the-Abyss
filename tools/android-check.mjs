/**
 * On-device smoke check for the Android / Termux deployment (SETUP-ANDROID.md).
 *
 * One command that answers "did the install actually work on this phone?":
 *
 *   node tools/android-check.mjs            # full check: build, tests, server boot
 *   node tools/android-check.mjs --quick    # skip the test suite
 *
 * Plain Node with no dependencies on purpose — it must run before anyone has
 * debugged anything, on a stock Termux with only nodejs-lts and git installed,
 * so it cannot assume lsof, setsid, bash, or even that `npm ci` succeeded.
 * (The run-game skill's dev.sh is the right tool on a dev box; this is the
 * right tool on a phone.)
 *
 * The server boot is checked by starting the real `npm run dev` tree detached
 * in its own process group and probing both ports, then signalling the whole
 * group. Killing only the direct child is not enough: npm wraps concurrently,
 * which wraps tsx and vite, and the supervisors respawn children — the same
 * orphan problem dev.sh documents, solved the same way.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, openSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const quick = process.argv.includes('--quick');
const log = join(tmpdir(), 'echoes-android-check.log');

const BACKEND = 'http://localhost:3000/';
const FRONTEND = 'http://localhost:5173/';
// Phones are slow and `npm run dev` rebuilds @echoes/shared before anything
// listens; first boot on older hardware has been observed near two minutes.
const BOOT_DEADLINE_MS = 180_000;

let failed = false;
const results = [];

function report(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failed = true;
}

function run(name, cmd, args) {
  console.log(`\n>> ${name}: ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd: repo, stdio: 'inherit' });
  report(name, r.status === 0, r.status === 0 ? '' : `exit code ${r.status ?? r.error?.code}`);
  return r.status === 0;
}

async function up(url) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(2_000) });
    return true; // any HTTP answer means something is listening
  } catch {
    return false;
  }
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// 1. Node version. Older runtimes fail later with errors that do not point
// here (CLAUDE.md), so make this the first and loudest check.
const major = Number(process.versions.node.split('.')[0]);
report(
  'node >= 22',
  major >= 22,
  major >= 22
    ? `v${process.versions.node}`
    : `v${process.versions.node} — in Termux: pkg install nodejs-lts (or nodejs if lts is behind)`
);
if (major < 22) exit();

// 2. Dependencies installed.
report(
  'dependencies installed',
  existsSync(join(repo, 'node_modules')),
  existsSync(join(repo, 'node_modules')) ? '' : 'run `npm ci` first (SETUP-ANDROID.md §Install)'
);
if (failed) exit();

// 3. Ports must be free before we boot anything, both so EADDRINUSE cannot
// masquerade as a broken install and so we never kill a server we did not
// start — on a phone that would be the user's own running game.
if ((await up(BACKEND)) || (await up(FRONTEND))) {
  report('ports 3000/5173 free', false, 'a dev server is already running — stop it, then re-run');
  exit();
}
report('ports 3000/5173 free', true);

// 4. Build and tests — the same gates CI runs, minus lint/format (style gates
// belong on the machine the code was written on, not the phone).
if (!run('shared build', 'npm', ['run', 'build:shared'])) exit();
if (!quick && !run('test suite', 'npm', ['test'])) exit();

// 5. Boot the real dev tree and probe both ports.
console.log(`\n>> server boot: npm run dev (log: ${log})`);
const fd = openSync(log, 'w');
const dev = spawn('npm', ['run', 'dev'], {
  cwd: repo,
  detached: true,
  stdio: ['ignore', fd, fd],
});

let booted = false;
const deadline = Date.now() + BOOT_DEADLINE_MS;
while (Date.now() < deadline) {
  if ((await up(BACKEND)) && (await up(FRONTEND))) {
    booted = true;
    break;
  }
  if (readFileSync(log, 'utf8').includes('EADDRINUSE')) break;
  await sleep(1_000);
}
report(
  'server boot (backend :3000 + client :5173)',
  booted,
  booted ? '' : `did not come up in ${BOOT_DEADLINE_MS / 1000}s — see ${log}`
);

// Signal the process group; negative pid reaches the whole detached tree.
try {
  process.kill(-dev.pid, 'SIGTERM');
  await sleep(2_000);
  process.kill(-dev.pid, 'SIGKILL');
} catch {
  // already gone — SIGTERM was enough (or boot never forked the tree)
}

exit();

function exit() {
  const ok = !failed;
  console.log('\n' + '─'.repeat(60));
  for (const r of results) console.log(`${r.ok ? '  ok ' : 'FAIL '} ${r.name}`);
  console.log(
    ok
      ? '\nAll checks passed — this device runs the game. `npm run dev`, then open http://localhost:5173'
      : '\nSmoke check FAILED — see above, and the symptom table in SETUP-ANDROID.md'
  );
  process.exit(ok ? 0 : 1);
}
