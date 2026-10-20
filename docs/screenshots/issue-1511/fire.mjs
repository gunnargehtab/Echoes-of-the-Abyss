// #1511 evidence: a solo match against an AI opponent, the opening fleet sent
// into its base, and frames taken the moment the probe reports a live shot
// from an own gun. Adapted from docs/screenshots/issue-1510/hit.mjs, and
// standalone rather than a drive.mjs --steps module for its reason: the
// opponent is added in the lobby, before the ready that drive.mjs clicks.
// Needs both servers up (.claude/skills/run-game/scripts/dev.sh start).
//
//   node docs/screenshots/issue-1511/fire.mjs <out-dir>
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const OUT = process.argv[2] ?? '/tmp/issue-1511';
mkdirSync(OUT, { recursive: true });
const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
const { chromium } = createRequire(import.meta.url)(`${root}/playwright/index.js`);
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const probe = () => page.evaluate(() => window.__perspectiveProbe());
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
await page.mouse.click(C.x, C.y, { button: 'right' });

// Sail in until the first shot, then stop: SwiftShader takes seconds a frame
// in the fight, and a hull at 70 m/s leaves the frame between aiming and the
// shot. Held, the guns keep firing where the camera points. Every pass is
// shot, and the frames in which a shot's particles are alive are kept.
const deadline = Date.now() + 8 * 60_000;
let taken = 0;
let held = false;
while (Date.now() < deadline && taken < 4) {
  const p = await probe();
  if (!held) {
    if (p.shots > 0) {
      await page.keyboard.press('KeyX');
      held = true;
    } else if (p.ownCentre !== null) {
      await look(p.ownCentre.x, p.ownCentre.z, 1600);
    }
    continue;
  }
  if (p.shotAt === null) continue;
  await look(p.shotAt.x, p.shotAt.z, 450, p.shotAt.depthM);
  const file = `${OUT}/frame.png`;
  await page.screenshot({ path: file });
  const after = await probe();
  if (after.shotParticles > 0) {
    console.log(`fire-${taken}`, {
      shots: after.shots,
      shotParticles: after.shotParticles,
      recoiling: after.recoiling,
      at: after.shotAt,
    });
    // The frame already taken: another screenshot lands seconds later.
    copyFileSync(file, `${OUT}/fire-${taken}.png`);
    taken++;
  }
}
const end = await probe();
console.log('end', { shots: end.shots, shotParticles: end.shotParticles });
await browser.close();
if (taken === 0) {
  console.error('no shot inside the deadline');
  process.exit(1);
}
