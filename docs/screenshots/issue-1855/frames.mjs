// Snow in a beam, and a beam across the vent stand's plume (#1855), as a
// run-game steps module. The three cameras docs/screenshots/issue-1799/README.md
// judges a look at, and gate 6's fourth, in the free-water crater with the HUD
// on. Low first, as the control, then High at the same four with the fleet at
// rest, then High twice more at one staged camera: the Corvette turned on the
// stand from 150 m, so its beam falls across both columns, and the same hull on
// Silent Running, which throws no beam and is that frame's control.
//
//   SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' VIEW_W=1920 VIEW_H=1080 \
//     node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1855/software --steps docs/screenshots/issue-1855/frames.mjs
//
// On the named GPU, headed and unpaced, which is the run whose frames are
// offered for acceptance and whose GPU time is gate 6's:
//
//   UNPACED=1 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
//     --headed --channel msedge --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1855/gpu --steps docs/screenshots/issue-1855/frames.mjs
//
// QUALITY=low takes the control alone, which is how `main`'s Low is taken.
// CLIP=1 with drive.mjs's RECORD_VIDEO=<dir> moves the camera from Home to
// Close at High instead, for the clip. A software rasteriser's frames are
// labelled so in readings.json and are never offered for acceptance; its
// millisecond fields measure the rasteriser.
//
// Reduced motion holds the snow's sink, the smoke's clock and the camera's
// sway, so the staged pair lies pixel on pixel and two software runs frame
// alike.
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
// The crater's vent stand: `FREE_WATER_HIGH_VENTS.CHIMNEYS` in
// packages/shared/src/constants.ts, the nearer to the Corvette first.
const CHIMNEYS = [
  [582, 2042],
  [562, 2018],
];
// The staged frame. The Corvette rests 109 m from the stand, heading east,
// with its beam on the rim beyond it. A move of `STEP_M` toward the stand
// turns it there, and an order given on a raised focus plane is an order to
// that depth (#1132): at `DEPTH_M` its lamp looks down across the columns
// some way over their mouths, where at the fleet's 300 m it lit the mouths
// alone. `SELECT` is the camera the hull is picked and ordered from, `PLUME`
// the frame's: square across the beam from its left, about the nearer
// chimney, with the bowl's dark water behind the smoke.
const STEP_M = 20;
const DEPTH_M = 150;
const SELECT = { distance: 300, pitchDeg: 60 };
const PLUME = { distance: 420, pitchDeg: 12, focusDepthM: 250 };
// The searchlight's cone: `HIGH_GRAPHICS.SEARCHLIGHT.INNER_DEG`, whole inside.
const INNER_DEG = 10;

/** halo-cost.mjs's load: about 3.6 ms on the named GPU (gpuQueueLoad.ts). */
const QUEUE_STEPS = Number(process.env.QUEUE_STEPS ?? 12000);

const aim = (page, [, x, z, distance, yawDeg, pitchDeg, focusDepthM]) =>
  page.evaluate(
    ({ x, z, distance, yawDeg, pitchDeg, focusDepthM }) =>
      window.__perspectiveCamera(x, z, distance, { yawDeg, pitchDeg, focusDepthM }),
    { x, z, distance, yawDeg, pitchDeg, focusDepthM }
  );

