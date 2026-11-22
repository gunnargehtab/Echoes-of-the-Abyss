// The far bloom (#1859), as a run-game steps module: a river of small
// lanterns far out over the bowl, points of the lantern's cloud alone. The
// three cameras docs/screenshots/issue-1799/README.md judges a look at, and
// gate 6's fourth, in the free-water crater with the HUD on, and one more
// 400 m from the river's west end, which shows what a lantern of it is from
// near. Low first, as the control, then High at the same five with the fleet
// at rest. Then one staged frame, at High and at Low: the Corvette ordered out
// under the river's thick middle and Home's camera held, so its ring stands
// among the lanterns. That is the frame gate 7's glance is for.
//
//   SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' VIEW_W=1920 VIEW_H=1080 \
//     node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1859/software --steps docs/screenshots/issue-1859/frames.mjs
//
// On the named GPU, headed and unpaced, which is the run whose frames are
// offered for acceptance and whose GPU time is gate 6's:
//
//   UNPACED=1 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
//     --headed --channel msedge --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1859/gpu --steps docs/screenshots/issue-1859/frames.mjs
//
// QUALITY=low takes the control alone, which is how `main`'s Low is taken.
// CLIP=1 with drive.mjs's RECORD_VIDEO=<dir> moves the camera from Home out
// over the bowl to gate 6's low camera at High instead, for the clip. A
// software rasteriser's frames are labelled so in readings.json and are never
// offered for acceptance; its millisecond fields measure the rasteriser.
//
// Reduced motion holds the river where the match's start stands it, and every
// body at its loop's start, so two software runs frame alike.
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
// The river from near: 400 m from its west end, where its middle starts
// (`FREE_WATER_HIGH_LIFE.BLOOM` in packages/shared/src/constants.ts), looking
// east-north-east along its north side at the lanterns' own depth.
const RIVER = ['river', 1200, 1930, 400, -70, 5, 160];
// The staged frame: where the Corvette is sent, at the fleet's own 300 m. From
// Home's eye that water lies behind the river's thick middle, so the hull's
// ring is drawn among the lanterns. `SELECT` is the camera the hull is picked
// and ordered from; the frame itself is Home's pose, under another name.
const MARK_AT = [1350, 1800];
const MARK_DEPTH_M = 300;
const SELECT = { distance: 300, pitchDeg: 60 };
const MARK = ['mark', ...POSES[0].slice(1)];

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
  // High's own bodies decode after the switch: a template a quality. The
  // far bloom waits on no file: it stands with the rebuild that follows.
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
        // The vent stand is High's too: its chimneys decode, then breathe.
        const stacks = probe.fixtureAssets['env-vent-chimney'] ?? 0;
        const jellies = probe.fixtureAssets['env-drift-jelly'] ?? 0;
        const lanterns = probe.jellyLights ?? 0;
        // A tree before #1859 reports no bloom, which is none: `main`'s Low
        // is taken with this module too.
        const bloom = probe.farLanterns ?? 0;
        const vents = high ? stacks > 0 && probe.ventPlumes === stacks : stacks === 0;
        return high
          ? fry > 144 && glints === fry && jellies > 0 && lanterns > 0 && vents
          : fry === 144 && glints === 0 && jellies === 0 && lanterns === 0 && bloom === 0 &&
              vents && probe.ventPlumes === 0;
      },
      quality === 'high',
      { timeout: 120000 }
    );
    await page.waitForTimeout(software ? 4000 : 1500);
    return drawn;
  };

  // Each hull as a frame has it: where it stands and its live SIG.
  const hulls = () =>
    page.evaluate(() => {
      const round = (v) => Number(v.toFixed(1));
      return window.__perspectiveLamps().units.map((hull) => ({
        name: hull.name,
        sig: hull.sig,
        restSig: hull.restSig,
        xM: round(hull.xM),
        zM: round(hull.zM),
        depthM: round(hull.depthM),
      }));
    });
  const hullAt = async (name) => (await hulls()).find((hull) => hull.name === name);
  // A hull is at rest when a second moves it nowhere and its SIG is back at idle.
  const comeToRest = async (name) => {
    let was = await hullAt(name);
    for (let i = 0; i < 600; i++) {
      await page.waitForTimeout(1000);
      const now = await hullAt(name);
      const still =
        Math.hypot(now.xM - was.xM, now.zM - was.zM) < 0.5 && Math.abs(now.depthM - was.depthM) < 0.5;
      if (i > 2 && still && now.sig <= now.restSig + 0.5) return now;
      was = now;
    }
    assert.fail(`the ${name} never came to rest`);
  };
  // The Corvette, picked where it stands and sent out under the river. Both
  // clicks land on the view's centre, which is the camera's focus: on the hull
  // to pick it, then on the water at `MARK_AT`, where an order given on a
  // raised focus plane is an order to that depth (#1132).
  const sendOut = async () => {
    const view = page.viewportSize();
    const centre = [view.width / 2, view.height / 2];
    const before = await hulls();
    const at = before.find((hull) => hull.name === 'Corvette');
    await aim(page, ['pick', at.xM, at.zM, SELECT.distance, 0, SELECT.pitchDeg, at.depthM]);
    await page.waitForTimeout(software ? 4000 : 1500);
    await page.mouse.click(...centre);
    await page.waitForTimeout(1000);
    await aim(page, ['order', ...MARK_AT, SELECT.distance, 0, SELECT.pitchDeg, MARK_DEPTH_M]);
    await page.waitForTimeout(software ? 4000 : 1500);
    await page.mouse.click(...centre, { button: 'right' });
    await page.waitForTimeout(2000);
    const now = await comeToRest('Corvette');
    assert.ok(
      Math.abs(now.depthM - MARK_DEPTH_M) < 5 &&
        Math.hypot(now.xM - MARK_AT[0], now.zM - MARK_AT[1]) < 30,
      `the Corvette rests at ${now.xM}, ${now.zM}, ${now.depthM} m, not where it was sent`
    );
    // The click took the Corvette and nothing else.
    for (const hull of before.filter((hull) => hull.name !== 'Corvette')) {
      const stood = await hullAt(hull.name);
      assert.ok(
        Math.hypot(stood.xM - hull.xM, stood.zM - hull.zM) < 30,
        `the ${hull.name} went with the Corvette`
      );
    }
    // The order's own marks fade; the frame is the hull at rest, still picked.
    await page.waitForTimeout(software ? 6000 : 3000);
  };

  if (process.env.CLIP === '1') {
    // The clip: Home out over the bowl to gate 6's low camera at High, the
    // camera moved a step a frame, so the river is seen from both.
    await setQuality('high');
    const [from, to] = [POSES[0], POSES[2]];
    await aim(page, from);
    await page.waitForTimeout(2000);
    // Where the move starts and ends in the recording, to cut the clip by.
    const mark = (what) =>
      console.log(`clip: ${what} ${((Date.now() - (recordingStartedMs ?? Date.now())) / 1000).toFixed(1)} s in`);
    mark('the move starts');
    const steps = Number(process.env.CLIP_STEPS ?? 120);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const ease = t * t * (3 - 2 * t);
      const pose = from.map((v, k) => (k === 0 ? 'clip' : v + (to[k] - v) * ease));
      await aim(page, pose);
      await page.waitForTimeout(Number(process.env.CLIP_STEP_MS ?? 50));
    }
    mark('the move ends');
    // Held over the bowl, for the river's drift.
    await page.waitForTimeout(Number(process.env.CLIP_HOLD_MS ?? 6000));
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
  const take = async (quality, poses) => {
    for (const pose of poses) {
      const name = pose[0];
      // FRAMES names cameras; `mark` names the staged frame.
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
        hulls: await hulls(),
        // Whether the camera's sway and the bodies were held (reduced motion).
        sway: probe.sway ?? null,
        // What the crater stands at this quality, and the lights its fry and
        // its jellies carry.
        life: {
          bodies: probe.fixtureAssets,
          glints: probe.lifeGlints ?? 0,
          // The points of a jelly's lantern: its glow, its seats, its beads.
          jellyLights: probe.jellyLights ?? 0,
          // The far bloom's lanterns, of the jellies the crater stands.
          farLanterns: probe.farLanterns ?? 0,
        },
        // Columns standing over the vent stand's chimneys, and the world's sources.
        vents: { plumes: probe.ventPlumes, worldLights: probe.graphicsQuality?.worldLights ?? 0 },
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
    await take('low', [...POSES, RIVER]);
  }
  if (qualities.includes('high')) {
    await setQuality('high');
    await take('high', [...POSES, RIVER]);
  }
  // The staged frame last, since it moves a hull: High, then Low as its
  // control, the same hull at the same place with no river over it.
  if (!only || only.includes('mark')) {
    await setQuality('high');
    await sendOut();
    if (qualities.includes('high')) await take('high', [MARK]);
    if (qualities.includes('low')) {
      await setQuality('low');
      await take('low', [MARK]);
    }
  }
  const high = readings.filter((reading) => reading.quality === 'high');
  if (high.length > 0) {
    assert.ok(
      high.every((reading) => reading.life.glints > 144),
      'High stands no more fry than Low'
    );
    assert.ok(
      high.every((reading) => (reading.life.bodies['env-drift-jelly'] ?? 0) > 0),
      'High stands no jelly'
    );
    assert.ok(
      high.every((reading) => reading.life.farLanterns > 0),
      'High stands no far bloom'
    );
  }
};
