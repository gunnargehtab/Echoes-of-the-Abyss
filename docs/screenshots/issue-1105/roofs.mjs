// #1105: the roof over the Kelp Labyrinth's west wall tunnel, from above,
// from the north mouth at a low pitch, and with one of the player's own hulls
// inside it, where the roof turns to glass.
//
//   node .claude/skills/run-game/scripts/drive.mjs \
//     --url 'http://localhost:5173/?map=kelp-labyrinth' --out <dir> \
//     --steps docs/screenshots/issue-1105/roofs.mjs
//
// Seat 0 spawns in the north-west corner (900, 900). The tunnel runs x 250 to
// 1,000 and y 2,000 to 6,000 under a 700 m ceiling over an 1,800 m floor.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const TUNNEL = { x: 625, north: 2000 };
const CENTRE = { x: 720, y: 450 };

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked > 0);
  await page.waitForTimeout(6000);
  const camera = (x, z, d, aim) =>
    page.evaluate(({ x, z, d, aim }) => window.__perspectiveCamera(x, z, d, aim), { x, z, d, aim });
  const units = () => page.evaluate(() => window.__perspectiveLamps().units);
  const log = [];
  let dir;

  // From above: the ridge, its route line, and the scope's line.
  await camera(TUNNEL.x, 2900, 1800, { pitchDeg: 55, yawDeg: 0, focusDepthM: null });
  await page.waitForTimeout(1500);
  dir = dirname(await shot('ridge-home'));

  // From the east, low: the wall hanging over open water along its length.
  await camera(TUNNEL.x, 3200, 1400, { pitchDeg: 12, yawDeg: 90, focusDepthM: 1000 });
  await page.waitForTimeout(1500);
  await shot('side-low');

  // From the north, low, into the north mouth: the lintel and the hole.
  await camera(TUNNEL.x, TUNNEL.north, 900, { pitchDeg: 14, yawDeg: 180, focusDepthM: 1100 });
  await page.waitForTimeout(1500);
  await shot('mouth-low');

  // A hull inside: select one, dive it, order it into the tunnel.
  const [unit] = await units();
  await camera(unit.xM, unit.zM, 700, { pitchDeg: 88, yawDeg: 0, focusDepthM: unit.depthM });
  await page.waitForTimeout(800);
  await page.mouse.click(CENTRE.x, CENTRE.y);
  for (let i = 0; i < 2; i++) {
    const now = (await units()).find((u) => u.id === unit.id);
    if (now.depthM >= 900) break;
    await page.keyboard.press('KeyD');
    await page.waitForTimeout(12000);
  }
  log.push({ dived: (await units()).find((u) => u.id === unit.id) });
  await camera(TUNNEL.x, 2600, 700, { pitchDeg: 88, yawDeg: 0, focusDepthM: null });
  await page.waitForTimeout(800);
  await page.mouse.click(CENTRE.x, CENTRE.y, { button: 'right' });
  let inside = null;
  for (let t = 0; t < 60 && inside === null; t++) {
    await page.waitForTimeout(1000);
    const now = (await units()).find((u) => u.id === unit.id);
    if (now.zM > TUNNEL.north + 150 && now.xM < 1000 && now.depthM >= 700) inside = now;
  }
  log.push({ inside });
  const at = inside ?? (await units()).find((u) => u.id === unit.id);
  await camera(at.xM, at.zM, 1400, { pitchDeg: 55, yawDeg: 0, focusDepthM: null });
  await page.waitForTimeout(1500);
  await shot('inside-glass');

  writeFileSync(join(dir, 'roofs.json'), JSON.stringify(log, null, 2) + '\n');
  console.log(JSON.stringify(log));
};
