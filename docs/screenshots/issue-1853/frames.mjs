// Every map's vent steam as lit smoke at High (#1853), as a run-game steps
// module: the Ventfront Divide's middle vent field at the target frame's
// camera (docs/screenshots/issue-1853/README.md), and Home, Close and Survey
// beside it, with the HUD on. Low first, as the control, then High.
//
//   SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' VIEW_W=1920 VIEW_H=1080 \
//     node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?map=ventfront-divide' \
//     --out docs/screenshots/issue-1853/software --steps docs/screenshots/issue-1853/frames.mjs
//
// On the named GPU, headed and unpaced, which is the run whose frames are
// offered for acceptance and whose GPU time is gate 6's:
//
//   UNPACED=1 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
//     --headed --channel msedge --url 'http://localhost:5173/?map=ventfront-divide' \
//     --out docs/screenshots/issue-1853/gpu --steps docs/screenshots/issue-1853/frames.mjs
//
// QUALITY=low takes the control alone, which is how `main`'s Low is taken.
// CLIP=1 with drive.mjs's RECORD_VIDEO=<dir> moves the camera from Home to
// Field at High instead, for the clip. A software rasteriser's frames are
// labelled so in readings.json and are never offered for acceptance; its
// millisecond fields measure the rasteriser.
//
// Reduced motion holds the smoke's clock, the steam's and the camera's sway,
// so two software runs frame alike but for the snow.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// name, plan x, plan z, dolly, yaw, pitch. Every focus is the ground's.
// Field is the target frame's camera; Close is a low eye across the same
// stacks; Survey is tools/render-stack/capture.mjs's, over the map's centre.
// Home is capture.mjs's too, about the own force, and is filled in below.
const FIELD = ['field', 3950, 3400, 1100, 0, 35];
const CLOSE = ['close', 3950, 3400, 900, -30, 12];
const SURVEY = ['survey', 4000, 4000, 18000, 0, 88];
const HOME = { distance: 6000, pitchDeg: 55 };

/** halo-cost.mjs's load: about 3.6 ms on the named GPU (gpuQueueLoad.ts). */
const QUEUE_STEPS = Number(process.env.QUEUE_STEPS ?? 12000);

const aim = (page, [, x, z, distance, yawDeg, pitchDeg]) =>
  page.evaluate(
    ({ x, z, distance, yawDeg, pitchDeg }) =>
      window.__perspectiveCamera(x, z, distance, { yawDeg, pitchDeg, focusDepthM: null }),
    { x, z, distance, yawDeg, pitchDeg }
  );

export default async ({ page, shot }) => {
  // A software rasteriser draws a lit vent field at seconds a frame.
  page.setDefaultTimeout(240000);
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked > 0, null, {
    timeout: 120000,
  });
  // The props decode after the hulls, and a chimney breathes once it stands.
  await page.waitForFunction(() => window.__perspectiveProbe().ventPlumes > 0, null, {
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
  const centre = await page.evaluate(() => window.__perspectiveProbe().ownCentre);
  assert.ok(centre, 'the match holds no own force to take Home about');
  const home = [
    'home',
    Math.round(centre.x),
    Math.round(centre.z),
    HOME.distance,
    0,
    HOME.pitchDeg,
  ];
  const poses = [home, FIELD, CLOSE, SURVEY];
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
  // The ground is another material under High, and each quality stands its
  // own column on a chimney: wait for the programs and for the columns.
  const setQuality = async (quality) => {
    const drawn = await page.evaluate((q) => window.__perspectiveQuality(q), quality);
    assert.equal(drawn, quality, `the view draws ${drawn}, asked ${quality}`);
    await page.waitForFunction(() => !window.__perspectiveProbe().programHold.holding, null, {
      timeout: 120000,
    });
    await page.waitForFunction(() => window.__perspectiveProbe().ventPlumes > 0, null, {
      timeout: 120000,
    });
    await page.waitForTimeout(software ? 4000 : 1500);
  };

  if (process.env.CLIP === '1') {
    // The clip: Home to Field at High, the camera moved a step a frame, then
    // held over the field, where the columns climb.
    await setQuality('high');
    await aim(page, home);
    await page.waitForTimeout(2000);
    const steps = Number(process.env.CLIP_STEPS ?? 120);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const ease = t * t * (3 - 2 * t);
      await aim(
        page,
        home.map((v, k) => (k === 0 ? 'clip' : v + (FIELD[k] - v) * ease))
      );
      await page.waitForTimeout(Number(process.env.CLIP_STEP_MS ?? 50));
    }
    await page.waitForTimeout(Number(process.env.CLIP_HOLD_MS ?? 6000));
    await shot('clip-end');
    return;
  }

  const readings = [];
  let dir;
  // Written after every frame, so a run that fails late keeps what it read.
  const write = () =>
    writeFileSync(
      join(dir, 'readings.json'),
      JSON.stringify({ renderer, software, unpaced, viewport, readings }, null, 2) + '\n'
    );
  const take = async (quality) => {
    for (const pose of poses) {
      await aim(page, pose);
      const label = `${quality}-${pose[0]}`;
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
        name: pose[0],
        quality,
        passes: probe.passes,
        calls: probe.drawCalls,
        triangles: probe.triangles,
        camera: pose.slice(1),
        // Whether the camera's sway and the columns' clocks were held.
        sway: probe.sway ?? null,
        // Columns standing: steam at Low, smoke at High, one a stack.
        vents: { plumes: probe.ventPlumes },
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

  for (const quality of (process.env.QUALITY ?? 'low,high').split(',')) {
    await setQuality(quality);
    await take(quality);
  }
  for (const r of readings) {
    console.log(
      `${r.quality} ${r.name}: ${r.calls} calls · ${r.triangles} triangles · ` +
        `${r.vents.plumes} columns` +
        (r.queued === null ? '' : ` · ${r.queued.gpuMs} ms queued`)
    );
  }
};
