// #1509 evidence: a solo match against an AI opponent, the opening fleet sent
// into its base, and once a live track is hit, a torpedo launched at it with
// Ctrl+right-click and the launch burst framed. Standalone rather than a
// drive.mjs --steps module, because the opponent is added in the lobby, before
// the ready that drive.mjs clicks. Headed in Edge on a GPU: a SwiftShader frame
// outlasts the 1.5 s burst (docs/screenshots/issue-1517/README.md), which is
// what stopped #1516's frames.
// Needs both servers up (.claude/skills/run-game/scripts/dev.sh start).
//
//   node docs/screenshots/issue-1509/launch.mjs <out-dir>
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { statsFor } from '../../../packages/shared/dist/index.js';

const OUT = process.argv[2] ?? '/tmp/issue-1509';
const CHANNEL = process.env.CHANNEL ?? 'msedge';
mkdirSync(OUT, { recursive: true });

// drive.mjs's lookup: a global install here is sometimes playwright-core alone.
function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
  const candidates = ['playwright', 'playwright-core', `${root}/playwright`];
  for (const c of [...candidates, `${root}/playwright-core`]) {
    try {
      return require(c);
    } catch {
      continue;
    }
  }
  throw new Error('Could not load Playwright');
}

const { chromium } = loadPlaywright();
const browser = await chromium.launch({
  channel: CHANNEL,
  headless: false,
  args: ['--no-sandbox', '--disable-features=CalculateNativeWinOcclusion'],
});
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
await page.waitForSelector('.lobby-add-ai', { timeout: 15000 });
await page.click('.lobby-add-ai');
await page.waitForTimeout(1000);
await page.click('.lobby-ready');
await page.waitForSelector('.lobby', { state: 'detached', timeout: 20000 });
await page.waitForTimeout(6000);
const { renderer } = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return { renderer };
});
console.log('renderer', renderer);

// Every hull, by marquee, attack-moved at the nearest other spawn, as
// docs/screenshots/issue-1517/hit.mjs sends it. The selection stands for the
// launch: Ctrl+right-click fires every selected hull that carries a tube.
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
await page.keyboard.press('KeyW');
await page.waitForTimeout(300);
await page.mouse.click(C.x, C.y);

// Follow the fleet until a gun hits a live track: that track is a Tier-4
// contact the launch can take. Then frame fleet and track together, launch,
// and photograph the burst as it rises and fades over its 1.5 s.
const AFTER_MS = [250, 600, 1000, 1400];
const deadline = Date.now() + 8 * 60_000;
const sets = [];
while (Date.now() < deadline && sets.length < 2) {
  const c = await chart();
  const at = c?.trackHitAt ?? null;
  // The guns also hit fauna on the way in, and a launch at an animal is
  // refused (Match.orderLaunchTorpedo wants another commander's hull), so
  // only a hit near the opponent's spawn is taken as theirs.
  const theirs = at !== null && Math.hypot(at.x - target.x, at.y - target.z) < 1800;
  if (!theirs || c.trackHitAgeMs > 3000) {
    const p = await probe();
    if (p.ownCentre !== null) await look(p.ownCentre.x, p.ownCentre.z, 1800);
    await page.waitForTimeout(500);
    continue;
  }
  // On the track, far enough out that the launchers within gun range of it
  // are in frame too.
  await look(at.x, at.y, 1400, at.depthM);
  await page.waitForTimeout(300);
  const s = (await chart()).trackHitScreen;
  // `visible` is "in front of the camera"; the click also has to land in the
  // conn view, above the HUD's command deck.
  if (s === null || !s.visible || s.x < 0 || s.x > 1440 || s.y < 60 || s.y > 680) continue;
  const before = (await probe()).ordnance;
  // The burst rises at the tube, not at the target: the own tube-carrier
  // nearest the track is the launcher to frame once the order is away.
  const units = (await page.evaluate(() => window.__perspectiveLamps().units)) ?? [];
  const launcher = units
    .filter((u) => statsFor(u.kind).carriesTorpedoes)
    .map((u) => ({ ...u, range: Math.hypot(u.xM - at.x, u.zM - at.y) }))
    .sort((a, b) => a.range - b.range)[0];
  await page.keyboard.down('Control');
  await page.mouse.click(s.x, s.y, { button: 'right' });
  await page.keyboard.up('Control');
  const t0 = Date.now();
  if (launcher !== undefined) await look(launcher.xM, launcher.zM, 600, launcher.depthM);
  const set = {
    at,
    screen: s,
    launcher: launcher && { id: launcher.id, name: launcher.name, rangeM: launcher.range },
    ordnanceBefore: before,
    frames: [],
  };
  for (const ms of AFTER_MS) {
    await page.waitForTimeout(Math.max(0, t0 + ms - Date.now()));
    const file = `${OUT}/launch-${sets.length}-${ms}ms.png`;
    await page.screenshot({ path: file });
    set.frames.push({ file, ms: Date.now() - t0, ordnance: (await probe()).ordnance });
  }
  // Own ordnance in the snapshot rose, so a torpedo left a tube: the set
  // shows a launch rather than a refused order.
  if (!set.frames.some((f) => f.ordnance > before)) {
    console.log('no launch', JSON.stringify(set));
    await page.waitForTimeout(2000);
    continue;
  }
  sets.push(set);
  console.log('launch', JSON.stringify(set));
  // Let the tubes reload and the next hit land before the second set.
  await page.waitForTimeout(6000);
}
writeFileSync(`${OUT}/launch.json`, JSON.stringify({ renderer, sets }, null, 2) + '\n');
await browser.close();
if (sets.length === 0) {
  console.error('no live track was hit inside the deadline');
  process.exit(1);
}
