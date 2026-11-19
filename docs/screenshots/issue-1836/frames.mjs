// The own hulls' searchlights (#1836), as a run-game steps module: the three
// cameras docs/screenshots/issue-1799/README.md judges a look at, and gate 6's
// fourth, in the free-water crater with the HUD on. Low first, as the control,
// then High four times over: the fleet at rest, a hull parked in another's
// beam for its shadow, the fleet under way, and on Silent Running, since a
// beam's strength is its hull's loudness (limit 5).
//
//   SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' VIEW_W=1920 VIEW_H=1080 \
//     node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1836/software --steps docs/screenshots/issue-1836/frames.mjs
//
// On the named GPU, headed and unpaced, which is the run whose frames are
// offered for acceptance and whose GPU time is gate 6's:
//
//   UNPACED=1 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
//     --headed --channel msedge --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1836/gpu --steps docs/screenshots/issue-1836/frames.mjs
//
// QUALITY=low takes the control alone, which is how `main`'s Low is taken.
// CLIP=1 with drive.mjs's RECORD_VIDEO=<dir> moves the camera from Home to
// Close at High instead, over the fleet at rest, for the clip. TRAVEL_S is
// how long the hulls run before an under-way frame. A software
// rasteriser's frames are labelled so in readings.json and are never offered
// for acceptance; its millisecond fields measure the rasteriser.
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
// Where the under-way orders send the fleet: north along the west rim, past
// the garden, then the length of the rim south. A frame a leg, so each finds
// the fleet moving: the near camera first, on the short leg.
const GOALS = [
  [500, 300],
  [500, 3700],
];

