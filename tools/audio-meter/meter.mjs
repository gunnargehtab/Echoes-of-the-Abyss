/**
 * What the mix measures — docs/audio-direction.md §12's loudness target, read
 * back off the real graph instead of assumed of it (#663).
 *
 * Not an npm workspace and not a gate. Run it directly:
 *
 *   node tools/audio-meter/meter.mjs
 *   node tools/audio-meter/meter.mjs --case self-bed:drive-hum --seconds 30
 *
 * §12 states "-18 LUFS integrated, -1 dBTP" and #661 gave the graph the second
 * of those and only the second. A true-peak ceiling is a promise about the
 * loudest instant; the integrated figure is a promise about the other twenty
 * minutes, and it is the one a player reaching for the volume control is
 * responding to. Nothing measured it, so this does.
 *
 * It needs a real Web Audio implementation, which Node has none of, so it
 * drives Chromium exactly as tools/hull-maps and the hull-intake bake do — and
 * for the same reason they do. The production audio classes are bundled and
 * rendered through `OfflineAudioContext`; the metering is Node's
 * (loudness.mjs, spectrum.mjs), so the numbers are reproducible arithmetic
 * over samples rather than anything the browser decided.
 *
 * The per-layer readings are taken at the **bus**, before MASTER_GAIN. A
 * reading at the output says whether the mix is hot; a reading at the bus says
 * which layer made it hot, and only the second is something to act on. The
 * master column applies the gain arithmetically so one render gives both.
 */

import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { RATE, integratedLufs, samplePeakDb, truePeakDb } from './loudness.mjs';
import { BAND_LABELS, bandShares } from './spectrum.mjs';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');

/**
 * SPEC — docs/audio-direction.md §12's integrated target, and the fixed master
 * gain the engine holds it with (engine.ts MASTER_GAIN). Both live here as
 * read-only references so the report can say how far off a layer is without
 * this file becoming a second place either number is decided.
 */
const TARGET_LUFS = -18;
const MASTER_GAIN = 0.5;

/** Long enough for the gated mean to be a mean. Beds are slow. */
const DEFAULT_SECONDS = 20;

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at === -1 || at + 1 >= args.length ? fallback : args[at + 1];
};
const only = flag('case', null);
const seconds = Number(flag('seconds', DEFAULT_SECONDS));

// --- Playwright, the same resolution dance the other browser tools do -------
function loadPlaywright() {
  const candidates = ['playwright', 'playwright-core'];
  try {
    const globalRoot = execSync('npm root -g', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (globalRoot) {
      candidates.push(
        `${globalRoot}/playwright/index.js`,
        `${globalRoot}/playwright-core/index.js`
      );
    }
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

// --- bundle the production audio modules for the page ----------------------
// An IIFE rather than a module, so the page can be a plain script tag and the
// server does not have to resolve a module graph. @echoes/shared is a built
// workspace: run `npm run build:shared` first if this cannot find it.
const bundle = await build({
  entryPoints: [join(here, 'probe.mjs')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'chrome120',
  write: false,
  absWorkingDir: repo,
  resolveExtensions: ['.ts', '.tsx', '.mjs', '.js'],
  loader: { '.ts': 'ts' },
});
const probeJs = bundle.outputFiles[0].text;

const MIME = { '.html': 'text/html', '.js': 'text/javascript' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/probe.js') {
    res.writeHead(200, { 'Content-Type': MIME['.js'] }).end(probeJs);
    return;
  }
  const file = url.pathname === '/' ? join(here, 'page.html') : join(here, url.pathname.slice(1));
  if (!file.startsWith(here) || !existsSync(file)) {
    res.writeHead(404).end('not found');
    return;
  }
  res
    .writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'text/plain' })
    .end(readFileSync(file));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const port = server.address().port;

const { chromium } = loadPlaywright();
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const rows = [];
let failed = false;
try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => {
    console.error(`page error: ${error.message}`);
    failed = true;
  });
  await page.goto(`http://127.0.0.1:${port}/`);
  const names = await page.evaluate(() => globalThis.audioMeter.cases());
  const wanted = only === null ? names : names.filter((name) => name === only);
  if (wanted.length === 0) {
    console.error(`no such case: ${only}\ncases: ${names.join(', ')}`);
    process.exitCode = 1;
  }

  for (const name of wanted) {
    const channels = await page.evaluate(
      ([caseName, length]) => globalThis.audioMeter.render(caseName, length),
      [name, seconds]
    );
    const data = channels.map((channel) => {
      const bytes = Buffer.from(channel, 'base64');
      const floats = new Float32Array(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
      );
      return Float64Array.from(floats);
    });
    rows.push({
      name,
      lufs: integratedLufs(data),
      peak: samplePeakDb(data),
      truePeak: truePeakDb(data),
      bands: bandShares(data, RATE),
    });
  }
} finally {
  await browser.close();
  server.close();
}

// --- the report ------------------------------------------------------------
const db = (value) => (Number.isFinite(value) ? value.toFixed(1).padStart(7) : '      -');
const pct = (value) => `${(value * 100).toFixed(0).padStart(3)}%`;
const master = 20 * Math.log10(MASTER_GAIN);

console.log(`\nrendered ${seconds}s at ${RATE} Hz, per layer, at the bus (pre-master)\n`);
console.log(
  `${'layer'.padEnd(28)}${'LUFS'.padStart(7)}${'@master'.padStart(9)}${'peak'.padStart(8)}` +
    `${'dBTP'.padStart(8)}   ${BAND_LABELS.map((label) => label.padStart(6)).join(' ')}`
);
for (const row of rows) {
  console.log(
    `${row.name.padEnd(28)}${db(row.lufs)}${db(row.lufs + master).padStart(9)}${db(row.peak)}` +
      `${db(row.truePeak)}   ${row.bands.map((share) => pct(share).padStart(6)).join(' ')}`
  );
}
console.log(
  `\ntarget: ${TARGET_LUFS} LUFS integrated at the output (§12). The @master column is the ` +
    `layer\nalone through MASTER_GAIN (${master.toFixed(1)} dB); a layer at or above the target ` +
    `on its own leaves\nnothing for the rest of the mix, let alone for the exposure strike §12 ` +
    `reserves headroom for.\n`
);
if (failed) process.exitCode = 1;
