/**
 * The dependency half of `tools/preflight-deps.mjs`, split out so it can be run
 * against a fixture tree. The runner keeps the Node check and the printing.
 *
 * Two faults, both from a `node_modules` that no longer matches the manifests:
 *
 * - **Missing**: declared, and no `node_modules` on the walk holds it (#301).
 * - **Out of range**: declared, found, and the copy Node would load is a version
 *   the range refuses. A workspace's own copy can vanish while the root keeps a
 *   different one pinned for the tools, and the walk then lands on the root's.
 *   That is how the client served three r169 against `three ^0.187.0` from #1805
 *   until an `npm ci` (#1826, #1828): presence alone passed it.
 *
 * Drift *inside* a range stays npm's business. The range reader is a subset of
 * semver, the forms this repository declares, with no dependency added, since
 * this runs before anyone has a working install. A range outside the subset is
 * checked for presence alone rather than guessed at, and
 * `tools/lib/test/preflight.test.mjs` holds this repository's own manifests
 * inside the subset, so a new form fails a test instead of dropping out unseen.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const VERSION = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

function parseVersion(text) {
  const m = VERSION.exec(text);
  if (!m) return null;
  return { tuple: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ?? null };
}

function compare(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return 0;
}

/**
 * Whether `version` satisfies `range`, or `null` when the range is not one of
 * the forms read here: `*`, an exact `x.y.z`, or a caret `^x.y.z`.
 *
 * Caret follows npm: the leftmost non-zero part is fixed, so `^0.187.0` means
 * `>=0.187.0 <0.188.0` and `^0.0.4` means exactly `0.0.4`. A prerelease install
 * satisfies only the exact range that names it, as npm's default does; no
 * caret range here names a prerelease, so none admits one.
 */
export function satisfies(version, range) {
  const r = range.trim();
  if (r === '*' || r === '') return true;

  const installed = parseVersion(version);
  if (!installed) return null;

  if (r.startsWith('^')) {
    const base = parseVersion(r.slice(1));
    if (!base || base.pre) return null;
    if (installed.pre) return false;
    const [major, minor, patch] = base.tuple;
    const upper = major > 0 ? [major + 1, 0, 0] : minor > 0 ? [0, minor + 1, 0] : [0, 0, patch + 1];
    return compare(installed.tuple, base.tuple) >= 0 && compare(installed.tuple, upper) < 0;
  }

  const exact = parseVersion(r);
  if (!exact) return null;
  return compare(installed.tuple, exact.tuple) === 0 && installed.pre === exact.pre;
}

/**
 * The `package.json` Node would load for `name` from `fromDir`: walk
 * `node_modules` outward, as Node does, rather than `import.meta.resolve`. npm
 * hoists workspace dependencies to the root, and many packages do not export
 * `./package.json`, so a real resolve would throw on packages that are installed.
 */
export function resolveManifest(name, fromDir, repo) {
  let dir = fromDir;
  for (;;) {
    const manifest = join(dir, 'node_modules', name, 'package.json');
    if (existsSync(manifest)) return manifest;
    const parent = dirname(dir);
    if (parent === dir || dir === repo) return null;
    dir = parent;
  }
}

/**
 * Every declared dependency of the root and its workspaces, direct ones only,
 * sorted into the two faults. `unreadable` lists ranges `satisfies` cannot read,
 * which are checked for presence alone.
 */
export function checkDependencies(repo) {
  const root = readJson(join(repo, 'package.json'));
  const missing = [];
  const outOfRange = [];
  const unreadable = [];

  for (const workspace of ['.', ...(root.workspaces ?? [])]) {
    const dir = join(repo, workspace);
    const manifest = join(dir, 'package.json');
    if (!existsSync(manifest)) continue;

    const pkg = readJson(manifest);
    const declared = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

    for (const [name, range] of Object.entries(declared)) {
      const found = resolveManifest(name, dir, repo);
      if (!found) {
        missing.push(`${name}  (${pkg.name})`);
        continue;
      }
      const { version } = readJson(found);
      const ok = satisfies(String(version), range);
      if (ok === null) unreadable.push(`${name} ${range}  (${pkg.name})`);
      else if (!ok) outOfRange.push(`${name} ${version}, wants ${range}  (${pkg.name})`);
    }
  }

  return { missing, outOfRange, unreadable };
}
