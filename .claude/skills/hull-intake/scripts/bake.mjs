/**
 * hull-intake driver: validate a GLB unit model and bake its top-down maps.
 *
 * Takes one exported GLB (from Claude Design or anywhere else) and produces
 * the four orthographic maps the sprite bake in
 * packages/frontend/src/game/hullTextures.ts is built from — albedo, normal,
 * emissive, height — plus a meta.json describing what was found. Rendering
 * happens in headless Chromium via three.js because that is the only real
 * glTF renderer available in this container (no Blender), and it is the same
 * Playwright setup the run-game skill already relies on.
 *
 * Usage:
 *   node bake.mjs <model.glb> --length-m <metres> [--out <dir>] [--ppm <px>]
 *                 [--allow-no-emissive] [--glow-e <target>]
 *
 * --glow-e calibrates the emissive map onto a target glow energy (the gate-3
 * metric in docs/graphics-standards.md); without it the raw energy is still
 * measured and reported for intake review.
 *
 * --length-m is the design hull length: HULL_LENGTH_M in
 * packages/frontend/src/game/silhouettes.ts (e.g. Light Scout = 60).
 * Exits non-zero if the model fails to load or — because glow-encodes-
 * loudness makes the emissive channel the style — if no material carries any
 * emissive and --allow-no-emissive was not given.
 */

import { createRequire } from 'node:module';
import { execSync, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

// --- args ------------------------------------------------------------------
const args = process.argv.slice(2);
const modelPath = args.find((a) => !a.startsWith('--'));
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const lengthM = Number(flag('--length-m'));
const outDir = resolve(flag('--out') || 'hull-intake-out');
const ppm = Number(flag('--ppm') || 2);
const allowNoEmissive = args.includes('--allow-no-emissive');
// Target glow energy (graphics-standards.md gate 3). When set, the emissive
// map is scaled onto it — placement stays the model's, intensity is spec'd.
const glowE = Number(flag('--glow-e') || 0);

if (!modelPath || !existsSync(modelPath) || !(lengthM > 0)) {
  console.error('usage: node bake.mjs <model.glb> --length-m <metres> [--out dir] [--ppm px]');
  process.exit(1);
}

// --- three.js, installed once outside the repo -----------------------------
// The repo has no three dependency and should not grow one for an offline
// bake tool, so pin it in a throwaway prefix under the system temp dir.
const THREE_VERSION = '0.169.0';
const depsDir = join(tmpdir(), 'hull-intake-deps');
if (!existsSync(join(depsDir, 'node_modules', 'three', 'package.json'))) {
  console.log(`installing three@${THREE_VERSION} into ${depsDir} (first run only)...`);
  mkdirSync(depsDir, { recursive: true });
  const r = spawnSync('npm', ['install', '--no-audit', '--no-fund', `three@${THREE_VERSION}`], {
    cwd: depsDir,
    stdio: 'inherit',
  });
  if (r.status !== 0) {
    console.error('npm install of three failed — the bake cannot run without it.');
    process.exit(1);
  }
}

// --- Playwright, same resolution dance as run-game's drive.mjs -------------
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

// --- tiny static server: page, model, deps ---------------------------------
// file:// cannot serve ES modules (module scripts require an http origin), so
// the page, the pinned three install, and the model go through localhost.
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.glb': 'model/gltf-binary',
  '.json': 'application/json',
};
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let file;
  if (url.pathname === '/page.html') file = join(here, 'page.html');
  else if (url.pathname === '/model.glb') file = resolve(modelPath);
  else if (url.pathname.startsWith('/deps/')) {
    file = join(depsDir, normalize(url.pathname.slice('/deps/'.length)));
    if (!file.startsWith(depsDir)) file = undefined; // no path escapes
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

// --- render the four passes ------------------------------------------------
const { chromium } = loadPlaywright();
const browser = await chromium.launch({ args: ['--no-sandbox'] });
let failed = false;
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error(`page error: ${e.message}`));
  await page.goto(`http://127.0.0.1:${port}/page.html?lengthM=${lengthM}&ppm=${ppm}`);
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 60000 });

  const error = await page.evaluate(() => window.__error);
  if (error) throw new Error(`model failed to load: ${error}`);
  const stats = await page.evaluate(() => window.__stats);

  mkdirSync(outDir, { recursive: true });
  let glow;
  for (const pass of ['albedo', 'normal', 'emissive', 'height']) {
    let dataUrl;
    if (pass === 'emissive' && glowE > 0) {
      glow = await page.evaluate((t) => window.__glow(t), glowE);
      dataUrl = glow.url;
    } else {
      dataUrl = await page.evaluate((p) => window.__bake(p), pass);
    }
    const png = Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64');
    const path = join(outDir, `${pass}.png`);
    writeFileSync(path, png);
    console.log(`map: ${path}`);
  }
  // Raw glow energy is reported even uncalibrated — intake review reads it
  // against the gate-3 curve.
  if (!glow) glow = await page.evaluate(() => window.__glow(0));

  // --- validation verdicts -------------------------------------------------
  const warnings = [];
  if (stats.emissiveMaterialCount === 0)
    warnings.push(
      'no emissive material found — the glow layer is empty. Glow encodes loudness ' +
        '(docs/style-neon-noir.md), so re-export with emissive intact unless this ' +
        'hull is intentionally dark.'
    );
  if (stats.rotatedZtoX)
    warnings.push('length ran along Z in the export; auto-rotated onto X. Verify bow direction.');
  if (Math.abs(stats.scaleApplied - 1) > 0.01)
    warnings.push(
      `export was not in metres (rescaled ×${stats.scaleApplied.toFixed(3)} to ` +
        `${lengthM} m). Harmless, but a metre-true export skips the guess.`
    );
  if (glow.targetE) {
    console.log(
      `glow: raw E=${glow.rawE.toFixed(2)} → calibrated E=${glow.achievedE.toFixed(2)} ` +
        `(target ${glow.targetE.toFixed(2)}, gain ×${glow.gain.toFixed(3)})`
    );
    if (glow.achievedE < glow.targetE * 0.75)
      warnings.push(
        `glow undershoots its SIG target even at max gain (E=${glow.achievedE.toFixed(2)} ` +
          `of ${glow.targetE.toFixed(2)}) — the lit features are too small or dim. Rework ` +
          'lights as strips, bars or patches; sub-pixel dots vanish at sprite scale ' +
          '(graphics-standards.md gate 3).'
      );
  } else {
    console.log(`glow: raw E=${glow.rawE.toFixed(2)} per 1000 mask px (gate-3 metric)`);
  }

  const { url: _url, ...glowMeta } = glow;
  const meta = { source: resolve(modelPath), lengthM, ppm, ...stats, glow: glowMeta, warnings };
  writeFileSync(join(outDir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
  console.log(`meta: ${join(outDir, 'meta.json')}`);

  console.log(
    `\n${stats.meshCount} mesh(es), ${stats.materials.length} material(s), ` +
      `${stats.emissiveMaterialCount} emissive · ` +
      `${stats.sizeM.length.toFixed(1)}×${stats.sizeM.beam.toFixed(1)} m → ` +
      `${stats.imagePx.width}×${stats.imagePx.height} px`
  );
  for (const w of warnings) console.warn(`WARNING: ${w}`);

  if (stats.emissiveMaterialCount === 0 && !allowNoEmissive) {
    console.error('\nFAIL: emissive channel missing (pass --allow-no-emissive to override).');
    failed = true;
  }
} catch (err) {
  console.error(String(err.message || err));
  failed = true;
} finally {
  await browser.close();
  server.close();
}
process.exit(failed ? 1 : 0);
