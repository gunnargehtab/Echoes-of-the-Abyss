// A run-game steps module: the Ventfront from the survey dolly, whole and
// centred, and from a 50° oblique over its north-west quarter, HUD hidden.
//
//   VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
//     --url 'http://localhost:5173/?map=ventfront-divide' --out <dir> \
//     --steps docs/screenshots/issue-1106/shoot.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// name, focus x and z in metres, camera distance, pitch in degrees.
const STATIONS = [
  ['survey', 4000, 4000, 18000, 88],
  ['oblique', 2600, 2600, 7000, 50],
];

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked > 0);
  await page.waitForTimeout(7000); // GLBs swap in over the baked sprites
  await page.evaluate(() => {
    [...document.querySelectorAll('canvas')]
      .slice(1)
      .forEach((c) => (c.style.visibility = 'hidden'));
    document.querySelectorAll('body *:not(canvas)').forEach((el) => {
      if (!el.querySelector('canvas')) el.style.visibility = 'hidden';
    });
  });
  const readings = [];
  let dir;
  for (const [name, x, z, distance, pitchDeg] of STATIONS) {
    await page.evaluate(
      ({ x, z, distance, pitchDeg }) =>
        window.__perspectiveCamera(x, z, distance, { yawDeg: 0, pitchDeg, focusDepthM: null }),
      { x, z, distance, pitchDeg }
    );
    await page.waitForTimeout(2500);
    dir = dirname(await shot(name));
    readings.push({ name, camera: { x, z, distance, pitchDeg } });
  }
  writeFileSync(join(dir, 'stations.json'), JSON.stringify(readings, null, 2) + '\n');
};