export default async ({ page, shot }) => {
  // A software rasteriser draws the staged camera at two seconds a frame.
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
  // High's own bodies and the vent stand decode after the switch.
  const setQuality = async (quality) => {
    const drawn = await page.evaluate((q) => window.__perspectiveQuality(q), quality);
    assert.equal(drawn, quality, `the view draws ${drawn}, asked ${quality}`);
    await page.waitForFunction(() => !window.__perspectiveProbe().programHold.holding, null, {
      timeout: 120000,
    });
    await page.waitForFunction(
      (high) => {
        const probe = window.__perspectiveProbe();
        const stacks = probe.fixtureAssets['env-vent-chimney'] ?? 0;
        return high ? stacks > 0 && probe.ventPlumes === stacks : stacks === 0;
      },
      quality === 'high',
      { timeout: 120000 }
    );
    await page.waitForTimeout(software ? 4000 : 1500);
    return drawn;
  };
  // Each hull as a frame has it: its live SIG, which is what its beam is made
  // of, where it stands, and its beam's lamp and aim at this camera.
  const hulls = () =>
    page.evaluate(() => {
      const round = (v) => Number(v.toFixed(1));
      const { lights } = window.__perspectiveSearchlights();
      return window.__perspectiveLamps().units.map((hull) => {
        const beam = lights.find((light) => light.hull === hull.id);
        return {
          name: hull.name,
          sig: hull.sig,
          restSig: hull.restSig,
          silentRunning: hull.silentRunning,
          xM: round(hull.xM),
          zM: round(hull.zM),
          depthM: round(hull.depthM),
          beam:
            beam === undefined
              ? null
              : {
                  xM: round(beam.x),
                  yM: round(beam.y),
                  zM: round(beam.z),
                  bearingDeg: round((Math.atan2(beam.dx, -beam.dz) * 180) / Math.PI),
                  depressionDeg: round((Math.asin(-beam.dy) * 180) / Math.PI),
                },
        };
      });
    });
  const hullAt = async (name) => (await hulls()).find((hull) => hull.name === name);
  // A hull is at rest when a second moves it nowhere and its SIG is back at
  // idle: a climb holds it loud until the depth is made.
  const comeToRest = async (name) => {
    let was = await hullAt(name);
    for (let i = 0; i < 300; i++) {
      await page.waitForTimeout(1000);
      const now = await hullAt(name);
      const still =
        Math.hypot(now.xM - was.xM, now.zM - was.zM) < 0.5 && Math.abs(now.depthM - was.depthM) < 0.5;
      if (i > 2 && still && now.sig <= now.restSig + 0.5) return now;
      was = now;
    }
    assert.fail(`the ${name} never came to rest`);
  };
  // Where a beam's axis passes each column: how far off the column's own axis
  // in plan, how high over the ground there, and the cone's whole radius at
  // that distance down the beam. The drawn column is 0.22 of its depth
  // (perspectiveTerrain.ts).
  const crossings = (beam) =>
    page.evaluate(
      ({ beam, chimneys, inner }) => {
        const bearing = (beam.bearingDeg * Math.PI) / 180;
        const fall = (beam.depressionDeg * Math.PI) / 180;
        const [dx, dz] = [Math.sin(bearing), -Math.cos(bearing)];
        return chimneys.map(([x, z]) => {
          const alongM = (x - beam.xM) * dx + (z - beam.zM) * dz;
          const missM = Math.abs((x - beam.xM) * dz - (z - beam.zM) * dx);
          const slantM = alongM / Math.cos(fall);
          const groundY = -0.22 * window.__perspectiveSeabedM(x, z);
          const round = (v) => Number(v.toFixed(1));
          return {
            chimney: [x, z],
            missM: round(missM),
            slantM: round(slantM),
            overGroundM: round(beam.yM - slantM * Math.sin(fall) - groundY),
            wholeRadiusM: round(slantM * Math.tan((inner * Math.PI) / 180)),
          };
        });
      },
      { beam, chimneys: CHIMNEYS, inner: INNER_DEG }
    );
  // The Corvette, picked where it stands and turned on the stand. Both
  // clicks land on the view's centre, which is the camera's focus: on the
  // hull to pick it, then on the water `STEP_M` nearer the stand at `DEPTH_M`.
  const turnOnStand = async () => {
    const view = page.viewportSize();
    const centre = [view.width / 2, view.height / 2];
    const before = await hulls();
    const at = before.find((hull) => hull.name === 'Corvette');
    await aim(page, ['pick', at.xM, at.zM, SELECT.distance, 0, SELECT.pitchDeg, at.depthM]);
    await page.waitForTimeout(software ? 4000 : 1500);
    await page.mouse.click(...centre);
    await page.waitForTimeout(1000);
    const [sx, sz] = CHIMNEYS[0];
    const range = Math.hypot(sx - at.xM, sz - at.zM);
    const goal = [
      at.xM + ((sx - at.xM) / range) * STEP_M,
      at.zM + ((sz - at.zM) / range) * STEP_M,
    ];
    await aim(page, ['order', ...goal, SELECT.distance, 0, SELECT.pitchDeg, DEPTH_M]);
    await page.waitForTimeout(software ? 4000 : 1500);
    await page.mouse.click(...centre, { button: 'right' });
    await page.waitForTimeout(2000);
    const now = await comeToRest('Corvette');
    assert.ok(
      Math.abs(now.depthM - DEPTH_M) < 5 && Math.hypot(now.xM - goal[0], now.zM - goal[1]) < 30,
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
    // The beam is read at the frame's own dolly: a hull is drawn larger at
    // the far dollies and its lamp hangs off its drawn bow.
    const framed = (bearingDeg) => [
      'plume',
      sx,
      sz,
      PLUME.distance,
      -(bearingDeg + 90),
      PLUME.pitchDeg,
      PLUME.focusDepthM,
    ];
    await aim(page, framed(Math.atan2(sx - now.xM, -(sz - now.zM)) * (180 / Math.PI)));
    await page.waitForTimeout(software ? 4000 : 1500);
    const beam = (await hullAt('Corvette')).beam;
    assert.ok(beam !== null, 'the Corvette throws no beam at the stand');
    const crossed = await crossings(beam);
    assert.ok(
      crossed.some((column) => column.slantM > 0 && column.missM <= column.wholeRadiusM),
      `the beam crosses no column: ${JSON.stringify(crossed)}`
    );
    return { pose: framed(beam.bearingDeg), crossed };
  };

  if (process.env.CLIP === '1') {
    // The clip: Home to Close at High, the camera moved a step a frame, then
    // held at Close, where the Corvette's cone stands and its snow sinks.
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
    await page.waitForTimeout(Number(process.env.CLIP_HOLD_MS ?? 6000));
    await shot('clip-end');
    return;
  }

  const only = process.env.FRAMES?.split(',');
  const readings = [];
  let dir;
  // Written after every frame, so a stage that fails late costs no reading
  // taken before it.
  const write = () =>
    writeFileSync(
      join(dir, 'readings.json'),
      JSON.stringify({ renderer, software, unpaced, viewport, readings }, null, 2) + '\n'
    );
  const take = async (quality, poses) => {
    for (const pose of poses) {
      const name = pose[0];
      // FRAMES names cameras; a staged frame is always taken.
      if (only && POSES.some((camera) => camera[0] === name) && !only.includes(name)) continue;
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
        // Beams thrown, and the fine snow they hand the GPU: a cell a beam.
        // A tree before #1855 reports no snow, which is none.
        searchlights: probe.graphicsQuality?.searchlights ?? 0,
        beamMotes: probe.graphicsQuality?.beamMotes ?? 0,
        camera: pose.slice(1),
        // Whether the camera's sway, the sink and the smoke were held.
        sway: probe.sway ?? null,
        hulls: await hulls(),
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

  const qualities = (process.env.QUALITY ?? 'low,high').split(',');
  if (qualities.includes('low')) {
    await setQuality('low');
    await take('low', POSES);
  }
  if (qualities.includes('high')) {
    await setQuality('high');
    await take('high', POSES);
    // A beam across the stand's plume, then the same hull silent: no beam,
    // no snow in one, and the smoke in the vent's light and the Lid's alone.
    const { pose, crossed } = await turnOnStand();
    await take('high', [pose]);
    readings.at(-1).crossed = crossed;
    write();
    await page.keyboard.press('Space');
    await page.waitForFunction(
      () => {
        const hull = window.__perspectiveLamps().units.find((unit) => unit.name === 'Corvette');
        const beams = window.__perspectiveSearchlights().lights;
        return hull.silentRunning && !beams.some((beam) => beam.hull === hull.id);
      },
      null,
      { timeout: 60000 }
    );
    await page.waitForTimeout(software ? 4000 : 1500);
    await take('high', [['plume-silent', ...pose.slice(1)]]);
    const [lit, silent] = readings.slice(-2);
    const beam = (frame) => frame.hulls.find((hull) => hull.name === 'Corvette').beam;
    assert.ok(beam(lit) !== null && beam(silent) === null, 'the pair is not a beam and none');
    assert.ok(lit.beamMotes > silent.beamMotes, 'the silent frame shows as much snow');
  }
  for (const r of readings) {
    console.log(
      `${r.quality} ${r.name}: ${r.calls} calls · ${r.triangles} triangles · ` +
        `${r.searchlights} beams · ${r.beamMotes} motes` +
        (r.queued === null ? '' : ` · ${r.queued.gpuMs} ms queued`)
    );
  }
};
