// A beam from each lamp a class carries (#1845), as a run-game steps module:
// the free-water crater at the three cameras docs/screenshots/issue-1799/README.md
// judges a look at, and gate 6's fourth, with the HUD on. Low first, as the
// control, then High at the same four with the fleet at rest. Each frame's
// reading names every beam by its hull and its lamp, which is what this step
// changed (docs/art-direction.md, "A beam from each lamp").
//
// On the named GPU, headed and unpaced, which is the run whose GPU time is
// gate 6's:
//
//   UNPACED=1 SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' \
//     VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
//     --headed --channel msedge --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1845/gpu/rest --steps docs/screenshots/issue-1845/frames.mjs
//
// QUALITY=low takes the control alone, which is how `main`'s Low is taken, and
// FRAMES=home,close names cameras. CLIP=1 with drive.mjs's RECORD_VIDEO=<dir>
// moves the camera from Home to Close at High instead, for the clip. Headless,
// a software rasteriser draws it: readings.json says so, and those frames are
// never offered for acceptance.
//
// The study's fleet fields no class with four lamps. The frames under
// gpu/cruiser were taken with staging.patch applied to the server, which is
// never committed: a Cruiser in the Harvester's berth.
//
// Reduced motion holds the camera's sway, every body at its loop's start and
// the snow where it hangs, so two runs frame alike.
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

/** halo-cost.mjs's load: about 3.6 ms on the named GPU (gpuQueueLoad.ts). */
const QUEUE_STEPS = Number(process.env.QUEUE_STEPS ?? 12000);

const aim = (page, [, x, z, distance, yawDeg, pitchDeg, focusDepthM]) =>
  page.evaluate(
    ({ x, z, distance, yawDeg, pitchDeg, focusDepthM }) =>
      window.__perspectiveCamera(x, z, distance, { yawDeg, pitchDeg, focusDepthM }),
    { x, z, distance, yawDeg, pitchDeg, focusDepthM }
  );

export default async ({ page, shot, recordingStartedMs }) => {
  // A software rasteriser draws the staging camera at seconds a frame.
  page.setDefaultTimeout(240000);
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
  // High's own bodies decode after the switch: a template a quality.
  const setQuality = async (quality) => {
    const drawn = await page.evaluate((q) => window.__perspectiveQuality(q), quality);
    assert.equal(drawn, quality, `the view draws ${drawn}, asked ${quality}`);
    await page.waitForFunction(() => !window.__perspectiveProbe().programHold.holding, null, {
      timeout: 120000,
    });
    await page.waitForFunction(
      (high) => {
        const probe = window.__perspectiveProbe();
        const jellies = probe.fixtureAssets['env-drift-jelly'] ?? 0;
        const manta = probe.fixtureAssets['env-rim-manta'] ?? 0;
        return high ? jellies > 0 && manta > 0 && (probe.farLanterns ?? 0) > 0 : jellies === 0;
      },
      quality === 'high',
      { timeout: 120000 }
    );
    await page.waitForTimeout(software ? 4000 : 1500);
  };

  // Each hull as a frame has it: its live SIG, which is how bright its lamps
  // burn, where it stands, and the lamps it throws a beam from. A tree before
  // #1845 names no lamp: its one beam a hull is the bow's.
  const hulls = () =>
    page.evaluate(() => {
      const round = (v) => Number(v.toFixed(1));
      const { lights } = window.__perspectiveSearchlights();
      return window.__perspectiveLamps().units.map((hull) => ({
        name: hull.name,
        sig: hull.sig,
        restSig: hull.restSig,
        xM: round(hull.xM),
        zM: round(hull.zM),
        depthM: round(hull.depthM),
        beams: lights
          .filter((light) => light.hull === hull.id)
          .map((light) => ({
            lamp: light.lamp ?? 'bow',
            bearingDeg: round((Math.atan2(light.dx, -light.dz) * 180) / Math.PI),
            // Over the level is positive: a mast lamp looks up.
            riseDeg: round((Math.asin(light.dy) * 180) / Math.PI),
          })),
      }));
    });

  if (process.env.CLIP === '1') {
    // The clip: Home to Close at High, the camera moved a step a frame.
    await setQuality('high');
    const [from, to] = [POSES[0], POSES[1]];
    await aim(page, from);
    await page.waitForTimeout(2000);
    // Where the move starts and ends in the recording, to cut the clip by.
    const mark = (what) =>
      console.log(
        `clip: ${what} ${((Date.now() - (recordingStartedMs ?? Date.now())) / 1000).toFixed(1)} s in`
      );
    mark('the move starts');
    const steps = Number(process.env.CLIP_STEPS ?? 160);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const ease = t * t * (3 - 2 * t);
      await aim(
        page,
        from.map((v, k) => (k === 0 ? 'clip' : v + (to[k] - v) * ease))
      );
      await page.waitForTimeout(Number(process.env.CLIP_STEP_MS ?? 50));
    }
    mark('the move ends');
    await page.waitForTimeout(Number(process.env.CLIP_HOLD_MS ?? 5000));
    mark('the hold ends');
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
  const take = async (quality) => {
    for (const pose of POSES) {
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
        // Beams the frame draws, of the six it may, and the snow they show.
        searchlights: probe.graphicsQuality?.searchlights ?? 0,
        beamMotes: probe.graphicsQuality?.beamMotes ?? 0,
        hulls: await hulls(),
        // Whether the camera's sway and the bodies were held (reduced motion).
        sway: probe.sway ?? null,
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
  // Low throws no beam, at any camera (docs/art-direction.md, "Two layers, two laws").
  for (const reading of readings) {
    if (reading.quality === 'low') {
      assert.equal(reading.searchlights, 0, `low-${reading.name} throws a beam`);
    }
  }
};
