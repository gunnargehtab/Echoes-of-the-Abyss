/**
 * Render the Steam store and library art from the game's own logo (#1651).
 *
 * The Steam "Coming Soon" page needs a capsule at every size Steam asks for, and
 * the only place the logo existed was the title screen. This draws it the way
 * the title screen does: the Mouth mark is MouthMark.tsx itself, rendered to
 * markup; its inks are the index.css tokens; the wordmark is set in the vendored
 * Big Shoulders Display. Nothing about the brand is written a second time here
 * except the wordmark's few CSS values, transcribed from App.css below.
 *
 * Steam allows only artwork, the game name and an official subtitle on a
 * capsule (Steamworks "Rules and Guidelines for Graphical Assets"), so there is
 * no tagline. The lockups follow docs/naming.md: horizontal for store headers,
 * vertical for key art.
 *
 * What it writes, into out/ beside this file (gitignored) or --out <dir>:
 *
 *   logo-horizontal.png, logo-vertical.png   the lockups, transparent
 *   bg-<asset>.png                           the text-free background per size
 *   <asset>.png                              the background with the logo on it
 *   library-logo.png                         1280x720, transparent
 *
 * and prints where each logo sits on its background, so the same layout can be
 * rebuilt as an editable page in a design tool.
 *
 * A capsule is a presentation artifact, not a gate and not evidence, for the
 * reason tools/hull-renders gives for a portrait. Not an npm workspace; run it
 * directly, after `npm run build:shared` (the survey ink is imported from the
 * frontend, which reads @echoes/shared's build output):
 *
 *   node tools/steam-capsules/render.mjs
 *   node tools/steam-capsules/render.mjs --out /tmp/capsules
 */

import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const FRONTEND = join(repo, 'packages/frontend/src');

const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const OUT = resolve(outAt >= 0 && args[outAt + 1] ? args[outAt + 1] : join(here, 'out'));

// Steam's sizes since August 2024 (Steamworks "Graphical Assets"). `fit` is the
// share of the width the logo may take, before the height binds; the small
// capsule fills more because Steam shows it at its own size in lists.
const ASSETS = [
  { id: 'header-capsule', w: 920, h: 430, logo: 'horizontal', fit: 0.8 },
  { id: 'small-capsule', w: 462, h: 174, logo: 'horizontal', fit: 0.9 },
  { id: 'main-capsule', w: 1232, h: 706, logo: 'vertical', fit: 0.42 },
  { id: 'vertical-capsule', w: 748, h: 896, logo: 'vertical', fit: 0.7 },
  { id: 'library-capsule', w: 600, h: 900, logo: 'vertical', fit: 0.78 },
  { id: 'library-header', w: 920, h: 430, logo: 'horizontal', fit: 0.8 },
  // Steam lays the library logo over the hero, so the hero carries no words, and
  // its light sits right of centre where the logo does not.
  { id: 'library-hero', w: 3840, h: 1240, logo: null, glowX: 0.68 },
];

// The title screen's lockup is drawn at this scale for the PNGs, so a capsule
// only ever scales the logo down.
const SCALE = 6;

// --- the brand, from the frontend --------------------------------------------
if (!existsSync(join(repo, 'packages/shared/dist/index.js'))) {
  console.error('packages/shared/dist is missing — run `npm run build:shared` first.');
  process.exit(1);
}

// MouthMark is a React component, so it is rendered to markup rather than its
// paths copied out: a change to the logo lands here on the next run. CommonJS
// for Node, so react-dom/server's built-in requires stay native.
const bundle = join(tmpdir(), `steam-capsules-${process.pid}.cjs`);
await build({
  stdin: {
    contents: `
      import { createElement } from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import { MouthMark } from './menu/MouthMark.tsx';
      import { SURVEY_INK_COLOR } from './game/surveyInk.ts';
      export const markSvg = (width) => renderToStaticMarkup(createElement(MouthMark, { width }));
      export const surveyInk = '#' + SURVEY_INK_COLOR.toString(16).padStart(6, '0');
    `,
    resolveDir: FRONTEND,
    loader: 'tsx',
  },
  bundle: true,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  outfile: bundle,
  logLevel: 'error',
});
const { markSvg, surveyInk } = require(bundle);

// The :root tokens, read rather than restated: MouthMark strokes with
// var(--neon-violet) and var(--mouth-glow), so the page needs them. Only the
// custom properties: the same block paints the page abyss-void, which would
// make every transparent PNG opaque.
const css = readFileSync(join(FRONTEND, 'index.css'), 'utf8');
const rootBlock = css.match(/:root\s*{[^}]*}/)[0];
const rootTokens = `:root { ${rootBlock.match(/--[\w-]+:\s*[^;]+;/g).join(' ')} }`;
const token = (name) => {
  const m = rootBlock.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`index.css :root has no --${name}`);
  return m[1];
};
const T = {
  violet: token('neon-violet'),
  glow: token('mouth-glow'),
  bright: token('text-bright'),
  floor: token('abyss-floor'),
  void: token('abyss-void'),
};
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ');

