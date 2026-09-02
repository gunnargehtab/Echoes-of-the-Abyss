/**
 * hull-intake driver: validate a GLB model export and bake its review maps.
 *
 * Takes one exported GLB (from Claude Design or anywhere else) and produces
 * the four orthographic maps — albedo, normal, emissive, height — plus a
 * meta.json describing what the export actually contains. For units and
 * structures the maps are also the shipped sprite inputs
 * (tools/hull-maps/build.mjs); for environment props they are review
 * artifacts only, because props ship as instanced meshes
 * (packages/frontend/src/game/environmentModels.ts). Rendering happens in
 * headless Chromium via three.js because that is the only real glTF renderer
 * available in this container (no Blender), and it is the same Playwright
 * setup the run-game skill already relies on.
 *
 * Usage:
 *   node bake.mjs <model.glb> --length-m <metres> [--out <dir>] [--ppm <px>]
 *                 [--allow-no-emissive] [--glow-e <target>]
 *   node bake.mjs <model.glb> --category env --footprint-m <metres>
 *                 [--out <dir>] [--ppm <px>] [--world-light <vent|flora|crystal>]
 *                 [--max-tris <n>] [--max-materials <n>]
 *
 * --length-m is the design hull length: HULL_LENGTH_M in
 * packages/frontend/src/game/silhouettes.ts (e.g. Light Scout = 60).
 * --glow-e calibrates the emissive map onto a target glow energy (the gate-3
 * metric in docs/graphics-standards.md); without it the raw energy is still
 * measured and reported for intake review.
 *
 * `--category env` is the environment branch of the pipeline
 * (docs/graphics-standards.md gate 2): scale is held to `--footprint-m` (the
 * registry's footprintM — props have no bow, so no length-on-X yaw), triangle
 * and material counts are checked against the registry budgets, and the
 * emissive rule is INVERTED — on the ground it is the glowing rock that is
 * the style bug, so any emissive fails unless `--world-light` names the
 * licensed family (docs/style-neon-noir.md "World light"). `--glow-e` is a
 * SIG instrument and is rejected in env mode: props have no SIG.
 *
 * Exits non-zero when the model fails to load or fails its category's rules.
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
const category = flag('--category') || 'hull';
const isEnv = category === 'env';
const lengthM = Number(flag(isEnv ? '--footprint-m' : '--length-m'));
const outDir = resolve(flag('--out') || 'hull-intake-out');
const ppm = Number(flag('--ppm') || 2);
const allowNoEmissive = args.includes('--allow-no-emissive');
// Env mode: the licensed world-light family, and the registry budgets the
// export is held to (PropSpec.triBudget caps at 800 in the registry fence;
// two materials is the draw-call contract).
const WORLD_LIGHT_FAMILIES = ['vent', 'flora', 'crystal'];
const worldLight = flag('--world-light');
const maxTris = Number(flag('--max-tris') || 800);
const maxMaterials = Number(flag('--max-materials') || 2);
// Target glow energy (graphics-standards.md gate 3). When set, the emissive
// map is scaled onto it — placement stays the model's, intensity is spec'd.
const glowE = Number(flag('--glow-e') || 0);

if (!['hull', 'env'].includes(category)) {
  console.error(`unknown --category: ${category} (hull | env)`);
  process.exit(1);
}
if (!modelPath || !existsSync(modelPath) || !(lengthM > 0)) {
  console.error(
    isEnv
      ? 'usage: node bake.mjs <model.glb> --category env --footprint-m <metres> [--out dir]'
      : 'usage: node bake.mjs <model.glb> --length-m <metres> [--out dir] [--ppm px]'
  );
  process.exit(1);
}
if (isEnv && worldLight !== undefined && !WORLD_LIGHT_FAMILIES.includes(worldLight)) {
  console.error(`unknown --world-light: ${worldLight} (${WORLD_LIGHT_FAMILIES.join(' | ')})`);
  process.exit(1);
}
if (isEnv && glowE > 0) {
  // Gate 3 is scoped to things that have a SIG; calibrating a prop onto the
  // curve would be exactly the regime-blur the docs forbid.
  console.error('--glow-e is a SIG instrument and does not apply to --category env.');
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
  await page.goto(
    `http://127.0.0.1:${port}/page.html?lengthM=${lengthM}&ppm=${ppm}&category=${category}`
  );
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
  if (!isEnv && stats.emissiveMaterialCount === 0)
    warnings.push(
      'no emissive material found — the glow layer is empty. Glow encodes loudness ' +
        '(docs/style-neon-noir.md), so re-export with emissive intact unless this ' +
        'hull is intentionally dark.'
    );
  if (isEnv && worldLight && stats.emissiveMaterialCount === 0)
    warnings.push(
      `--world-light ${worldLight} was licensed but the export carries no emissive — ` +
        'either the channel was dropped or the licence is unused.'
    );
  // A material whose meshes disagree on vertex attributes cannot be merged
  // into one geometry at load (rosterModels' mergeByMaterial keeps the parts,
  // correctness over draw count). For a hull that is a few extra draws; for
  // an instanced prop it is a draw call per part per batch, which is what the
  // material cap exists to bound — so it is a warning here and a FAIL below.
  const splitMaterials = (stats.unmergeableMaterials ?? []).map(
    (m) => `${m.name} [${m.attributeSets.join(' | ')}]`
  );
  if (!isEnv && splitMaterials.length > 0)
    warnings.push(
      `meshes under one material carry different vertex attributes, so they cannot merge ` +
        `into one draw: ${splitMaterials.join('; ')}. Strip unused attributes (UVs on an ` +
        'untextured mesh) or export every part alike.'
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
  const meta = {
    source: resolve(modelPath),
    category,
    ...(isEnv ? { footprintM: lengthM, worldLight: worldLight ?? 'none' } : { lengthM }),
    ppm,
    ...stats,
    glow: glowMeta,
    warnings,
  };
  writeFileSync(join(outDir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
  console.log(`meta: ${join(outDir, 'meta.json')}`);

  console.log(
    `\n${stats.meshCount} mesh(es), ${stats.materials.length} material(s), ` +
      `${stats.emissiveMaterialCount} emissive, ${stats.triangleCount} triangles · ` +
      `${stats.sizeM.length.toFixed(1)}×${stats.sizeM.beam.toFixed(1)} m → ` +
      `${stats.imagePx.width}×${stats.imagePx.height} px`
  );
  for (const w of warnings) console.warn(`WARNING: ${w}`);

  if (isEnv) {
    // The environment rules (graphics-standards.md gate 2, env variant).
    // Distinct materials, not per-mesh uses: shared materials merge to one
    // draw call per instance batch, which is the budget the cap protects.
    const distinctMaterials = new Set(stats.materials.map((m) => m.name)).size;
    if (stats.emissiveMaterialCount > 0 && !worldLight) {
      console.error(
        '\nFAIL: this prop carries emissive but no world-light family was licensed. On the ' +
          'ground the glowing rock is the style bug (docs/style-neon-noir.md "World light") — ' +
          'pass --world-light <vent|flora|crystal> only if Block 4 licenses this prop.'
      );
      failed = true;
    }
    if (stats.triangleCount > maxTris) {
      console.error(
        `\nFAIL: ${stats.triangleCount} triangles exceed the prop budget of ${maxTris} ` +
          '(the registry triBudget — docs/asset-prompts-3d.md Block 4). Decimate the export.'
      );
      failed = true;
    }
    if (distinctMaterials > maxMaterials) {
      console.error(
        `\nFAIL: ${distinctMaterials} materials exceed the prop cap of ${maxMaterials} — ` +
          'each material is a draw call per instance batch (gate 6). Merge materials.'
      );
      failed = true;
    }
    if (splitMaterials.length > 0) {
      console.error(
        `\nFAIL: meshes under one material carry different vertex attributes and will not ` +
          `merge into one draw per instance batch (gate 6): ${splitMaterials.join('; ')}. ` +
          'Strip unused attributes (UVs on an untextured mesh) or export every part alike.'
      );
      failed = true;
    }
  } else if (stats.emissiveMaterialCount === 0 && !allowNoEmissive) {
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
