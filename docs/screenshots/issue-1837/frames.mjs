// Life in the world's light (#1837), as a run-game steps module: the three
// cameras docs/screenshots/issue-1799/README.md judges a look at, and gate 6's
// fourth, in the free-water crater with the HUD on. Low first, as the control,
// then High at the same four with the fleet at rest, and High once more in the
// garden, where Low's own fry schools swim and carry their light too.
//
//   SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' VIEW_W=1920 VIEW_H=1080 \
//     node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1837/software --steps docs/screenshots/issue-1837/frames.mjs
//
// On the named GPU, headed and unpaced, which is the run whose frames are
// offered for acceptance and whose GPU time is gate 6's:
//
//   UNPACED=1 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
//     --headed --channel msedge --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1837/gpu --steps docs/screenshots/issue-1837/frames.mjs
//
// QUALITY=low takes the control alone, which is how `main`'s Low is taken.
// CLIP=1 with drive.mjs's RECORD_VIDEO=<dir> moves the camera from Home to
// Close at High instead, for the clip. A software rasteriser's frames are
// labelled so in readings.json and are never offered for acceptance; its
// millisecond fields measure the rasteriser.
//
// Reduced motion holds a body at its loop's start, so two software runs frame
// alike. A run without it finds each school where the match's clock has
// carried it, and `life` in readings.json says where that is.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// name, plan x, plan z, dolly, yaw, pitch, focus depth: the poses of
// docs/screenshots/issue-1799/README.md's Cameras table, and gate 6's low.
const POSES = [
  ['home', 709, 1710, 1200, -34, 15, 300],
  ['close', 542, 1958, 420, -60, 2, 300],
  ['low', 2000, 2000, 1600, 0, 12, 850],
  ['survey', 2000, 2000, 10000, 0, 88, null],
];
// docs/free-water-slice.md §9's garden close: Low's own fry and outer fish.
const GARDEN = ['garden', 1875, 1125, 250, 90, 12, 275];

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
  // High's own bodies decode after the switch: a template a quality. The
  // crater stands 144 fry at Low and 464 at High, each with its light.
  const setQuality = async (quality) => {
    const drawn = await page.evaluate((q) => window.__perspectiveQuality(q), quality);
    assert.equal(drawn, quality, `the view draws ${drawn}, asked ${quality}`);
    await page.waitForFunction(() => !window.__perspectiveProbe().programHold.holding, null, {
      timeout: 120000,
    });
    await page.waitForFunction(
      (high) => {
        const probe = window.__perspectiveProbe();
        const fry = probe.fixtureAssets['env-shoal-fry'] ?? 0;
        // A tree before #1837 reports no lights, which is none: `main`'s Low
        // is taken with this module too.
        const glints = probe.lifeGlints ?? 0;
        return high ? fry > 144 && glints === fry : fry === 144 && glints === 0;
      },
      quality === 'high',
      { timeout: 120000 }
    );
    await page.waitForTimeout(software ? 4000 : 1500);
    return drawn;
  };

  if (process.env.CLIP === '1') {
    // The clip: Home to Close at High, the camera moved a step a frame, over
    // the fleet at rest, so the fry's stream is seen passing the Close eye.
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
    // Held at Close, for the stream to pass.
    await page.waitForTimeout(Number(process.env.CLIP_HOLD_MS ?? 6000));
    await shot('clip-end');
    return;
  }

  const only = process.env.FRAMES?.split(',');
  const readings = [];
  let dir;
  const write = () =>
    writeFileSync(
      join(dir, 'readings.json'),
      JSON.stringify({ renderer, software, unpaced, viewport, readings }, null, 2) + '\n'
    );
  const take = async (quality, poses) => {
    for (const pose of poses) {
      const name = pose[0];
      if (only && !only.includes(name)) continue;
      await aim(page, pose);
      const label = `${quality}-${name}`;
      const probe = await settle(label);
      dir = dirname(await shot(label));
      // Gate 6 reads GPU time queued as well (tools/render-stack/capture.mjs).
      let queued = null;
      if (probe.gpuTimer === 'timing') {
        await page.evaluate((steps) => window.__perspectiveGpuQueue(steps), QUEUE_STEPS);
        await page.waitForTimeout(400);
        const q = await settle(`${label}-queued`);
        await page.evaluate(() => window.__perspectiveGpuQueue(0));
        queued = { gpuMs: q.avgGpuMs, worstGpuMs: q.worstGpuMs, loadMs: q.gpuQueue.avgMs };
      }
      const budgetMs = probe.graphicsQuality?.frameGpuBudgetMs ?? null;
      readings.push({
        name,
        quality,
        passes: probe.passes,
        calls: probe.drawCalls,
        triangles: probe.triangles,
        camera: pose.slice(1),
        // Whether the camera's sway and the bodies were held (reduced motion).
        sway: probe.sway ?? null,
        // What the crater stands at this quality, and the lights its fry carry.
        life: { bodies: probe.fixtureAssets, glints: probe.lifeGlints ?? 0 },
        graphicsQuality: probe.graphicsQuality ?? null,
        gpuTimer: probe.gpuTimer,
        avgGpuMs: probe.avgGpuMs,
        queued,
        // High's budget, read queued and unpaced on the named GPU (gate 6).
        insideBudget:
          quality === 'high' && queued !== null && budgetMs !== null && unpaced
            ? queued.gpuMs <= budgetMs
            : null,
      });
      write();
    }
  };

  const qualities = (process.env.QUALITY ?? 'low,high').split(',');
  if (qualities.includes('low')) {
    await setQuality('low');
    await take('low', [...POSES, GARDEN]);
  }
  if (qualities.includes('high')) {
    await setQuality('high');
    await take('high', [...POSES, GARDEN]);
  }
  const high = readings.filter((reading) => reading.quality === 'high');
  if (high.length > 0) {
    assert.ok(
      high.every((reading) => reading.life.glints > 144),
      'High stands no more fry than Low'
    );
  }
};
