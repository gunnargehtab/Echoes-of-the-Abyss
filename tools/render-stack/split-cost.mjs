/**
 * #1003's GPU reading of the chromatic split, as a run-game `--steps` module,
 * on the named GPU (docs/graphics-standards.md gate 6, "Chromatic split").
 *
 *   UNPACED=1 node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
 *     --url 'http://localhost:5173/?map=ventfront-divide' --out <dir> \
 *     --steps tools/render-stack/split-cost.mjs
 *
 * `VIEW_DPR=1.5` takes gate 6's second pixel ratio; gate 6 asks for two runs of
 * each. It reads the split off and on as halo-cost.mjs reads the halo, at
 * capture.mjs's four cameras and then the fight station of stations.mjs, on
 * one page load, with the lamp halo on as a player has it:
 *
 * - **queued**: the frame's timer bracket behind a fixed GPU load
 *   (gpuQueueLoad.ts), gate 6's reading. The split's cost is on − off;
 * - **split**: queued, each pass in a query of its own (gpuTimer.ts), so the
 *   copy and the draw are read apart;
 * - **unqueued**: the bracket alone, reported beside it.
 *
 * The load proves nothing unless it outlasts the handover, so each station
 * asserts that it took longer than its unqueued frame. Each reading is a
 * station of its own and waits for 240 GPU frames. Writes split-cost.json
 * beside the frames. Not a gate.
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
/** halo-cost.mjs's load: about 3.6 ms on the named GPU (gpuQueueLoad.ts). */
const QUEUE_STEPS = Number(process.env.QUEUE_STEPS ?? 12000);
const FRAMES = 240;
const SETTLE_MS = 400;
const SPLIT_PASSES = ['split-copy', 'split'];
/** Where the friendly cluster sits on drive.mjs's 1440×900 viewport (stations.mjs). */
const CENTRE = { x: 720, y: 450 };

/** One reading: set the split and the timer's mode, settle, then a fresh station. */
async function read(page, label, { split, queued, parts }) {
  await page.evaluate(
    ({ split, steps, parts }) => {
      window.__perspectiveSplit(split);
      window.__perspectiveGpuQueue(steps);
      window.__perspectiveGpuSplit(parts);
    },
    { split, steps: queued ? QUEUE_STEPS : 0, parts }
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
  assert.equal(p.split, split ? 'on' : 'off', `${label}: the split is ${p.split}`);
  return {
    split,
    queued,
    parts,
    gpuMs: p.avgGpuMs,
    worstGpuMs: p.worstGpuMs,
    loadMs: p.gpuQueue?.avgMs ?? null,
    gpuDropped: p.gpuDropped,
    loadDropped: p.gpuQueue?.dropped ?? null,
    gpuParts: p.gpuParts,
    connMs: p.avgConnMs,
    frameMs: p.avgFrameMs,
    halo: p.halo,
    passes: p.passes,
    calls: p.drawCalls,
    triangles: p.triangles,
    splitBytes: p.splitBytes,
    drawingBuffer: p.drawingBuffer,
  };
}

/** The six readings of one station, the gate's own first. */
async function station(page, name) {
  const readings = [];
  for (const mode of [
    { split: true, queued: true, parts: false },
    { split: false, queued: true, parts: false },
    { split: true, queued: true, parts: true },
    { split: false, queued: true, parts: true },
    { split: true, queued: false, parts: false },
    { split: false, queued: false, parts: false },
  ]) {
    readings.push(await read(page, name, mode));
  }
  const pick = (split, queued, parts) =>
    readings.find((r) => r.split === split && r.queued === queued && r.parts === parts);
  const unqueuedWorst = Math.max(pick(true, false, false).gpuMs, pick(false, false, false).gpuMs);
  for (const r of readings.filter((r) => r.queued)) {
    assert.ok(
      r.loadMs > unqueuedWorst,
      `${name}: the load took ${r.loadMs} ms, under the unqueued frame's ${unqueuedWorst} ms, ` +
        'so it may have run out before the frame was queued; raise QUEUE_STEPS'
    );
  }
  const on = pick(true, true, true);
  const off = pick(false, true, false);
  assert.equal(on.calls - pick(false, true, true).calls, 1, `${name}: the split is one call`);
  const summary = {
    name,
    queuedOnMs: pick(true, true, false).gpuMs,
    queuedOffMs: off.gpuMs,
    queuedSplitMs: Number((pick(true, true, false).gpuMs - off.gpuMs).toFixed(2)),
    partsSplitMs: Number(
      SPLIT_PASSES.reduce((s, k) => s + (on.gpuParts?.[k]?.avgMs ?? 0), 0).toFixed(2)
    ),
    unqueuedOnMs: pick(true, false, false).gpuMs,
    unqueuedOffMs: pick(false, false, false).gpuMs,
    connOnMs: pick(true, false, false).connMs,
    connOffMs: pick(false, false, false).connMs,
    halo: on.halo,
    calls: on.calls,
    triangles: on.triangles,
    splitBytes: on.splitBytes,
    parts: Object.fromEntries(Object.entries(on.gpuParts ?? {}).map(([k, v]) => [k, v.avgMs])),
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
  assert.ok(
    await page.evaluate(() => typeof window.__perspectiveSplit === 'function'),
    'this client predates the chromatic split'
  );
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

  // Gate 6 reads the fight on Ventfront alone (stations.mjs), staged as
  // halo-cost.mjs stages it: the fleet selected, a noisemaker and a mine in
  // the water, a move order, and a ping last.
  if (page.url().includes('ventfront')) {
    await page.evaluate(
      (centre) =>
        window.__perspectiveCamera(centre.x, centre.z, 6000, {
          yawDeg: 0,
          pitchDeg: 55,
          focusDepthM: null,
        }),
      centre
    );
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
  }
  // Leave the view as a player has it.
  await page.evaluate(() => {
    window.__perspectiveSplit(true);
    window.__perspectiveGpuQueue(0);
    window.__perspectiveGpuSplit(false);
  });
  const record = { renderer, viewport, unpaced: true, queueSteps: QUEUE_STEPS, stations };
  writeFileSync(join(dir, 'split-cost.json'), JSON.stringify(record, null, 2) + '\n');
};