// Inlined as data, since a page set from about:blank may not read file:// URLs.
const dataUrl = (type, bytes) => `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
const FONT = dataUrl(
  'font/woff2',
  readFileSync(join(FRONTEND, 'assets/fonts/big-shoulders-display-latin.woff2'))
);

// The wordmark, transcribed from App.css .menu-wordmark, -name and -sub at k
// times the title screen's size (4.2rem and 1.2rem on a 16px root). Core and
// halo only: App.css calls the name's third shadow, the reflection, menu-only.
function wordmark(k) {
  const v = rgb(T.violet);
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:${8.8 * k}px;
      font-family:'BSD';text-transform:uppercase;line-height:1;white-space:nowrap">
    <span style="font-size:${67.2 * k}px;font-weight:700;letter-spacing:0.07em;color:${T.bright};
      text-shadow:0 0 ${k}px rgba(${v}, 0.4),0 0 ${24 * k}px rgba(${v}, 0.35)">Echoes</span>
    <span style="font-size:${19.2 * k}px;font-weight:600;letter-spacing:0.5em;text-indent:0.5em;
      color:${T.glow};text-shadow:0 0 ${12 * k}px rgba(${v}, 0.4)">of the Abyss</span>
  </div>`;
}

// The vertical lockup is the title screen's masthead (mark 132px over the
// wordmark, 0.9rem apart). The horizontal one has no screen to copy: the mark
// stands a little taller than the two lines of the wordmark beside it.
function lockup(kind, k) {
  const pad = 40 * k; // room for the halo, so the PNG never clips a glow
  if (kind === 'vertical') {
    return `<div id="lockup" style="display:inline-flex;flex-direction:column;align-items:center;
        gap:${14.4 * k}px;padding:${pad}px">${markSvg(132 * k)}${wordmark(k)}</div>`;
  }
  const wordmarkHeight = (67.2 + 8.8 + 19.2) * k;
  const markWidth = (wordmarkHeight * 1.15 * 240) / 184;
  return `<div id="lockup" style="display:inline-flex;align-items:center;gap:${26 * k}px;
      padding:${pad}px">${markSvg(markWidth)}${wordmark(k)}</div>`;
}

