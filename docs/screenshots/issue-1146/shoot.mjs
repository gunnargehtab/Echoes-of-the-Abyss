// A run-game steps module: a mission map from the survey dolly, whole and
// centred, and from a 50° oblique over its centre, HUD hidden. The map's size
// comes from SHOOT_MAP ("widthM,heightM"), so one module frames every map of
// #1139.
//
//   SHOOT_MAP=6000,4000 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
//     --url 'http://localhost:5173/?mission=ledger-prospect' --out <dir> \
//     --steps docs/screenshots/issue-1146/shoot.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const [widthM, heightM] = (process.env.SHOOT_MAP ?? '5000,4000').split(',').map(Number);
const span = Math.max(widthM, heightM);

// name, focus x and z in metres, camera distance, pitch in degrees. The
// survey distance is 1.6 times the map's longer side, which fills a
// 1080p frame.
const STATIONS = [
  ['survey', widthM / 2, heightM / 2, Math.round(span * 1.6), 88],
  ['oblique', widthM / 2, heightM / 2, Math.round(span * 1.1), 50],
];

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked > 0);
  await page.waitForTimeout(7000); // GLBs swap in over the baked sprites
  // Hidden again before every frame: a mission line can arrive after the
  // first pass and draw its panel over the map.
  const hideHud = () =>
    page.evaluate(() => {
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
    await hideHud();
    dir = dirname(await shot(name));
    readings.push({ name, camera: { x, z, distance, pitchDeg } });
  }
  writeFileSync(join(dir, 'stations.json'), JSON.stringify(readings, null, 2) + '\n');
};
