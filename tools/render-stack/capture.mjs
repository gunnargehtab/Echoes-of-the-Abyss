/**
 * #974's paired cameras, as a run-game `--steps` module: four held views of a
 * live match with the HUD on, gate 6's counts asserted at each, and the probe
 * saved as readings.json beside the frames.
 *
 *   node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
 *     --url 'http://localhost:5173/?map=ventfront-divide' --out <dir> \
 *     --steps tools/render-stack/capture.mjs
 *
 * `?mission=prologue-sorrowgate` is the tutorial, and a pair is two revisions
 * captured into two <dir>s; `VIEW_DPR=1.5` takes gate 6's second pixel ratio.
 * Headed, because headless Chromium may rasterise through SwiftShader on a
 * machine with a GPU (drive.mjs), and `software` records when it did: that
 * frame time is the rasteriser's, not the scene's. connMs and overlayMs are
 * the two painters' CPU time and frameMs the interval between frames.
 * avgGpuMs and worstGpuMs are the conn view's GPU time, every pass summed,
 * from a timer query (gpuTimer.ts): read on a GPU, refused on a software
 * rasteriser, and absent from a revision before #1001. A station's worst
 * frame includes the one that first draws its view. No pixel is read here: the
 * saturation table in docs/screenshots/issue-974/README.md was read from the
 * frames separately. Not a gate; the asserts stop a capture that could not be
 * evidence.
 */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked > 0);
  await page.waitForTimeout(6000);
  const { renderer, viewport } = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) throw new Error('WebGL2 unavailable');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    // A spare context held for the whole capture would share the GPU with it.
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return {
      renderer,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    };
  });
  const software = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
  if (software) {
    console.log(
      'WARNING: a software rasteriser drew this capture. Its millisecond fields measure ' +
        'the rasteriser, not the scene; only calls and triangles are gate-6 numbers.'
    );
  }
  const centre = await page.evaluate(() => window.__perspectiveProbe().ownCentre);
  assert.ok(centre, 'match must contain an own force');
  const readings = [];
  let dir;
  for (const [name, distance, pitchDeg] of [
    ['home', 6000, 55],
    ['close', 1800, 55],
    ['low', 3500, 12],
    ['survey', 18000, 88],
  ]) {
    await page.evaluate(({ centre, distance, pitchDeg, name }) => {
      window.__perspectiveCamera(centre.x, centre.z, distance, {
        yawDeg: 0, pitchDeg, focusDepthM: null,
      });
      window.__perspectiveStation(name);
    }, { centre, distance, pitchDeg, name });
    // GPU results land a few frames late, so a timing probe waits for its own
    // windowful too.
    await page.waitForFunction(() => {
      const p = window.__perspectiveProbe();
      const gpu = p.gpuTimer !== 'timing' || p.gpuFrames >= 240;
      return p.stationFrames >= 240 && p.overlayFrames >= 240 && gpu;
    }, null, { timeout: 120000 });
    const probe = await page.evaluate(() => window.__perspectiveProbe());
    if (probe.gpuTimer !== undefined) {
      // A GPU capture that read no GPU time is no gate-6 before-and-after, and
      // a software one that read some would be quoted.
      assert.equal(probe.gpuTimer, software ? 'software' : 'timing', `${name}: GPU timer`);
    }
    assert.ok(probe.drawCalls <= 150, `${name}: draw budget`);
    assert.ok(probe.triangles <= 250000, `${name}: triangle budget`);
    // Absent before #974, so a baseline capture of 1df288a still runs.
    assert.ok((probe.environmentBytes ?? 0) < 2 ** 20, `${name}: environment over 1 MiB (gate 6)`);
    readings.push({ name, probe });
    dir = dirname(await shot(name));
  }
  const record = { renderer, software, viewport, readings };
  writeFileSync(join(dir, 'readings.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(JSON.stringify(record));
};
