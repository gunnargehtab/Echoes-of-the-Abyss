/**
 * #1079's counts, as a run-game `--steps` module: calls and triangles at
 * `capture.mjs`'s four cameras, and the own models on screen, written to
 * counts.json beside the frames.
 *
 *   STAGE_FILE=<file> .claude/skills/run-game/scripts/dev.sh start  # staging.patch applied
 *   node .claude/skills/run-game/scripts/drive.mjs \
 *     --url 'http://localhost:5173/?map=ventfront-divide' --out <dir> \
 *     --steps docs/screenshots/issue-1079/counts.mjs
 *
 * `capture.mjs` waits for 240 frames a camera, which SwiftShader cannot draw
 * with forty Beacons on screen inside its timeout. Calls and triangles need no
 * window: they are the same on any rasteriser (README.md), so this reads them
 * after twelve frames and reads no time at all.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const CAMERAS = [
  ['home', 6000, 55],
  ['close', 1800, 55],
  ['low', 3500, 12],
  ['survey', 18000, 88],
];

export default async ({ page, shot }) => {
  // Every own entity on its model, not its loading sprite.
  await page.waitForFunction(
    () => {
      const p = window.__perspectiveProbe?.();
      return p !== undefined && p.modelBacked > 0 && p.modelBacked === p.units + p.structures;
    },
    null,
    { timeout: 180000 }
  );
  await page.waitForTimeout(4000);
  const centre = await page.evaluate(() => window.__perspectiveProbe().ownCentre);
  const readings = [];
  let dir;
  for (const [name, distance, pitchDeg] of CAMERAS) {
    await page.evaluate(
      ({ centre, distance, pitchDeg, name }) => {
        window.__perspectiveCamera(centre.x, centre.z, distance, {
          yawDeg: 0,
          pitchDeg,
          focusDepthM: null,
        });
        window.__perspectiveStation(name);
      },
      { centre, distance, pitchDeg, name }
    );
    await page.waitForFunction(() => window.__perspectiveProbe().stationFrames >= 12, null, {
      timeout: 120000,
    });
    const p = await page.evaluate(() => window.__perspectiveProbe());
    // As capture.mjs counts them: a lamp-reading box inside the viewport.
    const onScreen = await page.evaluate(() => {
      const seen = ({ screen }) =>
        screen !== null &&
        screen.x1 > 0 &&
        screen.x0 < innerWidth &&
        screen.y1 > 0 &&
        screen.y0 < innerHeight;
      const { units, structures } = window.__perspectiveLamps();
      return { units: units.filter(seen).length, structures: structures.filter(seen).length };
    });
    const reading = {
      name,
      drawCalls: p.drawCalls,
      triangles: p.triangles,
      units: p.units,
      structures: p.structures,
      modelBacked: p.modelBacked,
      modelMeshes: p.modelMeshes ?? null,
      props: p.props,
      propTris: p.propTris,
      halo: p.halo,
      haloCalls: p.haloCalls,
      passes: p.passes,
      onScreen,
    };
    console.log(JSON.stringify(reading));
    readings.push(reading);
    dir = dirname(await shot(name));
  }
  writeFileSync(join(dir, 'counts.json'), JSON.stringify(readings, null, 2) + '\n');
};
