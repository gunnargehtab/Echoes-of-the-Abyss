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
 * things. Two faults fail it: a package declared but absent, the one that
 * happens after a pull, and a package whose resolved copy is outside its
 * declared range, which a root copy pinned for the tools can hide (#1828).
 * Drift inside a satisfied range is npm's business. tools/lib/preflight.mjs
 * holds both checks and says why the range reader is a subset of semver.
 *
 *   node tools/preflight-deps.mjs
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkDependencies } from './lib/preflight.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Node 22.3+: the backend dev and test scripts use `node --import tsx` and the
// stable node:test runner, both of which fail obscurely on older runtimes, and
// the frontend test shim lists asset globs through `process.getBuiltinModule`
// (packages/frontend/test/support/viteAssetHooks.mjs), which 22.3 added.
const MIN_NODE = [22, 3];

const problems = [];

const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
const minNode = MIN_NODE.join('.');
if (nodeMajor < MIN_NODE[0] || (nodeMajor === MIN_NODE[0] && nodeMinor < MIN_NODE[1])) {
  problems.push({
    headline: `Node ${process.versions.node} is too old — this repository needs Node ${minNode}+.`,
    fix: `Install Node ${minNode} or newer (24 recommended), then run \`npm install\` again.`,
  });
}

const { missing, outOfRange } = checkDependencies(repo);

if (missing.length > 0) {
  problems.push({
    headline: `${missing.length} declared ${missing.length === 1 ? 'dependency is' : 'dependencies are'} not installed:`,
    detail: missing,
    fix: 'Run `npm install` from the repository root, then try again.',
  });
}

if (outOfRange.length > 0) {
  problems.push({
    headline: `${outOfRange.length} declared ${outOfRange.length === 1 ? 'dependency resolves' : 'dependencies resolve'} outside the declared range:`,
    detail: outOfRange,
    fix: 'Run `npm ci` from the repository root, then try again.',
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
