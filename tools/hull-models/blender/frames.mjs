/**
 * #1802's frames, as a run-game `--steps` module: the Commune's Corvette in
 * the free-water crater from five held cameras, HUD on, so one hull can be
 * shown beside another from the same eye.
 *
 *   QUALITY=high node .claude/skills/run-game/scripts/drive.mjs \
 *     --url 'http://localhost:5173/?study=free-water' --out <dir> \
 *     --steps tools/hull-models/blender/frames.mjs
 *
 * A set is one run a hull into its own <dir>: the tree as it stands, then
 * each spike GLB copied over docs/concept-art/models/corvette-pelagia.glb for
 * its run and restored after (`git checkout`). The client loads a model
 * before a steps module starts, so the file is swapped rather than the
 * request rerouted. Nothing is committed swapped: the spike replaces no model.
 *
 * - `home` is the study's opening pose, untouched.
 * - `close` is the High slice's Close camera, as #1801's first round fixed it
 *   (docs/screenshots/issue-1799/README.md).
 * - `station` is gate 6's close station, 1,800 m at 55° of pitch
 *   (tools/render-stack/capture.mjs), on the Corvette.
 * - `near-port` and `near-bow` are a low eye 190 m and 240 m off the hull at
 *   its own depth: the nearest the conn camera comes, where a surface is
 *   judged.
 *
 * QUALITY=low or QUALITY=high sets the Graphics quality by its development
 * switch (docs/screenshots/issue-1801/frames.mjs); unset, the view draws what
 * the setting says, which is Low. The readings beside the frames are the
 * probe's calls and triangles at each camera, the Corvette's lamps in pixels
 * there, the quality drawn, and the rasteriser's name: a frame a software
 * one drew guides a round and is never offered for acceptance (the dev-loop
 * skill, "Look work").
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

  // The development switch beside the setting, as issue-1801/frames.mjs uses
  // it: the ground is rebuilt for the quality, so wait for its programs.
  let quality = 'low';
  if (process.env.QUALITY === 'low' || process.env.QUALITY === 'high') {
    quality = await page.evaluate((q) => window.__perspectiveQuality(q), process.env.QUALITY);
    if (quality !== process.env.QUALITY) throw new Error(`the view draws ${quality}`);
    await page.waitForFunction(() => !window.__perspectiveProbe().programHold.holding, null, {
      timeout: 120000,
    });
  }

  const readings = [];
  let dir;
  const take = async (name, pose) => {
    if (pose) {
      await page.evaluate(
        ({ hull, pose }) =>
          window.__perspectiveCamera(pose.xM ?? hull.xM, pose.zM ?? hull.zM, pose.distance, {
            yawDeg: pose.yawDeg,
            pitchDeg: pose.pitchDeg,
            focusDepthM: pose.focusDepthM,
          }),
        { hull, pose }
      );
      // A software rasteriser draws High at about a frame a second.
      await page.waitForTimeout(software && quality === 'high' ? 9000 : 2500);
    }
    const probe = await page.evaluate(() => window.__perspectiveProbe());
    // The Corvette's lamps as this camera projects them (lampScreen.ts): each
    // site's width and their summed area, in pixels. The maps hold a lamp's
    // light from above; this is the same lamp from where a player sees it.
    const lamps = await page.evaluate(
      () => window.__perspectiveLamps().units.find((unit) => unit.name === 'Corvette').lamps
    );
    dir = dirname(await shot(name));
    readings.push({
      name,
      pose: pose ?? 'the opening pose',
      drawCalls: probe.drawCalls,
      triangles: probe.triangles,
      lampAreaPx: lamps.map((lamp) => lamp.areaPx),
      lampSitesPx: lamps.map((lamp) => lamp.sitesPx),
    });
  };

  await take('home');
  await take('close', {
    xM: 542,
    zM: 1958,
    distance: 420,
    yawDeg: -60,
    pitchDeg: 2,
    focusDepthM: 300,
  });
  await take('station', { distance: 1800, yawDeg: 0, pitchDeg: 55, focusDepthM: null });
  await take('near-port', { distance: 190, yawDeg: -150, pitchDeg: 16, focusDepthM: hull.depthM });
  await take('near-bow', { distance: 240, yawDeg: 125, pitchDeg: 22, focusDepthM: hull.depthM });

  writeFileSync(
    join(dir, 'readings.json'),
    `${JSON.stringify({ renderer, software, quality, viewport: page.viewportSize(), readings }, null, 2)}\n`
  );
  console.log(`${software ? 'SOFTWARE RASTERISER' : 'GPU'}: ${renderer}`);
  for (const r of readings)
    console.log(`${r.name}: ${r.drawCalls} calls, ${r.triangles} triangles`);
};
