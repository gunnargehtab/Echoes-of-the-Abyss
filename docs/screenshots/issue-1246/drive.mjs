// #1246: what a mark a metre below the lead hull costs, under Alt. One hull of
// the Consortium's opening, selected from above and lifted to 450 m; the
// camera's focus then a metre below it, so a click anywhere in open water is
// that metre. Read open, then silent, then eleven metres down for the dive.
//
//   node .claude/skills/run-game/scripts/drive.mjs --out <dir> \
//     --steps docs/screenshots/issue-1246/drive.mjs
//
// Writes readings.json beside the frames: the hull, its depth and the focus.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const W = Number(process.env.VIEW_W ?? 1440);
const H = Number(process.env.VIEW_H ?? 900);
const CENTRE = { x: W / 2, y: H / 2 };
/** Open water east of the hull, clear of the HUD and of the base. */
const MARK = { x: CENTRE.x + 300, y: CENTRE.y + 80 };

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked > 0);
  await page.waitForTimeout(6000);
  const camera = (x, z, d, aim) =>
    page.evaluate(({ x, z, d, aim }) => window.__perspectiveCamera(x, z, d, aim), { x, z, d, aim });
  const probe = () => page.evaluate(() => window.__perspectiveProbe());
  const units = () => page.evaluate(() => window.__perspectiveLamps().units);
  const readings = {};

  // One hull that is not the harvester, selected from straight above.
  const hull = (await units()).find((unit) => unit.name !== 'Harvester');
  if (hull === undefined) throw new Error('no hull to drive');
  readings.hull = { id: hull.id, name: hull.name, depthM: hull.depthM };
  await camera(hull.xM, hull.zM, 900, { pitchDeg: 88, yawDeg: 0, focusDepthM: hull.depthM });
  await page.waitForTimeout(600);
  await page.mouse.click(CENTRE.x, CENTRE.y);
  await page.waitForTimeout(400);

  // Lifted clear of the base's plateau first, 700 m down: a mark within 100 m
  // of the seabed follows the floor (docs/ui-ux.md §9), so 601 m over it is a
  // FLOOR mark, not open water. A right click on the focus plane at 450 m.
  await camera(hull.xM, hull.zM, 900, { pitchDeg: 88, yawDeg: 0, focusDepthM: 450 });
  await page.waitForTimeout(600);
  await page.mouse.click(CENTRE.x + 40, CENTRE.y, { button: 'right' });
  for (let s = 0; s < 30; s++) {
    await page.waitForTimeout(1000);
    const now = (await units()).find((unit) => unit.id === hull.id);
    if (Math.abs(now.depthM - 450) < 1) break;
  }
  await page.waitForTimeout(2000);

  /** Alt held over the mark with the focus `metres` below the hull. */
  const preview = async (metres, name) => {
    const now = (await units()).find((unit) => unit.id === hull.id);
    await camera(now.xM, now.zM, 2600, {
      pitchDeg: 55,
      yawDeg: 0,
      focusDepthM: now.depthM + metres,
    });
    await page.waitForTimeout(800);
    await page.mouse.move(MARK.x, MARK.y);
    await page.keyboard.down('AltLeft');
    await page.waitForTimeout(700);
    readings[name] = { hullDepthM: now.depthM, focus: (await probe()).focus };
    await shot(name);
    await page.keyboard.up('AltLeft');
    await page.waitForTimeout(300);
  };

  // Open: a metre down snaps, charges nothing, and reads LEVEL.
  await preview(1, 'level');
  // Silent: the same metre breaks the silence, and the readout names it.
  await page.keyboard.press('Space');
  await page.waitForTimeout(1500);
  await preview(1, 'breaks-silence');
  // Eleven metres down is a dive, at the descent's SIG and in its colour.
  await preview(11, 'dive');

  const dir = dirname(await shot('end'));
  writeFileSync(join(dir, 'readings.json'), `${JSON.stringify(readings, null, 2)}\n`);
};