// --- the background ----------------------------------------------------------
// Seeded, so a re-run draws the same snow and the same isobaths.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Downward into black, never upward into blue (docs/style-neon-noir.md), and lit
// from beneath in the Mouth's violet, because in the logo the deep end is the lit
// end. Over it, isobaths in the survey ink of the cartographic plates, and marine
// snow. No hull: the in-game renders are too dark to carry a capsule yet.
function background(w, h, seed, glowX = 0.5) {
  const r = rng(seed);
  const unit = Math.sqrt(w * h);
  const cx = w * glowX;
  const cy = h * 1.08;
  const phase = [r() * 6.28, r() * 6.28, r() * 6.28];
  const rings = 14;
  let isobaths = '';
  for (let i = 1; i <= rings; i++) {
    const radius = unit * 0.09 * i;
    let d = '';
    for (let a = 0; a <= 360; a += 3) {
      const t = (a * Math.PI) / 180;
      const wobble =
        1 +
        0.06 * Math.sin(3 * t + phase[0] + i * 0.4) +
        0.035 * Math.sin(5 * t + phase[1] - i * 0.3) +
        0.02 * Math.sin(9 * t + phase[2]);
      const x = cx + Math.cos(t) * radius * 1.7 * wobble;
      const y = cy + Math.sin(t) * radius * wobble;
      d += `${a === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    // Fainter with distance from the light, as a survey line fades from its datum.
    const opacity = (0.16 * (1 - i / (rings + 2))).toFixed(3);
    isobaths += `<path d="${d}Z" stroke="${surveyInk}" stroke-width="${Math.max(0.6, unit / 900)}"
      fill="none" opacity="${opacity}"/>`;
  }
  let snow = '';
  const flakes = Math.round((w * h) / 2600);
  for (let i = 0; i < flakes; i++) {
    const radius = (0.35 + r() * r() * 1.3) * Math.max(1, unit / 900);
    const opacity = (0.04 + r() * r() * 0.4).toFixed(2);
    snow += `<circle cx="${(r() * w).toFixed(1)}" cy="${(r() * h).toFixed(1)}"
      r="${radius.toFixed(2)}" fill="${T.bright}" opacity="${opacity}"/>`;
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="down" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${T.floor}"/><stop offset="0.55" stop-color="${T.void}"/>
      <stop offset="1" stop-color="#000"/>
    </linearGradient>
    <radialGradient id="mouth" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${unit * 0.95}"
      gradientTransform="translate(${cx} ${cy}) scale(1.7 1) translate(${-cx} ${-cy})">
      <stop offset="0" stop-color="${T.violet}" stop-opacity="0.5"/>
      <stop offset="0.35" stop-color="${T.violet}" stop-opacity="0.2"/>
      <stop offset="1" stop-color="${T.violet}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.75">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.55"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#down)"/>
  <rect width="${w}" height="${h}" fill="url(#mouth)"/>
  ${isobaths}
  ${snow}
  <rect width="${w}" height="${h}" fill="url(#vignette)"/>
</svg>`;
}

const page = (body, bg = 'transparent') => `<!doctype html><html><head><style>
  @font-face { font-family: 'BSD'; src: url('${FONT}') format('woff2'); font-weight: 100 900; }
  ${rootTokens}
  html, body { margin: 0; background: ${bg}; }
</style></head><body>${body}</body></html>`;

// --- Playwright, same resolution dance as tools/hull-renders/render.mjs ------
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

// --- render ------------------------------------------------------------------
mkdirSync(OUT, { recursive: true });
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const tab = await browser.newPage({ deviceScaleFactor: 1 });
const png = (name) => join(OUT, name);

// A transparent asset must come out with an alpha channel: byte 25 of a PNG is
// the IHDR colour type, 6 for RGBA. Anything that paints the page behind the
// logo still screenshots without error, as an opaque box.
function assertTransparent(name) {
  if (readFileSync(png(name))[25] !== 6) throw new Error(`${name} has no alpha channel`);
}

const logos = {};
for (const kind of ['horizontal', 'vertical']) {
  await tab.setContent(page(lockup(kind, SCALE)));
  // A face that has not loaded falls back to a serif without an error, which is
  // how the first draft of these shipped a wordmark in Times.
  const loaded = await tab.evaluate(async () => {
    await document.fonts.load("700 10px 'BSD'");
    await document.fonts.load("600 10px 'BSD'");
    return document.fonts.check("700 10px 'BSD'");
  });
  if (!loaded) throw new Error('Big Shoulders Display did not load; the wordmark would fall back');
  const box = await tab.locator('#lockup').boundingBox();
  await tab.locator('#lockup').screenshot({ path: png(`logo-${kind}.png`), omitBackground: true });
  assertTransparent(`logo-${kind}.png`);
  logos[kind] = {
    w: Math.round(box.width),
    h: Math.round(box.height),
    url: dataUrl('image/png', readFileSync(png(`logo-${kind}.png`))),
  };
}

const layout = [];
for (const [i, asset] of ASSETS.entries()) {
  const { id, w, h } = asset;
  await tab.setViewportSize({ width: w, height: h });
  const bg = background(w, h, 1651 + i, asset.glowX);
  await tab.setContent(page(bg, '#000'));
  await tab.screenshot({ path: png(`bg-${id}.png`) });
  if (!asset.logo) {
    writeFileSync(png(`${id}.png`), readFileSync(png(`bg-${id}.png`)));
    layout.push({ asset: id, width: w, height: h, logo: null });
    continue;
  }

  // Centred and a little high, so the lit water sits beneath the logo.
  const logo = logos[asset.logo];
  const s = Math.min((w * asset.fit) / logo.w, (h * 0.86) / logo.h);
  const place = {
    width: Math.round(logo.w * s),
    height: Math.round(logo.h * s),
  };
  place.left = Math.round((w - place.width) / 2);
  place.top = Math.round((h - place.height) / 2 - h * 0.03);
  await tab.setContent(
    page(
      `<div style="position:relative;width:${w}px;height:${h}px">${bg}
        <img src="${logo.url}" style="position:absolute;left:${place.left}px;top:${place.top}px;
          width:${place.width}px;height:${place.height}px"></div>`,
      '#000'
    )
  );
  await tab.waitForLoadState('load');
  await tab.screenshot({ path: png(`${id}.png`) });
  layout.push({ asset: id, width: w, height: h, logo: asset.logo, ...place });
}

// The library logo: the horizontal lockup inside Steam's 1280x720, transparent.
await tab.setViewportSize({ width: 1280, height: 720 });
const libraryWidth = Math.round(
  logos.horizontal.w * Math.min(1180 / logos.horizontal.w, 620 / logos.horizontal.h)
);
await tab.setContent(
  page(`<div style="width:1280px;height:720px;display:flex;align-items:center;justify-content:center">
    <img src="${logos.horizontal.url}" style="width:${libraryWidth}px"></div>`)
);
await tab.waitForLoadState('load');
await tab.screenshot({ path: png('library-logo.png'), omitBackground: true });
assertTransparent('library-logo.png');

await browser.close();
console.log(`Wrote ${ASSETS.length * 2 + 3} PNGs to ${OUT}`);
console.table(layout);
