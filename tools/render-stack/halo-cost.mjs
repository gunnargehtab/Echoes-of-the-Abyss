/**
 * #1001's GPU reading of the lamp halo, as a run-game `--steps` module, on the
 * named GPU (docs/graphics-standards.md gate 6, "Abyss Render Stack increment").
 *
 *   UNPACED=1 node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
 *     --url 'http://localhost:5173/?map=ventfront-divide' --out <dir> \
 *     --steps tools/render-stack/halo-cost.mjs
 *
 * `VIEW_DPR=1.5` takes gate 6's second pixel ratio; gate 6 asks for two runs of
 * each. At capture.mjs's four cameras and then the fight station of
 * stations.mjs, on one page load, it reads the halo off and on three ways:
 *
 * - **unqueued**: the frame's one timer bracket, as every reading before this
 *   one took it. It includes the GPU waiting for the browser's GPU process to
 *   hand it the frame's commands;
 * - **queued**: the same bracket behind a fixed GPU load (gpuQueueLoad.ts), so
 *   the frame's commands wait for the GPU rather than the GPU for them. This is
 *   gate 6's reading;
 * - **split**: queued, with each pass in a query of its own (gpuTimer.ts), to
 *   say where the time lands.
 *
 * The load proves nothing unless it outlasts the handover, so each station
 * asserts that the load took longer than its unqueued frame. Each reading is a
 * station of its own and waits for 240 GPU frames. The fight station is staged
 * as stations.mjs stages it, on Ventfront only, and read queued with the halo
 * on first, while the ping is fresh. Writes halo-cost.json beside the frames.
 * Not a gate.
 */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const CAMERAS = [
  ['home', 6000, 55],
  ['close', 1800, 55],
  ['low', 3500, 12],
  ['survey', 18000, 88],
];
/** About 3.6 ms on the named GPU, against unqueued frames of at most 2.5 ms. */
const QUEUE_STEPS = Number(process.env.QUEUE_STEPS ?? 12000);
const FRAMES = 240;
const SETTLE_MS = 400;
const HALO_PASSES = ['halo-gather', 'depth-copy', 'halo-source', 'halo-spread', 'halo-composite'];
/** Where the friendly cluster sits on drive.mjs's 1440×900 viewport (stations.mjs). */
const CENTRE = { x: 720, y: 450 };

/** One reading: set the halo and the timer's mode, settle, then a fresh station. */
async function read(page, label, { halo, queued, split }) {
  await page.evaluate(
    ({ halo, steps, split }) => {
      window.__perspectiveHalo(halo);
      window.__perspectiveGpuQueue(steps);
      window.__perspectiveGpuSplit(split);
    },
    { halo, steps: queued ? QUEUE_STEPS : 0, split }
  );
  await page.waitForTimeout(SETTLE_MS);
  await page.evaluate((name) => window.__perspectiveStation(name), label);
  await page.waitForFunction(
    (n) => {
      const p = window.__perspectiveProbe();
      return p.stationFrames >= n && p.gpuFrames >= n;
    },
    FRAMES,
    { timeout: 120000 }
  );
  const p = await page.evaluate(() => window.__perspectiveProbe());
  assert.equal(p.gpuTimer, 'timing', `${label}: the GPU timer is ${p.gpuTimer}`);
  // Idle is a reading too: no own entity past SIG 15 draws a splat, and the
  // halo then runs none of its passes (Sorrowgate's quiet cameras).
  if (halo) assert.ok(['drawn', 'idle'].includes(p.halo), `${label}: the halo is ${p.halo}`);
  return {
    halo,
    queued,
    split,
    gpuMs: p.avgGpuMs,
    worstGpuMs: p.worstGpuMs,
    loadMs: p.gpuQueue?.avgMs ?? null,
    // Frames a disjoint event voided, the frame's and the load's: dropped
    // rather than averaged, and counted so a worst frame can be read.
    gpuDropped: p.gpuDropped,
    loadDropped: p.gpuQueue?.dropped ?? null,
    parts: p.gpuParts,
    connMs: p.avgConnMs,
    frameMs: p.avgFrameMs,
    state: p.halo,
    sites: p.haloSites,
    calls: p.drawCalls,
    triangles: p.triangles,
  };
}

