// #1132: a click is a point in the water. One hull, driven with the player's
// own mouse and keys: the card with no Dive, Rise or Follow, the left + right
// drag lifting the camera's focus into the column, Alt's preview of the click,
// a right click into open water that the hull then takes the depth of, a
// second leg queued at another depth, and a click on the ground that follows it.
//
//   node .claude/skills/run-game/scripts/drive.mjs --out <dir> \
//     --steps docs/screenshots/issue-1132/drive.mjs
//
// The first client takes the Consortium; its opening hulls stand by the base,
// on ground about 700 m down. Writes readings.json beside the frames: the
// probe's focus after the drag and after the wheel notch, and the hull's
// depth once a second after each order.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const W = Number(process.env.VIEW_W ?? 1440);
const H = Number(process.env.VIEW_H ?? 900);
const CENTRE = { x: W / 2, y: H / 2 };
/** Where the left + right drag is gripped: open water, clear of the HUD. */
const GRIP = { x: CENTRE.x + 260, y: CENTRE.y + 60 };

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked > 0);
  await page.waitForTimeout(6000);
  const camera = (x, z, d, aim) =>
    page.evaluate(({ x, z, d, aim }) => window.__perspectiveCamera(x, z, d, aim), { x, z, d, aim });
  const probe = () => page.evaluate(() => window.__perspectiveProbe());
  const units = () => page.evaluate(() => window.__perspectiveLamps().units);
  const readings = {};

  /** The left + right drag, `dy` pixels down: 5 m of focus rise a pixel. */
  const drag = async (dy) => {
    await page.mouse.move(GRIP.x, GRIP.y);
    await page.mouse.down({ button: 'right' });
    await page.mouse.down({ button: 'left' });
    await page.mouse.move(GRIP.x, GRIP.y + dy, { steps: 10 });
    await page.mouse.up({ button: 'left' });
    await page.mouse.up({ button: 'right' });
    await page.waitForTimeout(500);
    return (await probe()).focus;
  };
  const track = async (id, seconds) => {
    const out = [];
    for (let s = 1; s <= seconds; s++) {
      await page.waitForTimeout(1000);
      const now = (await units()).find((unit) => unit.id === id);
      out.push({ s, xM: Math.round(now.xM), zM: Math.round(now.zM), depthM: Math.round(now.depthM) });
    }
    return out;
  };

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

  // 40 px down raises the focus 200 m off the seabed.
  readings.raised = await drag(40);
  await shot('focus-raised');

  // Alt over open water: the ribbon marks the depth the click would order and
  // says what the climb costs.
  // Open water well south-east of the base, far enough that the leg queued
  // behind it is still waiting when the frame is taken. Not over a structure:
  // a hull is pushed off a footprint in plan and never reaches a point over
  // one, whatever its depth.
  const first = { x: CENTRE.x + 560, y: CENTRE.y + 170 };
  await page.mouse.move(first.x, first.y);
  await page.keyboard.down('AltLeft');
  await page.waitForTimeout(700);
  await shot('alt-preview');
  await page.keyboard.up('AltLeft');

  // The click, given on release, and at once a second leg queued behind it at
  // a shallower focus — one notch of `Shift` + wheel, the one-button route,
  // 150 m up. The queued leg's ring stands at its own depth on its plumb line.
  await page.mouse.click(first.x, first.y, { button: 'right' });
  const second = { x: CENTRE.x - 250, y: CENTRE.y - 120 };
  await page.keyboard.down('ShiftLeft');
  await page.mouse.wheel(0, -100);
  await page.mouse.click(second.x, second.y, { button: 'right' });
  await page.keyboard.up('ShiftLeft');
  await shot('queued-leg');
  readings.raisedAgain = (await probe()).focus;
  readings.legs = await track(hull.id, 24);

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
  readings.onGround = await track(hull.id, 20);
  await shot('following-floor');

  writeFileSync(join(dir, 'readings.json'), `${JSON.stringify(readings, null, 2)}\n`);
};
