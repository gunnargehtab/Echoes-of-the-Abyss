/**
 * Headless driver for the Echoes of the Abyss client.
 *
 * An agent in a container cannot open a browser window, so "running the game"
 * means pointing a headless Chromium at the Vite dev server and proving, with
 * screenshots, that a match actually rendered. This script owns the awkward
 * parts — resolving Playwright, knowing when the client is really connected,
 * failing loudly when the backend is down — so a caller only has to describe
 * the interaction it cares about.
 *
 * Usage:
 *   node .claude/skills/run-game/scripts/drive.mjs --out <dir> [--steps <file>]
 *
 * With no --steps it runs the default smoke: connect, select a unit, ping.
 * A steps file is an ES module with `export default async ({ page, shot }) => {...}`.
 */

import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);

/**
 * Playwright is usually a global install here, not a repo dependency, and it
 * ships as CommonJS — `import { chromium } from 'playwright'` fails on both
 * counts (NODE_PATH is ignored for ESM, and there is no named export). Going
 * through require() sidesteps both problems.
 */
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
    // npm missing or slow; the bare specifiers above may still resolve.
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
      'themselves are already at PLAYWRIGHT_BROWSERS_PATH, so no `playwright install` is needed.'
  );
}

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 || i === process.argv.length - 1 ? fallback : process.argv[i + 1];
}

// Default outside the repo: screenshots are throwaway diagnostics, and a
// default inside the working tree shows up as untracked noise in every diff.
const OUT = resolve(arg('out', '/tmp/run-game'));
const URL = arg('url', 'http://localhost:5173/');
const STEPS = arg('steps');

mkdirSync(OUT, { recursive: true });

// Fail fast and specifically: a dead dev server otherwise surfaces as an
// opaque 45s selector timeout.
for (const [label, probe] of [
  ['frontend (vite)', URL],
  ['backend (colyseus)', 'http://localhost:3000/'],
]) {
  const res = await fetch(probe).catch(() => null);
  if (res === null) {
    console.error(
      `${label} is not responding at ${probe}.\n` +
        'Start both with:  npm run dev   (from the repo root)'
    );
    process.exit(1);
  }
}

const { chromium } = loadPlaywright();
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

let shotIndex = 0;
/** Screenshot helper: numbers files in call order so the sequence reads back. */
const shot = async (name) => {
  const file = `${OUT}/${String(++shotIndex).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: file });
  console.log(`shot: ${file}`);
  return file;
};

await page.goto(URL, { waitUntil: 'domcontentloaded' });

/**
 * The client auto-joins — there is no menu and no login. It shows a
 * ".game-overlay" until the room assigns it a slot, so that element going away
 * is the only trustworthy "we are in a match" signal. Polling the port only
 * proves Vite is serving; waiting for the canvas only proves Pixi mounted.
 */
// Both branches carry their own rejection handler. Whichever loses the race
// still rejects when its 45s timeout expires, and an unhandled rejection is
// fatal in modern Node — so a long --steps run would otherwise crash right
// after a perfectly successful connect.
const outcome = await Promise.race([
  page.waitForSelector('.game-overlay', { state: 'detached', timeout: 45000 }).then(
    () => 'ok',
    () => 'timeout'
  ),
  page.waitForSelector('.game-overlay h2:text-is("No signal")', { timeout: 45000 }).then(
    () => 'error',
    () => 'timeout'
  ),
]);
if (outcome !== 'ok') {
  await shot('connect-failed');
  console.error(`Client never joined a match (${outcome}). Is the backend up on :3000?`);
  await browser.close();
  process.exit(1);
}

await page.waitForSelector('canvas', { timeout: 15000 });
// Let a few 5 Hz Echo Layer passes land so terrain and contacts are populated.
await page.waitForTimeout(4000);

// A throwing --steps module must not take the browser down with it: an
// unhandled rejection here would skip browser.close() and strand a headless
// Chromium, which is exactly the kind of leak this skill exists to avoid.
let stepsError = null;
try {
  if (STEPS !== null) {
    const mod = await import(pathToFileURL(resolve(STEPS)).href);
    if (typeof mod.default !== 'function') {
      throw new TypeError(`${STEPS} must default-export an async function ({ page, shot }) => {}`);
    }
    await mod.default({ page, shot });
  } else {
    await shot('connected');

    // Left click selects the nearest owned entity, so clicking near the escort
    // subs south-west of the hub picks one up.
    await page.mouse.click(655, 484);
    await page.waitForTimeout(800);
    await shot('selected');

    // P is active sonar, and it is the whole game in one keystroke: it lights
    // up everything within 900 m and tells everything within 2,400 m where you
    // are. Watch SIG in the top-left jump and the bar turn red.
    await page.keyboard.press('KeyP');
    await page.waitForTimeout(700);
    await shot('ping');

    // The wavefront expands and own-SIG decays back down over the next seconds.
    await page.waitForTimeout(2500);
    await shot('after-ping');
  }
} catch (err) {
  stepsError = err;
  // Capture whatever was on screen when it broke — for a failing interaction
  // that frame is usually the whole diagnosis.
  await shot('steps-failed').catch(() => {});
  console.error(`steps failed: ${err?.stack ?? err}`);
} finally {
  await browser.close();
}

console.log(errors.length ? `console errors:\n${errors.join('\n')}` : 'console errors: none');
process.exit(stepsError !== null || errors.length ? 1 : 0);
