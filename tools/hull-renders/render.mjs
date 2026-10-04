/**
 * Photograph the roster: one beauty render per hull, in its navy's water.
 *
 * The repository already renders these GLBs twice — hull-intake bakes the
 * measured orthographic passes, and tools/hull-maps bakes the sprite maps the
 * client ships. Neither produces a picture anyone can look at. This does: a
 * three-quarter hero frame of one hull over a displaced seabed, lit by the
 * noir rig, dressed with the biome props that actually stand in that water.
 *
 * The images are presentation artifacts for the design bible — key art for
 * docs/, a way to see a shape whole after a port, and the thing to put in
 * front of someone who asks what the game looks like. They are **not** a
 * gate and they are not evidence. A model is approved by hull-intake
 * (docs/graphics-standards.md gate 2) and by tools/hull-models/check.mjs,
 * both of which measure; a render flatters, which is its job and its
 * disqualification.
 *
 * Not an npm workspace — run it directly, like tools/hull-maps:
 *
 *   node tools/hull-renders/render.mjs                  # the 20 hulls of #649
 *   node tools/hull-renders/render.mjs --kinds cruiser  # one kind, four navies
 *   node tools/hull-renders/render.mjs --navies hadron --width 2560 --height 1440
 *   node tools/hull-renders/render.mjs --all            # every kind in the table
 *
 * Output lands in docs/concept-art/renders/<kind>-<navy>.png.
 *
 * Rendering happens in headless Chromium through three.js, for the same
 * reason hull-intake does it there: it is the only real glTF renderer in this
 * container (no Blender), and it is the Playwright setup the run-game skill
 * already relies on. The pinned three install is shared with hull-intake, so
 * a first run after that skill's is free.
 */

import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { spawn } from '../lib/spawn.mjs';
import { CHROMIUM_ARGS, emptyFrame } from './chromium.mjs';
import { KINDS, NAVIES, NEW_KINDS, shots } from './shots.mjs';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const MODELS = join(repo, 'docs/concept-art/models');

// --- args --------------------------------------------------------------------
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const list = (name, fallback) => {
  const v = flag(name, null);
  return v === null ? fallback : v.split(',').map((s) => s.trim()).filter(Boolean);
};
const width = Number(flag('--width', 1920));
const height = Number(flag('--height', 1080));
const outDir = resolve(flag('--out', join(repo, 'docs/concept-art/renders')));
const kinds = args.includes('--all') ? KINDS.map((k) => k.slug) : list('--kinds', NEW_KINDS);
const navies = list('--navies', Object.keys(NAVIES));

for (const navy of navies) {
  if (!NAVIES[navy]) {
    console.error(`unknown navy: ${navy} (${Object.keys(NAVIES).join(' | ')})`);
    process.exit(1);
  }
}
const plan = shots({ kinds, navies });
if (plan.length === 0) {
  console.error(`nothing to render — no kind in [${kinds.join(', ')}] is in the shot table.`);
  process.exit(1);
}

// --- three.js, installed once outside the repo -------------------------------
// Shared with inspect.mjs and .claude/skills/hull-intake/scripts/bake.mjs,
// deliberately: one pinned prefix means one download. packages/frontend does
// depend on three, but scene.html imports it by URL through an importmap
// (/deps/node_modules/three/) that the server below answers from this prefix,
// so a render needs no workspace install. Keep THREE_VERSION on the version
// package-lock.json resolves, so a render runs the r169 the client ships.
const THREE_VERSION = '0.169.0';
const depsDir = join(tmpdir(), 'hull-intake-deps');
if (!existsSync(join(depsDir, 'node_modules', 'three', 'package.json'))) {
  console.log(`installing three@${THREE_VERSION} into ${depsDir} (first run only)...`);
  mkdirSync(depsDir, { recursive: true });
  // npm is a .cmd batch file on Windows, which spawnSync cannot start alone.
  const r = spawn('npm', ['install', '--no-audit', '--no-fund', `three@${THREE_VERSION}`], {
    cwd: depsDir,
  });
  if (r.status !== 0) {
    console.error('npm install of three failed — the render cannot run without it.');
    process.exit(1);
  }
}

// --- the game's frame, bundled for the page ---------------------------------
// frame.mjs re-exports the conn view's lamp ink, lamp core, glow after the
// curve and lamp halo from packages/frontend (#1015). three stays external so
// the page's importmap gives the bundle and the page the same three; shared
// resolves to its build output, so it must be built.
if (!existsSync(join(repo, 'packages/shared/dist/index.js'))) {
  console.error('packages/shared/dist is missing — run `npm run build:shared` first.');
  process.exit(1);
}
const frameJs = (
  await build({
    entryPoints: [join(here, 'frame.mjs')],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    external: ['three', 'three/*'],
    write: false,
    logLevel: 'error',
  })
).outputFiles[0].contents;

