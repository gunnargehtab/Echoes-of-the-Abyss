// #1539 evidence: a solo match against an AI opponent, the opening fleet
// attack-moved at its base and pinging on the way in, and a frame of the
// enemy Bastion the moment the conn probe reports a live structure track.
// Standalone for #1517's reason: the opponent is added in the lobby, before
// the ready drive.mjs clicks.
// Needs both servers up (.claude/skills/run-game/scripts/dev.sh start).
//
//   node docs/screenshots/issue-1539/structure.mjs <out-dir>
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const OUT = process.argv[2] ?? '/tmp/issue-1539';
mkdirSync(OUT, { recursive: true });
const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
const { chromium } = createRequire(import.meta.url)(`${root}/playwright/index.js`);
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const probe = () => page.evaluate(() => window.__perspectiveProbe());
const look = (x, z, distance, aim = {}) =>
  page.evaluate(({ x, z, distance, aim }) => window.__perspectiveCamera(x, z, distance, aim), {
    x,
    z,
    distance,
    aim,
  });

await page.goto('http://localhost:5173/?map=ventfront-divide');
await page.waitForSelector('.lobby-add-ai', { timeout: 15000 });
await page.$eval('.lobby-add-ai', (b) => b.click());
await page.waitForTimeout(1000);
await page.$eval('.lobby-ready', (b) => b.click());
await page.waitForSelector('.lobby', { state: 'detached', timeout: 20000 });
await page.waitForTimeout(6000);

// Every hull, by marquee, attack-moved at the spawn across the map on the
// same row, where the opponent's Bastion stands.
const C = { x: 720, y: 450 };
const marquee = async () => {
  await page.mouse.move(C.x - 300, C.y - 200);
  await page.mouse.down();
  await page.mouse.move(C.x + 300, C.y + 200, { steps: 6 });
  await page.mouse.up();
};
await marquee();
const home = (await probe()).ownCentre;
const W = 8000;
const base = { x: home.x < W / 2 ? W - 1200 : 1200, z: home.z };
await look(base.x, base.z, 1400);
await page.waitForTimeout(300);
await page.keyboard.press('KeyW');
await page.waitForTimeout(300);
await page.mouse.click(C.x, C.y);

// Park the camera over the base, then ping from whatever of the fleet is in
// frame every so often. A ping's reveal lasts three seconds and a camera move
// costs seconds here, so the frame is taken where the camera already is, the
// moment the probe reports a live structure track.
await look(base.x, base.z, 2200);
const deadline = Date.now() + 9 * 60_000;
let found = null;
for (let i = 0; Date.now() < deadline; i++) {
  const p = await probe();
  if (p.structureTracks > 0) {
    found = p;
    await page.screenshot({ path: `${OUT}/structure-track.png` });
    break;
  }
  if (i % 4 === 3) {
    await marquee();
    await page.keyboard.press('KeyP');
    await page.waitForTimeout(800);
    continue;
  }
  await page.waitForTimeout(2000);
}
if (found === null) {
  console.log('no structure track before the deadline');
  await page.screenshot({ path: `${OUT}/none.png` });
} else {
  console.log(`structure tracks: ${found.structureTracks}, all tracks: ${found.tracks}`);
  const after = await probe();
  console.log(`after the frame: structure tracks ${after.structureTracks}, tracks ${after.tracks}`);
}
await browser.close();