// The shadow frame's camera, about the Corvette's pool once the Harvester is
// parked in it: a dolly and a pitch, looking square across the beam, so a
// shadow thrown down the beam lies to one side of what throws it.
const SHADOW = { distance: 360, pitchDeg: 35 };

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
  const setQuality = async (quality) => {
    const drawn = await page.evaluate((q) => window.__perspectiveQuality(q), quality);
    assert.equal(drawn, quality, `the view draws ${drawn}, asked ${quality}`);
    // The ground is rebuilt for the quality; let its programs link.
    await page.waitForFunction(() => !window.__perspectiveProbe().programHold.holding, null, {
      timeout: 120000,
    });
    return drawn;
  };
  // Each hull's live SIG, which is what its beam is made of.
  const sigs = () =>
    page.evaluate(() =>
      window.__perspectiveLamps().units.map((hull) => ({
        sig: hull.sig,
        restSig: hull.restSig,
        silentRunning: hull.silentRunning,
      }))
    );

  // At the survey dolly the map is square to the screen, north up, so a plan
  // point is a pixel: read off the survey frame at 1920 × 1080, the map's
  // west edge is at x 650 and its north edge at y 232, 6.45 m to a pixel.
  const px = (xM, zM) => {
    const view = page.viewportSize();
    const k = view.height / 1080;
    return [(650 + xM / 6.45) * k + (view.width - 1920 * k) / 2, (232 + zM / 6.45) * k];
  };
  // Select the three hulls where the match opens them, on the west rim, from
  // the survey camera. The selection is kept after the order, so Silent
  // Running is asked of the same three.
  const selectFleet = async () => {
    const [x0, y0] = px(150, 1650);
    const [x1, y1] = px(950, 2300);
    await page.mouse.move(x0, y0);
    await page.mouse.down({ button: 'left' });
    await page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 });
    await page.mouse.move(x1, y1, { steps: 4 });
    await page.mouse.up({ button: 'left' });
    await page.waitForTimeout(1500);
  };
  // Where a hull's beam meets the ground, in plan, and its bearing: read
  // off the view's own beams (`__perspectiveSearchlights`).
  const poolOf = (name) =>
    page.evaluate((name) => {
      const id = window.__perspectiveLamps().units.find((unit) => unit.name === name).id;
      const beam = window.__perspectiveSearchlights().lights.find((light) => light.hull === id);
      if (beam === undefined) return null;
      // The drawn column is 0.22 of its depth (perspectiveTerrain.ts).
      const groundY = -0.22 * window.__perspectiveSeabedM(beam.x, beam.z);
      const t = (beam.y - groundY) / -beam.dy;
      return {
        x: beam.x + beam.dx * t,
        z: beam.z + beam.dz * t,
        bearingDeg: (Math.atan2(beam.dx, -beam.dz) * 180) / Math.PI,
      };
    }, name);
  // A hull in a beam: the Harvester, sent alone into the Corvette's pool. A
  // move order takes it down to the floor there, so its shadow lies on the
  // lit ground beside it. It rests at SIG 18, where its own beam is a
  // twentieth of the Corvette's. The Light Scout would not do: it holds its
  // depth on a move, over the beam. A hull passing near another nudges it,
  // and a hull's heading is where it last moved, so the Corvette's beam may
  // swing as the Harvester arrives: the park is tried until the Harvester
  // stands in the pool as it then lies.
  const parkInBeam = async () => {
    await aim(page, POSES[3]);
    await page.waitForTimeout(software ? 4000 : 1500);
    const [sx, sy] = px(375, 1875);
    await page.mouse.click(sx, sy);
    await page.waitForTimeout(1000);
    for (let attempt = 0; attempt < 5; attempt++) {
      const pool = await poolOf('Corvette');
      assert.ok(pool !== null, 'the Corvette throws no beam to park a hull in');
      const [gx, gy] = px(pool.x, pool.z);
      await page.mouse.click(gx, gy, { button: 'right' });
      await page.waitForFunction(
        ([x, z]) => {
          const hull = window.__perspectiveLamps().units.find((unit) => unit.name === 'Harvester');
          return Math.hypot(hull.xM - x, hull.zM - z) < 40 && hull.sig <= 18;
        },
        [pool.x, pool.z],
        { timeout: 180000 }
      );
      await page.waitForTimeout(3000);
      const now = await poolOf('Corvette');
      const at = await page.evaluate(() => {
        const hull = window.__perspectiveLamps().units.find((unit) => unit.name === 'Harvester');
        return { x: hull.xM, z: hull.zM, depthM: hull.depthM };
      });
      if (now !== null && Math.hypot(now.x - at.x, now.z - at.z) < 45) {
        // Square across the beam: the camera's yaw is its bearing, negated.
        return ['pool', now.x, now.z, SHADOW.distance, -(now.bearingDeg - 90), SHADOW.pitchDeg, at.depthM];
      }
    }
    assert.fail('the Harvester never stood in the Corvette\'s pool');
  };
  // The selection is made once: a second drag, over water the fleet has
  // left, would drop it.
  let legs = 0;
  const orderUnderWay = async () => {
    await aim(page, POSES[3]);
    await page.waitForTimeout(software ? 4000 : 1500);
    if (legs === 0) await selectFleet();
    const [gx, gy] = px(...GOALS[legs++ % GOALS.length]);
    await page.mouse.click(gx, gy, { button: 'right' });
    await page.waitForTimeout(Number(process.env.TRAVEL_S ?? 4) * 1000);
  };
  // The Home and Close cameras carried to where the fleet is now, at the
  // depth it now runs at: a move order takes a hull down to the floor it is
  // sent over. Home keeps its eye about the fleet's centroid, as the opening's
  // is. Close is a near camera and a fleet under way strings out, so it is
  // carried to the loudest hull, whose beam is the brightest. Each is led by
  // how far its subject moved since the last call: a frame is a second old on
  // a software rasteriser by the time it is taken, and a hull covers 30 m in
  // it. On a GPU the lead is a metre or two.
  let last = null;
  const follow = async (pose) => {
    const now = await page.evaluate(() => {
      const units = window.__perspectiveLamps().units;
      const loudest = units.reduce((a, b) => (b.sig > a.sig ? b : a));
      return {
        centre: window.__perspectiveProbe().ownCentre,
        loudest: { x: loudest.xM, z: loudest.zM },
        depthM: units.reduce((sum, hull) => sum + hull.depthM, 0) / units.length,
      };
    });
    const at = pose[0] === 'close' ? now.loudest : now.centre;
    const lead =
      last !== null && last.name === pose[0] ? { x: at.x - last.x, z: at.z - last.z } : { x: 0, z: 0 };
    last = { name: pose[0], x: at.x, z: at.z };
    const [x, z] =
      pose[0] === 'close'
        ? [at.x + lead.x, at.z + lead.z]
        : [pose[1] + at.x + lead.x - 542, pose[2] + at.z + lead.z - 1958];
    return [pose[0], x, z, pose[3], pose[4], pose[5], now.depthM];
  };

  if (process.env.CLIP === '1') {
    // The clip: Home to Close at High, the camera moved a step a frame, over
    // the fleet at rest: the Corvette's beam and its pool, and the Harvester's.
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
  // `moving` frames follow the fleet: aimed at where it is and taken at
  // once, since a station's hold is seconds and a hull under way is not
  // there after it. Their GPU time is not read; the frames at rest draw the
  // same passes.
  const take = async (quality, state, poses, moving = false) => {
    for (const still of poses) {
      const name = still[0];
      if (only && !only.includes(name) && name !== 'pool') continue;
      const pose = moving ? await follow(still) : still;
      await aim(page, pose);
      const label = state === null ? `${quality}-${name}` : `${quality}-${state}-${name}`;
      let probe;
      if (moving) {
        // Chased up to the shot: the last aim is a frame or two old when the
        // frame is taken, and a hull under way covers 30 m a second.
        // Twice on a software rasteriser, where a round trip to the page is
        // seconds and the leg is not long: once to see the hull, once to lead it.
        for (let i = 0; i < (software ? 2 : 4); i++) {
          await aim(page, await follow(still));
          await page.waitForTimeout(software ? 1200 : 150);
        }
        probe = await page.evaluate(() => window.__perspectiveProbe());
      } else {
        probe = await settle(label);
      }
      dir = dirname(await shot(label));
      // Gate 6 reads GPU time queued as well (tools/render-stack/capture.mjs).
      let queued = null;
      if (!moving && probe.gpuTimer === 'timing') {
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
        state,
        passes: probe.passes,
        calls: probe.drawCalls,
        triangles: probe.triangles,
        searchlights: probe.graphicsQuality?.searchlights ?? null,
        hulls: await sigs(),
        graphicsQuality: probe.graphicsQuality ?? null,
        gpuTimer: probe.gpuTimer,
        avgGpuMs: probe.avgGpuMs,
        queued,
        // High's budget, read queued and unpaced on the named GPU (gate 6).
        insideBudget:
          quality === 'high' && queued !== null && budgetMs !== null && unpaced
            ? queued.gpuMs <= budgetMs
            : null,
        stationFrames: probe.stationFrames,
      });
    }
  };

  const asked = process.env.QUALITY;
  if (asked !== 'high') {
    await setQuality('low');
    await take('low', null, POSES);
  }
  if (asked !== 'low') {
    await setQuality('high');
    // At rest, each hull at its idle SIG.
    await take('high', 'rest', POSES);
    // A hull in a beam, for the shadow it throws on the lit ground.
    await take('high', 'shadow', [await parkInBeam()]);
    // Under way: a hull under way is louder, and its beam brighter.
    // The near camera is a GPU's alone: a software rasteriser's frame is
    // seconds old when it is taken, and a hull under way has left a 420 m
    // dolly's frame by then. The wide one holds it either way.
    await orderUnderWay();
    if (!software) await take('high', 'underway', [POSES[1]], true);
    await orderUnderWay();
    await take('high', 'underway', [POSES[0]], true);
    // On Silent Running the server holds each hull to SIG 3 to 8, under the
    // halo's floor: no beam and no pool. The selection is still the fleet's.
    await page.keyboard.press('Space');
    await page.waitForFunction(
      () => window.__perspectiveLamps().units.every((hull) => hull.silentRunning),
      null,
      { timeout: 30000 }
    );
    await page.waitForTimeout(1500);
    await take('high', 'silent', POSES.slice(0, 2), true);
  }
  const record = { renderer, software, unpaced, viewport, readings };
  writeFileSync(join(dir, 'readings.json'), JSON.stringify(record, null, 2) + '\n');
  for (const r of readings) {
    console.log(
      `${r.quality} ${r.state ?? ''} ${r.name}: ${r.calls} calls · ${r.triangles} triangles · ` +
        `${r.searchlights ?? 0} beams · SIG ${r.hulls.map((h) => h.sig).join(', ')}` +
        (r.queued === null ? '' : ` · ${r.queued.gpuMs} ms queued`)
    );
  }
};
