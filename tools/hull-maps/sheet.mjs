/**
 * Bake the roster contact sheet: every navy's hulls and structures as the game
 * draws a player's own force, in one picture the roadmap site shows.
 *
 * The sheet used to be a screenshot an art PR committed by hand, and the site
 * took the newest; after #466 none did, and the public page showed a roster
 * five hulls a navy short for weeks while the maps under it moved on. So it is
 * now the third committed output of the same bake as the maps and the plan
 * outlines: build.mjs calls this at the end of every run, and
 * tools/roadmap/test/sheet.test.mjs fails when the maps have changed since the
 * sheet was baked. `MANIFEST` records which maps it was baked from, by hash.
 *
 * Not an npm workspace, but unlike the map bake it needs the workspace
 * install: it bundles the frontend's own sprite code (sheet-page.mjs) with
 * esbuild and runs it in Chromium, so a sprite on the sheet is the sprite the
 * game draws, not a second rendering of the same maps.
 *
 *   node tools/hull-maps/sheet.mjs
 */

import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { spawn } from '../lib/spawn.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');

/** The sheet and its manifest, beside the hull renders the site also shows. */
export const SHEET = 'docs/concept-art/roster-sheet.png';
export const MANIFEST = 'docs/concept-art/roster-sheet.json';

/** Every map the sprites are baked from: build.mjs's two output directories. */
export const MAP_DIRS = [
  'packages/frontend/src/assets/hulls/maps',
  'packages/frontend/src/assets/structures/maps',
];

/**
 * `{ path: sha256 }` for every map, keyed by repository-relative path with
 * forward slashes, sorted, so a manifest written on one machine compares equal
 * on another.
 */
export function mapDigests(root = repo) {
  const digests = {};
  for (const dir of MAP_DIRS) {
    for (const file of readdirSync(join(root, dir)).sort()) {
      if (!file.endsWith('.png')) continue;
      const path = `${dir}/${file}`;
      digests[path] = createHash('sha256')
        .update(readFileSync(join(root, path)))
        .digest('hex');
    }
  }
  return digests;
}

// The same resolution bake.mjs and run-game's drive.mjs use: a global
// Playwright, whose browsers are already at PLAYWRIGHT_BROWSERS_PATH.
function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const candidates = ['playwright', 'playwright-core'];
  try {
    const root = execSync('npm root -g', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (root) candidates.push(`${root}/playwright/index.js`, `${root}/playwright-core/index.js`);
  } catch {
    // npm missing; the bare specifiers may still resolve.
  }
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      continue;
    }
  }
  throw new Error(
    'Could not load Playwright. Install it globally (`npm i -g playwright`) — the browsers ' +
      'themselves are already at PLAYWRIGHT_BROWSERS_PATH.'
  );
}

/** Bake the sheet, write it and its manifest, and return what it drew. */
export async function bakeSheet() {
  // The page imports @echoes/shared by its build output, like the frontend;
  // a stale dist would draw last week's roster.
  const built = spawn('npm', ['run', 'build:shared', '--silent'], { cwd: repo });
  if (built.status !== 0) throw new Error('npm run build:shared failed');

  const esbuild = await import('esbuild');
  const bundle = await esbuild.build({
    entryPoints: [join(here, 'sheet-page.mjs')],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    // Data URLs, not files: an image from a file:// or another origin would
    // taint the canvas, and toDataURL would refuse to read it back.
    loader: { '.png': 'dataurl', '.jpg': 'dataurl' },
    logLevel: 'warning',
  });

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({
    args: ['--no-sandbox'],
    channel: process.env.PLAYWRIGHT_CHANNEL,
  });
  let result;
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setContent('<!doctype html><html><body></body></html>');
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    result = await page.evaluate(() => globalThis.bakeRosterSheet());
    if (errors.length > 0) throw new Error(`the sheet page threw: ${errors.join('; ')}`);
  } finally {
    await browser.close();
  }
  if (result.blank.length > 0) {
    throw new Error(`no sprite for ${result.blank.join(', ')}; the sheet was not written`);
  }

  writeFileSync(join(repo, SHEET), Buffer.from(result.png.split(',')[1], 'base64'));
  const manifest = {
    about:
      'Written by tools/hull-maps/sheet.mjs with the sheet beside it. maps is the sha256 of ' +
      'every map the sheet was baked from; tools/roadmap/test/sheet.test.mjs fails when they ' +
      'no longer match, and a run of tools/hull-maps/build.mjs or sheet.mjs re-bakes both.',
    navies: result.navies,
    maps: mapDigests(),
  };
  writeFileSync(join(repo, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await bakeSheet();
  const counts = result.navies.map((n) => `${n.name} ${n.hulls}+${n.structures}`).join(', ');
  console.log(
    `${relative(process.cwd(), join(repo, SHEET))}: ${result.width}×${result.height}, ${counts}`
  );
}
