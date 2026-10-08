// #1132: a click is a point in the water. One hull, driven with the player's
// own mouse and keys: the card with no Dive, Rise or Follow, the left + right
// drag lifting the camera's focus into the column, Alt's preview of the click,
// a right click into open water that the hull then takes the depth of, and a
// click on the ground that follows it.
//
//   node .claude/skills/run-game/scripts/drive.mjs --out <dir> \
//     --steps docs/screenshots/issue-1132/drive.mjs
//
// The first client takes the Consortium; its opening hulls stand by the base.
// Writes readings.json beside the frames: the probe's focus after the drag and
// each hull's depth, sampled once a second, after each order.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const W = Number(process.env.VIEW_W ?? 1440);
const H = Number(process.env.VIEW_H ?? 900);
const CENTRE = { x: W / 2, y: H / 2 };

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked > 0);
  await page.waitForTimeout(6000);
  const camera = (x, z, d, aim) =>
    page.evaluate(({ x, z, d, aim }) => window.__perspectiveCamera(x, z, d, aim), { x, z, d, aim });
  const probe = () => page.evaluate(() => window.__perspectiveProbe());
  const units = () => page.evaluate(() => window.__perspectiveLamps().units);
  const readings = {};

  // One hull that is not the harvester, selected from straight above with the
  // focus at its own depth, so the viewport's centre is the hull.
  const hull = (await units()).find((unit) => unit.name !== 'Harvester');
  if (hull === undefined) throw new Error('no hull to drive');
  readings.hull = { id: hull.id, name: hull.name, startDepthM: Math.round(hull.depthM) };
  await camera(hull.xM, hull.zM, 900, { pitchDeg: 88, yawDeg: 0, focusDepthM: hull.depthM });
  await page.waitForTimeout(600);
  await page.mouse.click(CENTRE.x, CENTRE.y);
  await page.waitForTimeout(400);

  // The home frame over it: the card, and the ribbon's focus tick on the seabed.
  await camera(hull.xM, hull.zM, 2600, { pitchDeg: 55, yawDeg: 0, focusDepthM: null });
  await page.waitForTimeout(1200);
  const dir = dirname(await shot('home-selected'));
  readings.home = (await probe()).focus;

  // The left + right drag: 120 px down raises the focus 600 m (5 m a pixel).
  const grip = { x: CENTRE.x + 260, y: CENTRE.y + 60 };
  await page.mouse.move(grip.x, grip.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.down({ button: 'left' });
  await page.mouse.move(grip.x, grip.y + 120, { steps: 12 });
  await page.mouse.up({ button: 'left' });
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(800);
  readings.raised = (await probe()).focus;
  await shot('focus-raised');

  // Alt over open water: the ribbon marks the depth the click would order and
  // says what the climb or the dive costs.
  const water = { x: CENTRE.x + 180, y: CENTRE.y - 40 };
  await page.mouse.move(water.x, water.y);
  await page.keyboard.down('AltLeft');
  await page.waitForTimeout(700);
  await shot('alt-preview');
  await page.keyboard.up('AltLeft');

  // The click, given on release: the ring stands at the depth, on its plumb line.
  await page.mouse.click(water.x, water.y, { button: 'right' });
  await page.waitForTimeout(300);
  await shot('ordered-in-water');
  const track = async (seconds) => {
    const out = [];
    for (let s = 1; s <= seconds; s++) {
      await page.waitForTimeout(1000);
      const now = (await units()).find((unit) => unit.id === hull.id);
      out.push({ s, xM: Math.round(now.xM), zM: Math.round(now.zM), depthM: Math.round(now.depthM) });
    }
    return out;
  };
  readings.inWater = await track(25);
  const there = (await units()).find((unit) => unit.id === hull.id);
  await camera(there.xM, there.zM, 1400, { pitchDeg: 18, yawDeg: 0, focusDepthM: there.depthM });
  await page.waitForTimeout(1200);
  await shot('arrived-low');

  // Home puts the focus back on the seabed, so a click on the ground is a move
  // onto it, and the hull follows the floor there: the card says so.
  await page.keyboard.press('Home');
  await camera(there.xM, there.zM, 2600, { pitchDeg: 55, yawDeg: 0, focusDepthM: null });
  await page.waitForTimeout(800);
  const ground = { x: CENTRE.x - 200, y: CENTRE.y + 80 };
  await page.mouse.click(ground.x, ground.y, { button: 'right' });
  await page.waitForTimeout(300);
  await shot('ordered-on-ground');
  readings.onGround = await track(20);
  await shot('following-floor');

  writeFileSync(join(dir, 'readings.json'), `${JSON.stringify(readings, null, 2)}\n`);
};
