// #1517 evidence: a solo match against an AI opponent, the opening fleet sent
// into its base, and frames taken the moment the chart probe reports a hit on
// a live enemy track. Standalone rather than a drive.mjs --steps module,
// because the opponent is added in the lobby, before the ready that drive.mjs
// clicks.
// Needs both servers up (.claude/skills/run-game/scripts/dev.sh start).
//
//   node docs/screenshots/issue-1517/hit.mjs <out-dir>
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const OUT = process.argv[2] ?? '/tmp/issue-1517';
mkdirSync(OUT, { recursive: true });
const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
const { chromium } = createRequire(import.meta.url)(`${root}/playwright/index.js`);
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const probe = () => page.evaluate(() => window.__perspectiveProbe());
const chart = () => page.evaluate(() => window.__chartProbe?.() ?? null);
const look = (x, z, distance, focusDepthM = null, pitchDeg = 55) =>
  page.evaluate(
    ({ x, z, distance, focusDepthM, pitchDeg }) =>
      window.__perspectiveCamera(x, z, distance, { pitchDeg, focusDepthM }),
    { x, z, distance, focusDepthM, pitchDeg }
  );

await page.goto('http://localhost:5173/?map=ventfront-divide');
// Clicked in the page: SwiftShader keeps the main thread busy enough that a
// Playwright click's post-action wait times out on a click that landed.
await page.waitForSelector('.lobby-add-ai', { timeout: 15000 });
await page.$eval('.lobby-add-ai', (b) => b.click());
await page.waitForTimeout(1000);
await page.$eval('.lobby-ready', (b) => b.click());
await page.waitForSelector('.lobby', { state: 'detached', timeout: 20000 });
await page.waitForTimeout(6000);

// Every hull, by marquee, ordered at the nearest other spawn on the map.
const C = { x: 720, y: 450 };
await page.mouse.move(C.x - 300, C.y - 200);
await page.mouse.down();
await page.mouse.move(C.x + 300, C.y + 200, { steps: 6 });
await page.mouse.up();
const home = (await probe()).ownCentre;
const W = 8000;
const target = { x: home.x < W / 2 ? W - 1200 : 1200, z: home.z };
await look(target.x, target.z, 1400);
await page.waitForTimeout(300);
// An attack-move (W, then the point), so the fleet fights what it meets
// rather than sailing past it into the base's guns.
await page.keyboard.press('KeyW');
await page.waitForTimeout(300);
await page.mouse.click(C.x, C.y);

// Follow the fleet in until the first hit on a track, then park the camera
// where the last one landed: a fight stays put, and moving the camera costs a
// frame, which costs seconds here, longer than a hit lives. A frame's draw
// reads the clock when it starts, so a hit a quarter to half a second old
// just before the shot is in it, spread out, however long SwiftShader then
// takes to finish the frame.
const deadline = Date.now() + 8 * 60_000;
let taken = 0;
let parked = null;
let shotAt = null;
let nextNote = 0;
while (Date.now() < deadline && taken < 4) {
  const c = await chart();
  const at = c?.trackHitAt ?? null;
  if (
    at !== null &&
    parked !== null &&
    Math.hypot(at.x - parked.x, at.y - parked.y) < 250 &&
    c.trackHitAgeMs > 250 &&
    c.trackHitAgeMs < 600 &&
    at.atMs !== shotAt
  ) {
    shotAt = at.atMs;
    await page.screenshot({ path: `${OUT}/hit-${taken}.png` });
    console.log(`hit-${taken}`, {
      ageMs: Math.round(c.trackHitAgeMs),
      at,
      hits: c.trackHits,
      screen: c.trackHitScreen,
    });
    taken++;
    continue;
  }
  if (at !== null) {
    if (parked === null || Math.hypot(at.x - parked.x, at.y - parked.y) >= 250) {
      parked = at;
      await look(at.x, at.y, 650, at.depthM);
    }
  } else {
    const p = await probe();
    if (p.ownCentre !== null) await look(p.ownCentre.x, p.ownCentre.z, 1800);
  }
  if (Date.now() > nextNote) {
    nextNote = Date.now() + 30_000;
    console.log('waiting', { parked, chart: c });
  }
}
console.log('end', await chart());
await page.screenshot({ path: `${OUT}/end.png` });
await browser.close();
if (taken === 0) {
  console.error('no track hit inside the deadline');
  process.exit(1);
}
