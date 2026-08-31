/**
 * Dependency preflight for the root entry points (`dev`, `build`, `test`).
 *
 * Without it, a stale `node_modules` fails deep inside a tool rather than at the
 * front door: adding `three` to the frontend surfaced, for anyone who pulled
 * without reinstalling, as a Vite `Failed to resolve import "three"` overlay ten
 * seconds into `npm run dev` — with the backend already listening, so the tree
 * looked half-alive rather than uninstalled (issue #301).
 *
 * Plain Node, no dependencies, no npm subprocess: this has to run before anyone
 * has a working install, and `npm ls` is both slow and noisy about unrelated
 * things. Presence is all we check — a package declared but absent is the
 * failure that actually happens after a pull; version drift inside a satisfied
 * range is npm's business.
 *
 *   node tools/preflight-deps.mjs
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Node 22+: the backend dev and test scripts use `node --import tsx` and the
// stable node:test runner, both of which fail obscurely on older runtimes.
const MIN_NODE_MAJOR = 22;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Resolve like Node does — walk `node_modules` from the package outward — rather
 * than with `import.meta.resolve`. npm hoists workspace dependencies to the root,
 * and many packages do not export `./package.json`, so a real resolve would throw
 * on packages that are in fact installed.
 */
function isInstalled(name, fromDir) {
  let dir = fromDir;
  for (;;) {
    if (existsSync(join(dir, 'node_modules', name, 'package.json'))) return true;
    const parent = dirname(dir);
    if (parent === dir || dir === repo) return false;
    dir = parent;
  }
}

const problems = [];

const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor < MIN_NODE_MAJOR) {
  problems.push({
    headline: `Node ${process.versions.node} is too old — this repository needs Node ${MIN_NODE_MAJOR}+.`,
    fix: `Install Node ${MIN_NODE_MAJOR} or newer (24 recommended), then run \`npm install\` again.`,
  });
}

const root = readJson(join(repo, 'package.json'));
const missing = [];

for (const workspace of ['.', ...(root.workspaces ?? [])]) {
  const dir = join(repo, workspace);
  const manifest = join(dir, 'package.json');
  if (!existsSync(manifest)) continue;

  const pkg = readJson(manifest);
  const declared = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

  for (const name of Object.keys(declared)) {
    if (!isInstalled(name, dir)) missing.push(`${name}  (${pkg.name})`);
  }
}

if (missing.length > 0) {
  problems.push({
    headline: `${missing.length} declared ${missing.length === 1 ? 'dependency is' : 'dependencies are'} not installed:`,
    detail: missing,
    fix: 'Run `npm install` from the repository root, then try again.',
  });
}

if (problems.length === 0) process.exit(0);

console.error('');
console.error('Preflight failed — the workspace is not ready to run.');
for (const { headline, detail, fix } of problems) {
  console.error('');
  console.error(`  ${headline}`);
  for (const line of detail ?? []) console.error(`    - ${line}`);
  console.error('');
  console.error(`  → ${fix}`);
}
console.error('');
process.exit(1);