/** The six readings of one station, the gate's own first. */
async function station(page, name) {
  const readings = [];
  for (const mode of [
    { halo: true, queued: true, split: false },
    { halo: false, queued: true, split: false },
    { halo: true, queued: true, split: true },
    { halo: false, queued: true, split: true },
    { halo: true, queued: false, split: false },
    { halo: false, queued: false, split: false },
  ]) {
    readings.push(await read(page, name, mode));
  }
  const pick = (halo, queued, split) =>
    readings.find((r) => r.halo === halo && r.queued === queued && r.split === split);
  const unqueuedWorst = Math.max(pick(true, false, false).gpuMs, pick(false, false, false).gpuMs);
  for (const r of readings.filter((r) => r.queued)) {
    assert.ok(
      r.loadMs > unqueuedWorst,
      `${name}: the load took ${r.loadMs} ms, under the unqueued frame's ${unqueuedWorst} ms, ` +
        'so it may have run out before the frame was queued; raise QUEUE_STEPS'
    );
  }
  const haloSum = (r) => HALO_PASSES.reduce((s, k) => s + (r.parts?.[k]?.avgMs ?? 0), 0);
  const on = pick(true, true, true);
  const summary = {
    name,
    queuedOnMs: pick(true, true, false).gpuMs,
    queuedOffMs: pick(false, true, false).gpuMs,
    queuedHaloMs: Number(
      (pick(true, true, false).gpuMs - pick(false, true, false).gpuMs).toFixed(2)
    ),
    splitHaloMs: Number(haloSum(on).toFixed(2)),
    splitCanvasOnMs: on.parts?.canvas?.avgMs ?? null,
    splitCanvasOffMs: pick(false, true, true).parts?.canvas?.avgMs ?? null,
    unqueuedOnMs: pick(true, false, false).gpuMs,
    unqueuedOffMs: pick(false, false, false).gpuMs,
    connOnMs: pick(true, false, false).connMs,
    connOffMs: pick(false, false, false).connMs,
    frameOnMs: pick(true, false, false).frameMs,
    frameOffMs: pick(false, false, false).frameMs,
    sites: on.sites,
    parts: Object.fromEntries(Object.entries(on.parts ?? {}).map(([k, v]) => [k, v.avgMs])),
  };
  console.log(JSON.stringify(summary));
  return { name, summary, readings };
}

/** stations.mjs's marquee: a stepped drag over the base, so it is not a click. */
async function marquee(page) {
  await page.mouse.move(CENTRE.x - 260, CENTRE.y - 190);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(CENTRE.x - 260 + i * 65, CENTRE.y - 190 + i * 48);
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
  await page.waitForTimeout(600);
}

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked > 0);
  await page.waitForTimeout(6000);
  const { renderer, viewport } = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return {
      renderer,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    };
  });
  assert.ok(
    !/swiftshader|llvmpipe|software|basic render/i.test(renderer),
    `a software rasteriser (${renderer}) gives no gate-6 time`
  );
  assert.equal(process.env.UNPACED, '1', 'gate 6 reads GPU time unpaced (drive.mjs UNPACED=1)');
  const ready = await page.evaluate(
    () =>
      typeof window.__perspectiveGpuQueue === 'function' &&
      typeof window.__perspectiveHalo === 'function'
  );
  assert.ok(ready, 'this client predates the queued reading (gpuQueueLoad.ts)');
  const centre = await page.evaluate(() => window.__perspectiveProbe().ownCentre);
  assert.ok(centre, 'match must contain an own force');

  const stations = [];
  let dir;
  for (const [name, distance, pitchDeg] of CAMERAS) {
    await page.evaluate(
      ({ centre, distance, pitchDeg }) =>
        window.__perspectiveCamera(centre.x, centre.z, distance, {
          yawDeg: 0,
          pitchDeg,
          focusDepthM: null,
        }),
      { centre, distance, pitchDeg }
    );
    stations.push(await station(page, name));
    dir = dirname(await shot(name));
  }

  // Gate 6 reads the fight on Ventfront alone (stations.mjs).
  if (!page.url().includes('ventfront')) {
    write(dir, { renderer, viewport, stations });
    return;
  }
  // The fight, staged as stations.mjs stages it, from the home camera: the
  // fleet selected, a noisemaker and a mine in the water, a move order, and a
  // ping last, so the first reading opens on it.
  await page.evaluate(
    (centre) =>
      window.__perspectiveCamera(centre.x, centre.z, 6000, {
        yawDeg: 0,
        pitchDeg: 55,
        focusDepthM: null,
      }),
    centre
  );
  await page.evaluate(() => window.__perspectiveHalo(true));
  await page.waitForTimeout(SETTLE_MS);
  await marquee(page);
  await page.keyboard.press('KeyN');
  await page.waitForTimeout(300);
  await page.keyboard.press('KeyM');
  await page.waitForTimeout(300);
  await page.mouse.click(CENTRE.x + 210, CENTRE.y - 150, { button: 'right' });
  await page.waitForTimeout(400);
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(600);
  await shot('fight');
  stations.push(await station(page, 'fight'));
  write(dir, { renderer, viewport, stations });
};

function write(dir, { renderer, viewport, stations }) {
  const record = { renderer, viewport, unpaced: true, queueSteps: QUEUE_STEPS, stations };
  writeFileSync(join(dir, 'halo-cost.json'), JSON.stringify(record, null, 2) + '\n');
}
