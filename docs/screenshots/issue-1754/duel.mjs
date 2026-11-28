// Two-client drive of the crater duel (#1754). Development evidence only.
// Usage: node .dev-loop/duel.mjs <outDir> [--headed --channel chrome]
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
let pw;
try { pw = require(`${root}/playwright/index.js`); } catch { pw = require(`${root}/playwright-core/index.js`); }
const { chromium } = pw;

const out = process.argv[2] ?? '.dev-loop/duel';
mkdirSync(out, { recursive: true });
const headed = process.argv.includes('--headed');
const ci = process.argv.indexOf('--channel');
const channel = ci === -1 ? undefined : process.argv[ci + 1];
const BASE = 'http://localhost:5173/?study=free-water&seats=2';

const browser = await chromium.launch({
  headless: !headed,
  channel,
  args: ['--use-angle=default', '--ignore-gpu-blocklist'],
});
const errors = [];
async function seat(name, url) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${name}: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(url);
  return page;
}
let n = 0;
async function shot(page, name) {
  const path = `${out}/${String(++n).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path });
  console.log(`shot: ${path}`);
}
const probe = (page) => page.evaluate(() => window.__perspectiveProbe?.());

const a = await seat('A', BASE);
await a.waitForSelector('.lobby-code-value', { timeout: 45000 });
const code = (await a.textContent('.lobby-code-value')).trim();
console.log(`room ${code}`);
const b = await seat('B', `${BASE}&room=${encodeURIComponent(code)}`);
await b.waitForSelector('.lobby', { timeout: 45000 });
await a.waitForTimeout(800);
await shot(a, 'lobby-A');
await a.click('.lobby-ready');
await a.waitForTimeout(800);
await shot(a, 'lobby-A-ready-alone');
await b.click('.lobby-ready');
await Promise.all([
  a.waitForSelector('.lobby', { state: 'detached', timeout: 30000 }),
  b.waitForSelector('.lobby', { state: 'detached', timeout: 30000 }),
]);
await a.waitForTimeout(8000);
await shot(a, 'opening-A');
await shot(b, 'opening-B');

const readings = {};
readings.openingA = await probe(a);
readings.openingB = await probe(b);

// Frame each page's own camera on a world point, low enough to see the column.
async function look(page, x, z, distance, aim) {
  await page.evaluate(([x, z, d, aim]) => window.__perspectiveCamera(x, z, d, aim), [x, z, distance, aim]);
  await page.waitForTimeout(1500);
}

await look(a, 2250, 2125, 1400, { pitchDeg: 35, yawDeg: 0, focusDepthM: 300 });
await a.mouse.click(720, 450);
await a.waitForTimeout(600);
await shot(a, 'A-select-over-pocket');
await a.keyboard.press('KeyP');
await a.waitForTimeout(2500);
await shot(a, 'A-after-ping');
readings.afterPingA = await probe(a);
await look(b, 2250, 2375, 1400, { pitchDeg: 35, yawDeg: 180, focusDepthM: 2000 });
await b.mouse.click(720, 450);
await b.waitForTimeout(1500);
await shot(b, 'B-sub-in-pocket');
await a.keyboard.press('KeyC');
await a.waitForTimeout(2000);
await shot(a, 'A-charge-dropped');
await b.waitForTimeout(1000);
await shot(b, 'B-hears-charge');

// The Cruiser staged over B's Bastion, both seen from each side.
await look(a, 3250, 2250, 1600, { pitchDeg: 20, yawDeg: 90, focusDepthM: 1100 });
await shot(a, 'A-cruiser-over-enemy-bastion');
await look(b, 3250, 2250, 1600, { pitchDeg: 20, yawDeg: 90, focusDepthM: 1100 });
await shot(b, 'B-own-bastion-contact-above');
readings.end = { a: await probe(a), b: await probe(b) };

writeFileSync(`${out}/readings.json`, JSON.stringify({ code, readings, errors }, null, 2));
console.log(`errors: ${errors.length}`);
for (const e of errors.slice(0, 10)) console.log(e);
await browser.close();
