// The High slice's frames (#1801), as a run-game steps module: the three cameras
// docs/screenshots/issue-1799/README.md judges a look at, in the free-water
// crater with the HUD on, at the Low graphics quality and at High, and the
// probe's reading of each beside them.
//
//   node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1801/software --steps docs/screenshots/issue-1801/frames.mjs
//
// On the named GPU, headed and unpaced, which is the run whose frames are
// offered for acceptance and whose GPU time is gate 6's:
//
//   UNPACED=1 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
//     --headed --channel msedge --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1801/gpu --steps docs/screenshots/issue-1801/frames.mjs
//
// QUALITY=low or QUALITY=high takes one quality; unset, both, Low first. A
// revision before #1801 has no switch and draws Low: QUALITY=low runs on it,
// which is how the Low control's before set is taken. FRAMES=home,close limits
// the cameras. CLIP=1 with drive.mjs's RECORD_VIDEO=<dir> moves the camera
// from Home to Close at High instead, for the clip. A software rasteriser's
// frames are labelled so in readings.json and are never offered for
// acceptance; its millisecond fields measure the rasteriser.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// name, plan x, plan z, dolly, yaw, pitch, focus depth: the poses of
// docs/screenshots/issue-1799/README.md's Cameras table.
const POSES = [
  // The study's opening pose (FREE_WATER_OPENING), set explicitly.
  ['home', 709, 1710, 1200, -34, 15, 300],
  // A low eye over the west rim, composed like the target: the rim in the
  // foreground, the three hulls across the frame, the bowl's open water behind.
  ['close', 542, 1958, 420, -60, 2, 300],
  // The study's survey dolly: north up, the whole bowl in frame.
  ['survey', 2000, 2000, 10000, 0, 88, null],
];

/** halo-cost.mjs's load: about 3.6 ms on the named GPU (gpuQueueLoad.ts). */
const QUEUE_STEPS = Number(process.env.QUEUE_STEPS ?? 12000);

const aim = (page, [, x, z, distance, yawDeg, pitchDeg, focusDepthM]) =>
  page.evaluate(
    ({ x, z, distance, yawDeg, pitchDeg, focusDepthM }) =>
      window.__perspectiveCamera(x, z, distance, { yawDeg, pitchDeg, focusDepthM }),
    { x, z, distance, yawDeg, pitchDeg, focusDepthM }
  );

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked >= 3, null, {
    timeout: 120000,
  });
  // The props decode after the hulls: a frame before them is not the crater.
  await page.waitForFunction(() => window.__perspectiveProbe().props > 0, null, {
    timeout: 120000,
  });
  await page.waitForTimeout(3000);
  const { renderer, viewport } = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { renderer, viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio } };
  });
  const software = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
  if (software) {
    console.log(
      'WARNING: a software rasteriser drew this capture. Its frames may guide a round and ' +
        'are never offered for acceptance; its millisecond fields measure the rasteriser.'
    );
  }
  const unpaced = process.env.UNPACED === '1';
  const switchable = await page.evaluate(() => typeof window.__perspectiveQuality === 'function');
  const asked = process.env.QUALITY;
  const qualities = asked === 'low' || asked === 'high' ? [asked] : ['low', 'high'];
  if (!switchable) {
    assert.deepEqual(qualities, ['low'], 'this revision has no Graphics quality: QUALITY=low');
  }
  // A station is a windowful on a GPU, where its time is read; a software
  // rasteriser draws a frame a second, and its few frames are only looked at.
  const hold = software ? 6 : 240;
  const settle = async (label) => {
    await page.evaluate((label) => window.__perspectiveStation(label), label);
    await page.waitForFunction(
      (hold) => {
        const p = window.__perspectiveProbe();
        return p.stationFrames >= hold && (p.gpuTimer !== 'timing' || p.gpuFrames >= hold);
      },
      hold,
      { timeout: 600000 }
    );
    return page.evaluate(() => window.__perspectiveProbe());
  };
  const setQuality = async (quality) => {
    if (!switchable) return 'low';
    const drawn = await page.evaluate((q) => window.__perspectiveQuality(q), quality);
    assert.equal(drawn, quality, `the view draws ${drawn}, asked ${quality}`);
    // The ground is rebuilt for the quality; let its programs link.
    await page.waitForFunction(() => !window.__perspectiveProbe().programHold.holding, null, {
      timeout: 120000,
    });
    return drawn;
  };

  if (process.env.CLIP === '1') {
    // The clip: Home to Close at High, the camera moved a step a frame.
    await setQuality('high');
    const [from, to] = [POSES[0], POSES[1]];
    await aim(page, from);
    await page.waitForTimeout(2000);
    const steps = Number(process.env.CLIP_STEPS ?? 120);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const ease = t * t * (3 - 2 * t);
      const pose = from.map((v, k) => (k === 0 ? 'clip' : v + (to[k] - v) * ease));
      await aim(page, pose);
      await page.waitForTimeout(Number(process.env.CLIP_STEP_MS ?? 50));
    }
    await page.waitForTimeout(2000);
    await shot('clip-end');
    return;
  }

  const only = process.env.FRAMES?.split(',');
  const readings = [];
  let dir;
  for (const quality of qualities) {
    const drawn = await setQuality(quality);
    for (const pose of POSES) {
      const name = pose[0];
      if (only && !only.includes(name)) continue;
      await aim(page, pose);
      const probe = await settle(`${quality}-${name}`);
      dir = dirname(await shot(`${quality}-${name}`));
      // Gate 6 reads GPU time queued as well (tools/render-stack/capture.mjs).
      let queued = null;
      if (probe.gpuTimer === 'timing') {
        await page.evaluate((steps) => window.__perspectiveGpuQueue(steps), QUEUE_STEPS);
        await page.waitForTimeout(400);
        const q = await settle(`${quality}-${name}-queued`);
        await page.evaluate(() => window.__perspectiveGpuQueue(0));
        queued = { gpuMs: q.avgGpuMs, worstGpuMs: q.worstGpuMs, loadMs: q.gpuQueue.avgMs };
        assert.ok(
          queued.loadMs > probe.avgGpuMs,
          `${name}: the load (${queued.loadMs} ms) ran out before the unqueued frame (${probe.avgGpuMs} ms)`
        );
      }
      const budgetMs = probe.graphicsQuality?.frameGpuBudgetMs ?? null;
      readings.push({
        name,
        quality: drawn,
        passes: probe.passes,
        pitchDeg: probe.pitchDeg,
        yawDeg: probe.yawDeg,
        focus: probe.focus,
        eye: probe.eye,
        distance: probe.distance,
        waterReachM: probe.waterReachM,
        calls: probe.drawCalls,
        triangles: probe.triangles,
        graphicsQuality: probe.graphicsQuality ?? null,
        gpuTimer: probe.gpuTimer,
        avgGpuMs: probe.avgGpuMs,
        queued,
        // High's budget, read queued and unpaced on the named GPU (gate 6).
        insideBudget:
          drawn === 'high' && queued !== null && budgetMs !== null && unpaced
            ? queued.gpuMs <= budgetMs
            : null,
        stationFrames: probe.stationFrames,
        sway: probe.sway,
      });
    }
  }
  const record = { renderer, software, unpaced, viewport, readings };
  writeFileSync(join(dir, 'readings.json'), JSON.stringify(record, null, 2) + '\n');
  for (const r of readings) {
    console.log(
      `${r.quality} ${r.name}: ${r.passes.join(' ')} · ${r.calls} calls · ${r.triangles} triangles` +
        (r.queued === null ? '' : ` · ${r.queued.gpuMs} ms queued`)
    );
  }
};
