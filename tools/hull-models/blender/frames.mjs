/**
 * #1802's frames, as a run-game `--steps` module: the Commune's Corvette in
 * the free-water crater from four held cameras, HUD on, so one hull can be
 * shown beside another from the same eye.
 *
 *   node .claude/skills/run-game/scripts/drive.mjs \
 *     --url 'http://localhost:5173/?study=free-water' --out <dir> \
 *     --steps tools/hull-models/blender/frames.mjs
 *
 * A pair is two runs into two <dir>s: one of the tree as it stands, and one
 * with the spike's GLB copied over docs/concept-art/models/corvette-pelagia.glb
 * for the run and restored after (`git checkout`). The client loads a model
 * before a steps module starts, so the file is swapped rather than the
 * request rerouted. Nothing is committed swapped: the spike replaces no model.
 *
 * - `home` is the study's opening pose, untouched.
 * - `station` is gate 6's close station, 1,800 m at 55° of pitch
 *   (tools/render-stack/capture.mjs), on the Corvette.
 * - `near-port` and `near-bow` are a low eye 190 m and 240 m off the hull at
 *   its own depth. The High slice's Close camera is not fixed yet
 *   (docs/screenshots/issue-1799/README.md), so these stand in for it:
 *   a hull across the frame, which is where a surface is judged.
 *
 * The readings beside the frames are the probe's calls and triangles at each
 * camera, and the rasteriser's name: a frame a software one drew guides a
 * round and is never offered for acceptance (the dev-loop skill, "Look work").
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked >= 3);
  await page.waitForTimeout(6000);
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  });
  const software = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
  const hull = await page.evaluate(() =>
    window.__perspectiveLamps().units.find((unit) => unit.name === 'Corvette')
  );
  if (!hull) throw new Error('the study seats no Corvette');

  const readings = [];
  let dir;
  const take = async (name, pose) => {
    if (pose) {
      await page.evaluate(
        ({ hull, pose }) =>
          window.__perspectiveCamera(hull.xM, hull.zM, pose.distance, {
            yawDeg: pose.yawDeg,
            pitchDeg: pose.pitchDeg,
            focusDepthM: pose.focusDepthM,
          }),
        { hull, pose }
      );
      await page.waitForTimeout(2500);
    }
    const probe = await page.evaluate(() => window.__perspectiveProbe());
    dir = dirname(await shot(name));
    readings.push({ name, pose: pose ?? 'the opening pose', drawCalls: probe.drawCalls, triangles: probe.triangles });
  };

  await take('home');
  await take('station', { distance: 1800, yawDeg: 0, pitchDeg: 55, focusDepthM: null });
  await take('near-port', { distance: 190, yawDeg: -150, pitchDeg: 16, focusDepthM: hull.depthM });
  await take('near-bow', { distance: 240, yawDeg: 125, pitchDeg: 22, focusDepthM: hull.depthM });

  writeFileSync(
    join(dir, 'readings.json'),
    `${JSON.stringify({ renderer, software, viewport: page.viewportSize(), readings }, null, 2)}\n`
  );
  console.log(`${software ? 'SOFTWARE RASTERISER' : 'GPU'}: ${renderer}`);
  for (const r of readings) console.log(`${r.name}: ${r.drawCalls} calls, ${r.triangles} triangles`);
};