// --- Playwright, same resolution dance as hull-intake's bake.mjs -------------
function loadPlaywright() {
  const candidates = ['playwright', 'playwright-core'];
  try {
    const globalRoot = execSync('npm root -g', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (globalRoot)
      candidates.push(
        `${globalRoot}/playwright/index.js`,
        `${globalRoot}/playwright-core/index.js`
      );
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

// --- tiny static server: page, deps, the subject, the props ------------------
// file:// cannot serve ES modules, so everything goes through localhost. The
// subject model is swapped per shot rather than restarting the server.
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.glb': 'model/gltf-binary',
  '.json': 'application/json',
};
let currentModel = null;
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let file;
  if (url.pathname === '/frame.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' }).end(frameJs);
    return;
  }
  if (url.pathname === '/scene.html') file = join(here, 'scene.html');
  else if (url.pathname === '/model.glb') file = currentModel;
  else if (url.pathname.startsWith('/props/')) {
    // Prop slugs come from the shot table, never from the request, so the
    // only thing a path can name is a file the table already chose.
    const slug = url.pathname.slice('/props/'.length).replace(/\.glb$/, '');
    if (/^[a-z0-9-]+$/.test(slug)) file = join(MODELS, `${slug}.glb`);
  } else if (url.pathname.startsWith('/deps/')) {
    const candidate = resolve(depsDir, '.' + url.pathname.slice('/deps'.length));
    if (candidate.startsWith(depsDir)) file = candidate;
  }
  if (!file || !existsSync(file)) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const port = server.address().port;

/**
 * A stable seed per shot. The scatter, the mottle and the snow are random and
 * a render that moved every run could not be reviewed against its
 * predecessor, so the seed is derived from the shot id and nothing else — the
 * same hull in the same water composes identically forever.
 */
const seedOf = (id) => {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
};

// --- render ------------------------------------------------------------------
const { chromium } = loadPlaywright();
const browser = await chromium.launch({ args: CHROMIUM_ARGS });
mkdirSync(outDir, { recursive: true });
let failed = 0;
try {
  for (const shot of plan) {
    const model = join(MODELS, shot.model);
    if (!existsSync(model)) {
      console.error(`${shot.id}: no model at ${shot.model} — skipped`);
      failed++;
      continue;
    }
    currentModel = model;
    const navy = NAVIES[shot.navy];
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('pageerror', (e) => console.error(`${shot.id} page error: ${e.message}`));
    // The dressing is too big for a query string, and it is data the page
    // reads rather than a knob it interprets, so it is installed before any
    // script runs instead of being parsed out of the URL.
    await page.addInitScript((s) => {
      window.__shot = s;
    }, navy);
    const q = new URLSearchParams({
      id: shot.id,
      lengthM: String(shot.lengthM),
      sig: String(shot.sig),
      width: String(width),
      height: String(height),
      seed: String(seedOf(shot.id)),
    });
    await page.goto(`http://127.0.0.1:${port}/scene.html?${q}`);
    try {
      await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 180000 });
      const error = await page.evaluate(() => window.__error);
      if (error) throw new Error(error);
      // Before anything is written: --out defaults to the committed portraits.
      const empty = await page.evaluate(emptyFrame);
      if (empty) throw new Error(`empty frame: ${empty}`);
      const stats = await page.evaluate(() => window.__stats);
      const dataUrl = await page.evaluate(() => window.__png());
      const png = Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64');
      const path = join(outDir, `${shot.id}.png`);
      writeFileSync(path, png);
      const kb = Math.round(statSync(path).size / 1024);
      console.log(
        `${shot.id.padEnd(32)} ${shot.lengthM} m · SIG ${String(shot.sig).padStart(4)} · ` +
          `${stats.lamps} lamp(s) · halo ×${stats.haloScale.toFixed(1)} ${stats.haloState} ` +
          `${stats.haloSites} site(s) · ${navy.biome} · ${kb} KB`
      );
    } catch (err) {
      console.error(`${shot.id}: ${err.message || err}`);
      failed++;
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}

console.log(
  `\n${plan.length - failed}/${plan.length} rendered at ${width}×${height} → ${outDir}`
);
process.exit(failed ? 1 : 0);
