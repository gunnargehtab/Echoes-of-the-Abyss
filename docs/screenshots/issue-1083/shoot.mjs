// The silt detail and seated stones (#1083), as a run-game `--steps` module:
// five held views of a solo Ventfront match from the Consortium seat, HUD
// hidden, and the probe's calls, triangles and props saved as stations.json.
//
//   VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
//     --url 'http://localhost:5173/?map=ventfront-divide&seabed-detail=1' \
//     --out <dir> --steps docs/screenshots/issue-1083/shoot.mjs
//
// Drop `&seabed-detail=1` for the shipped ground, or use `&dream-loop=1` for
// #967's whole study. `home` is #967's locked frame (its shoot.mjs); `silt`
// and `trench` stand over a seated boulder and a trench slab; `low` and
// `survey` are where the layer must have faded out.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const STATIONS = [
  ['home', 1340, 1300, 1500, 55],
  ['silt', 3182, 1664, 420, 50],
  ['trench', 1825, 554, 520, 50],
  ['low', 1340, 1300, 3500, 12],
  ['survey', 1340, 1300, 18000, 88],
];

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked > 0);
  await page.waitForTimeout(7000); // GLBs swap in over the baked sprites
  // No HUD toggle exists, so hide the Pixi canvas and every DOM overlay.
  // The first canvas is the three.js world.
  await page.evaluate(() => {
    [...document.querySelectorAll('canvas')]
      .slice(1)
      .forEach((c) => (c.style.visibility = 'hidden'));
    document.querySelectorAll('body *:not(canvas)').forEach((el) => {
      if (!el.querySelector('canvas')) el.style.visibility = 'hidden';
    });
  });
  const search = await page.evaluate(() => location.search);
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
    const p = await page.evaluate(() => window.__perspectiveProbe());
    readings.push({
      name,
      camera: { x, z, distance, pitchDeg },
      drawCalls: p.drawCalls,
      triangles: p.triangles,
      props: p.props,
      propTris: p.propTris,
    });
  }
  writeFileSync(join(dir, 'stations.json'), JSON.stringify({ search, readings }, null, 2) + '\n');
  console.log(JSON.stringify({ search, readings }));
};
