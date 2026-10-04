/**
 * #974's paired cameras, as a run-game `--steps` module: four held views of a
 * live match with the HUD on, gate 6's counts asserted at each (or logged, with
 * OVER_BUDGET=record), the own hulls and structures on screen counted, and the
 * probe saved as readings.json beside the frames.
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
 * rasteriser, and absent from a revision before #1001. They are gate 6's
 * reading only from a run with UNPACED=1 (drive.mjs), whose frame times in
 * turn are not; `unpaced` records which run this was. Gate 6 reads them
 * queued as well: on a client that has the load (gpuQueueLoad.ts), each
 * station is read a second time behind it, as `queued`, and the load must
 * outlast the unqueued frame or the capture fails. A station's worst
 * frame includes the one that first draws its view. No pixel is read here: the
 * saturation table in docs/screenshots/issue-974/README.md was read from the
 * frames separately. Not a gate; the asserts stop a capture that could not be
 * evidence.
 */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** halo-cost.mjs's load: about 3.6 ms on the named GPU (gpuQueueLoad.ts). */
const QUEUE_STEPS = Number(process.env.QUEUE_STEPS ?? 12000);
/**
 * OVER_BUDGET=record logs a breach of gate 6's counts instead of failing on
 * it: a frame measured because it breaches them, the berth ceiling's (#1027),
 * is evidence. The breaches land in readings.json either way.
 */
const OVER_BUDGET = process.env.OVER_BUDGET === 'record';

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
  const unpaced = process.env.UNPACED === '1';
  // HALO=on or HALO=off sets the lamp halo through its development switch
  // (#1001), for an on/off pair; a view that cannot draw it fails HALO=on.
  // Unset, the capture takes the setting, on by default since the owner
  // approved the halo's frames, so an off frame has to say HALO=off.
  const asked = process.env.HALO;
  // Absent before #1001's queued reading, so an older revision still runs.
  const queueable = await page.evaluate(() => typeof window.__perspectiveGpuQueue === 'function');
  if (asked === 'on' || asked === 'off') {
    const state = await page.evaluate((on) => window.__perspectiveHalo?.(on), asked === 'on');
    if (asked === 'on') assert.ok(state === 'idle' || state === 'drawn', `the lamp halo is ${state}`);
  }
  const halo = await page.evaluate(() => window.__perspectiveProbe().halo);
  if (!unpaced && !software) {
    console.log(
      'NOTE: paced at the display rate, the GPU idles at a low clock, so avgGpuMs here ' +
        "is not gate 6's reading; re-run with UNPACED=1 for it."
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
    const breaches = [];
    if (probe.drawCalls > 150) breaches.push(`${name}: draw budget (${probe.drawCalls})`);
    if (probe.triangles > 400000) breaches.push(`${name}: triangle budget (${probe.triangles})`);
    if (OVER_BUDGET) breaches.forEach((breach) => console.log(`BREACH ${breach}`));
    else assert.deepEqual(breaches, [], 'gate 6');
    // Null before 33af0f74, so a baseline capture of 1df288a still runs.
    const onScreen = await page.evaluate(() => {
      if (typeof window.__perspectiveLamps !== 'function') return null;
      const seen = ({ screen }) =>
        screen !== null &&
        screen.x1 > 0 && screen.x0 < innerWidth && screen.y1 > 0 && screen.y0 < innerHeight;
      const { units, structures } = window.__perspectiveLamps();
      return { units: units.filter(seen).length, structures: structures.filter(seen).length };
    });
    // Absent before #974, so a baseline capture of 1df288a still runs.
    assert.ok((probe.environmentBytes ?? 0) < 2 ** 20, `${name}: environment over 1 MiB (gate 6)`);
    dir = dirname(await shot(name));
    let queued = null;
    if (queueable && probe.gpuTimer === 'timing') {
      await page.evaluate((steps) => window.__perspectiveGpuQueue(steps), QUEUE_STEPS);
      await page.waitForTimeout(400);
      await page.evaluate((name) => window.__perspectiveStation(name), name);
      await page.waitForFunction(
        () => {
          const p = window.__perspectiveProbe();
          return p.stationFrames >= 240 && p.gpuFrames >= 240;
        },
        null,
        { timeout: 120000 }
      );
      const q = await page.evaluate(() => window.__perspectiveProbe());
      await page.evaluate(() => window.__perspectiveGpuQueue(0));
      queued = {
        gpuMs: q.avgGpuMs,
        worstGpuMs: q.worstGpuMs,
        loadMs: q.gpuQueue.avgMs,
        gpuDropped: q.gpuDropped,
        loadDropped: q.gpuQueue.dropped,
      };
      assert.ok(
        queued.loadMs > probe.avgGpuMs,
        `${name}: the load (${queued.loadMs} ms) ran out before the unqueued frame (${probe.avgGpuMs} ms)`
      );
    }
    readings.push({ name, probe, queued, onScreen, breaches });
  }
  const record = { renderer, software, unpaced, halo, viewport, overBudget: OVER_BUDGET, readings };
  writeFileSync(join(dir, 'readings.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(JSON.stringify(record));
};
