// The own hulls' searchlights (#1836), as a run-game steps module: the three
// cameras docs/screenshots/issue-1799/README.md judges a look at, and gate 6's
// fourth, in the free-water crater with the HUD on. Low first, as the control,
// then High five times over: the fleet at rest, a hull parked in another's
// beam for its shadow and moved off again for that frame's control, the fleet
// under way, on Silent Running, since a beam's strength is its hull's loudness
// (limit 5), and one hull at the foot of the rim, for rock in a beam (#1842).
//
//   SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' VIEW_W=1920 VIEW_H=1080 \
//     node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1836/software/poses --steps docs/screenshots/issue-1836/frames.mjs
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
// How far off the pool the shadow frame's control sends the Harvester, square
// to the beam and toward the camera. That camera's lower edge meets the
// ground about 150 m on its own side of the pool, and a hull's ring reaches
// 50 m from it, so this takes the hull and its ring out of the frame.
const OFF_M = 260;
// Rock in a beam (#1842): the Corvette alone, sent over the west rim's lip
// to the bowl's floor and back at the wall, so it stops at the rim's foot
// with its bow, and so its beam, raking the rock. The crater's rim is level
// where the fleet opens, and no other frame here puts rock in a cone. The
// second leg is the heading it rests at. `RIM` is the frame's camera: square
// across the beam from its left, about the water a little ahead of the lamp.
const RIM_LEGS = [
  [1350, 1950],
  [1175, 2075],
];
const RIM = { aheadM: 80, distance: 360, pitchDeg: 35 };
// A cast edge (#1842): rock's shadow on other lit ground. From the rim's foot
// the Corvette is sent round to the trench south of the two mesas, `CAST.clearM`
// over its floor, and its last leg turns it to `CAST.headingDeg`. There its
// beam grazes the west mesa's south-east corner, and the corner cuts the pool
// on the floor beyond it with a straight edge. An order on a raised focus plane
// is an order to that depth (#1132), and the route goes round the rock at it
// (pathfinding.ts). `CAST.focus` is where the cut lies, the frame's centre.
const CAST = {
  at: [1600, 3600],
  headingDeg: 330,
  leadM: 160,
  clearM: 450,
  focus: [1810, 3470],
  distance: 420,
  yawDeg: 0,
  pitchDeg: 35,
};

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
  // Each hull as a frame has it: its live SIG, which is what its beam is made
  // of, where it stands, its model's box on the screen, and its beam's lamp
  // and aim at this camera. Two frames are a pair only where these agree.
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
          screen: hull.screen,
          beam:
            beam === undefined
              ? null
              : {
                  xM: round(beam.x),
                  zM: round(beam.z),
                  bearingDeg: round((Math.atan2(beam.dx, -beam.dz) * 180) / Math.PI),
                  depressionDeg: round((Math.asin(-beam.dy) * 180) / Math.PI),
                },
        };
      });
    });
  const hullAt = (name) =>
    page.evaluate((name) => {
      const hull = window.__perspectiveLamps().units.find((unit) => unit.name === name);
      return { x: hull.xM, z: hull.zM, depthM: hull.depthM, sig: hull.sig, restSig: hull.restSig };
    }, name);
  // A hull is at rest when a second moves it nowhere and its SIG is back at
  // idle: a dive holds it loud until the depth is made.
  const comeToRest = async (name) => {
    let was = await hullAt(name);
    for (let i = 0; i < 300; i++) {
      await page.waitForTimeout(1000);
      const now = await hullAt(name);
      const still =
        Math.hypot(now.x - was.x, now.z - was.z) < 0.5 && Math.abs(now.depthM - was.depthM) < 0.5;
      if (still && now.sig <= now.restSig + 0.5) return now;
      was = now;
    }
    assert.fail(`the ${name} never came to rest`);
  };

  // At the survey dolly the map is square to the screen, north up, so a plan
  // point is a pixel: read off the survey frame at 1920 × 1080, the map's
  // west edge is at x 650 and its north edge at y 232, 6.45 m to a pixel.
  const px = (xM, zM) => {
    const view = page.viewportSize();
    const k = view.height / 1080;
    return [(650 + xM / 6.45) * k + (view.width - 1920 * k) / 2, (232 + zM / 6.45) * k];
  };
  // Select the three hulls where they stand, from the survey camera: a drag
  // about them all, since the shadow frame and its control have moved the
  // Harvester from where the match opens it. The selection is kept after the
  // order, so Silent Running is asked of the same three.
  const selectFleet = async () => {
    const at = await page.evaluate(() =>
      window.__perspectiveLamps().units.map((hull) => [hull.xM, hull.zM])
    );
    const [xs, zs] = [at.map(([x]) => x), at.map(([, z]) => z)];
    const pad = 150;
    const [x0, y0] = px(Math.min(...xs) - pad, Math.min(...zs) - pad);
    const [x1, y1] = px(Math.max(...xs) + pad, Math.max(...zs) + pad);
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
  // A hull's pool as the shadow frame will draw it. A hull is drawn larger at
  // the far dollies and its lamp hangs off its drawn bow, so the pool read at
  // the survey camera lies some 100 m down the beam of the one a near frame
  // shows, at that pool's faint end.
  const poolNear = async (name) => {
    const hull = await hullAt(name);
    await aim(page, ['near', hull.x, hull.z, SHADOW.distance, 0, SHADOW.pitchDeg, hull.depthM]);
    await page.waitForTimeout(software ? 4000 : 1500);
    return poolOf(name);
  };
  // The survey camera, where a plan point is a pixel and a click an order.
  const survey = async () => {
    await aim(page, POSES[3]);
    await page.waitForTimeout(software ? 4000 : 1500);
  };
  // Where the shadow frame's control sends the Harvester off a pool: `OFF_M`
  // square to the beam, on a side that is level rim the whole way, the
  // beam's right first. A beam that #1840 has swung can lie along the
  // crater's lip, and a hull sent over the lip dives 900 m.
  const wayOff = (pool) =>
    page.evaluate(
      ({ pool, off }) => {
        const bearing = (pool.bearingDeg * Math.PI) / 180;
        const floor = window.__perspectiveSeabedM(pool.x, pool.z);
        const level = (x, z) => Math.abs(window.__perspectiveSeabedM(x, z) - floor) < 120;
        for (const side of [1, -1]) {
          const [dx, dz] = [Math.cos(bearing) * side, Math.sin(bearing) * side];
          let clear = true;
          // The way there, and 80 m about where it ends: a click from the
          // survey camera lands some 25 m off its point.
          for (let d = 0; d <= off + 80; d += 20) {
            clear &&= level(pool.x + dx * d, pool.z + dz * d);
          }
          for (const along of [-80, 80]) {
            clear &&= level(pool.x + dx * off - dz * along, pool.z + dz * off + dx * along);
          }
          if (clear) return { side, x: pool.x + dx * off, z: pool.z + dz * off };
        }
        return null;
      },
      { pool, off: OFF_M }
    );
  // A hull in a beam: the Harvester, sent alone into the Corvette's pool. A
  // move order takes it down to the floor there, so its shadow lies on the
  // lit ground beside it. It rests at SIG 18, where its own beam is about a
  // ninth of the Corvette's. The Light Scout would not do: it holds its
  // depth on a move, over the beam. A hull passing near another nudges it.
  // Until #1840 the conn view also turned a hull to where it last moved, so
  // the Corvette's beam swung as the Harvester arrived; the park is still
  // tried until the Harvester stands in the pool as it then lies.
  const parkInBeam = async () => {
    await survey();
    const [sx, sy] = px(375, 1875);
    await page.mouse.click(sx, sy);
    await page.waitForTimeout(1000);
    for (let attempt = 0; attempt < 5; attempt++) {
      const pool = await poolNear('Corvette');
      assert.ok(pool !== null, 'the Corvette throws no beam to park a hull in');
      await survey();
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
      const now = await poolNear('Corvette');
      const at = await page.evaluate(() => {
        const hull = window.__perspectiveLamps().units.find((unit) => unit.name === 'Harvester');
        return { x: hull.xM, z: hull.zM, depthM: hull.depthM };
      });
      if (now !== null && Math.hypot(now.x - at.x, now.z - at.z) < 45) {
        // Square across the beam: the camera's yaw is its bearing, negated.
        // From the beam's right, or from its left where the control's way
        // off the pool is the left: the hull leaves toward the camera.
        const off = await wayOff(now);
        const yawDeg = -(now.bearingDeg - 90) + (off?.side === -1 ? 180 : 0);
        return {
          pose: ['pool', now.x, now.z, SHADOW.distance, yawDeg, SHADOW.pitchDeg, at.depthM],
          pool: now,
          off,
        };
      }
    }
    assert.fail('the Harvester never stood in the Corvette\'s pool');
  };
  // The shadow frame's control (#1842): the same pose with the pool empty. A
  // pool's own edge and a shadow's look alike, so the hull's shadow is what
  // differs between the two frames. The Harvester is still the selection. It
  // goes square off the beam and toward the camera, past the frame's lower
  // edge, and its own faint beam, which looks where it last went, goes with
  // it. It leaves away from the Corvette, so separation shoves nothing and
  // the beam the two frames share does not swing (#1840).
  const clearPool = async ({ pool, off }) => {
    if (off === null) return false;
    await survey();
    await page.mouse.click(...px(off.x, off.z), { button: 'right' });
    await page.waitForTimeout(2000);
    const at = await comeToRest('Harvester');
    assert.ok(
      Math.hypot(at.x - pool.x, at.z - pool.z) > OFF_M - 80,
      'the Harvester did not leave the pool'
    );
    return true;
  };
  // Rock in a beam (#1842). The fleet is still the selection, under way on
  // Silent Running: it is made loud again and stopped, so the Corvette can be
  // picked out of it by a click where it stands. Each leg is waited out, the
  // dive with it. The beam is read at the frame's own dolly, since a hull is
  // drawn larger at the survey's and its lamp hangs off its drawn bow.
  const parkAtRimFoot = async () => {
    await page.keyboard.press('Space');
    await page.waitForFunction(
      () => window.__perspectiveLamps().units.every((hull) => !hull.silentRunning),
      null,
      { timeout: 30000 }
    );
    await page.keyboard.press('KeyX');
    const stood = {};
    for (const name of ['Light Scout', 'Harvester', 'Corvette']) {
      stood[name] = await comeToRest(name);
    }
    await survey();
    await page.mouse.click(...px(stood.Corvette.x, stood.Corvette.z));
    await page.waitForTimeout(1000);
    let at;
    for (const [x, z] of RIM_LEGS) {
      await page.mouse.click(...px(x, z), { button: 'right' });
      await page.waitForTimeout(2000);
      at = await comeToRest('Corvette');
      assert.ok(
        Math.hypot(at.x - x, at.z - z) < 80,
        `the Corvette stopped at ${Math.round(at.x)}, ${Math.round(at.z)}, not at ${x}, ${z}`
      );
    }
    // The click took the Corvette and nothing else. A hull leaving a fleet
    // that has bunched shoves the others some tens of metres; one that went
    // with it has gone a kilometre.
    for (const name of ['Light Scout', 'Harvester']) {
      const now = await hullAt(name);
      assert.ok(
        Math.hypot(now.x - stood[name].x, now.z - stood[name].z) < 150,
        `the ${name} went with the Corvette`
      );
    }
    await aim(page, ['near', at.x, at.z, RIM.distance, 0, RIM.pitchDeg, at.depthM]);
    await page.waitForTimeout(software ? 4000 : 1500);
    const beam = (await hulls()).find((hull) => hull.name === 'Corvette').beam;
    assert.ok(beam !== null, 'the Corvette throws no beam at the rim');
    const bearing = (beam.bearingDeg * Math.PI) / 180;
    return [
      'foot',
      beam.xM + Math.sin(bearing) * RIM.aheadM,
      beam.zM - Math.cos(bearing) * RIM.aheadM,
      RIM.distance,
      -(beam.bearingDeg + 90),
      RIM.pitchDeg,
      at.depthM,
    ];
  };
  // A cast edge (#1842). The Corvette is picked where it stands, alone, and
  // sent at `CAST`'s depth: a leg to a point `leadM` behind the pose, then
  // one to the pose, which leaves it heading along the second. Each order is
  // a right click on the view's centre, which is the camera's focus, looking
  // straight down on it from over the water: nothing stands between.
  const parkAtCastEdge = async () => {
    const view = page.viewportSize();
    const centre = [view.width / 2, view.height / 2];
    const before = await hulls();
    const stood = before.find((hull) => hull.name === 'Corvette');
    await survey();
    await page.mouse.click(...px(stood.xM, stood.zM));
    await page.waitForTimeout(1000);
    const heading = (CAST.headingDeg * Math.PI) / 180;
    const [x, z] = CAST.at;
    const floorAt = (at) => page.evaluate(([x, z]) => window.__perspectiveSeabedM(x, z), at);
    const depthM = (await floorAt(CAST.at)) - CAST.clearM;
    for (const leg of [
      [x - Math.cos(heading) * CAST.leadM, z - Math.sin(heading) * CAST.leadM],
      [x, z],
    ]) {
      await aim(page, ['order', ...leg, 300, 0, 88, depthM]);
      await page.waitForTimeout(software ? 4000 : 1500);
      await page.mouse.click(...centre, { button: 'right' });
      await page.waitForTimeout(2000);
      const at = await comeToRest('Corvette');
      assert.ok(
        Math.hypot(at.x - leg[0], at.z - leg[1]) < 40 && Math.abs(at.depthM - depthM) < 10,
        `the Corvette rests at ${[at.x, at.z, at.depthM].map(Math.round).join(', ')} m, ` +
          `not at ${[...leg, depthM].map(Math.round).join(', ')} m`
      );
    }
    // The click took the Corvette and nothing else.
    for (const hull of before.filter((hull) => hull.name !== 'Corvette')) {
      const now = await hullAt(hull.name);
      assert.ok(
        Math.hypot(now.x - hull.xM, now.z - hull.zM) < 150,
        `the ${hull.name} went with the Corvette`
      );
    }
    const floorM = await floorAt(CAST.focus);
    return ['edge', ...CAST.focus, CAST.distance, CAST.yawDeg, CAST.pitchDeg, floorM];
  };
  // The selection is made once: a second drag, over water the fleet has
  // left, would drop it.
  let legs = 0;
  const orderUnderWay = async () => {
    await survey();
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
  // A staged frame that cannot be staged is said, at once and again at the
  // end, and the frames after it are still taken: the take on the named GPU
  // is one run.
  const failed = [];
  const staged = async (what, stage) => {
    try {
      await stage();
    } catch (error) {
      failed.push(`${what}: ${error.message}`);
      console.log(`WARNING: no ${what}: ${error.message}`);
    }
  };
  let dir;
  // Written after every frame, so a stage that fails late costs no reading
  // taken before it.
  const write = () =>
    writeFileSync(
      join(dir, 'readings.json'),
      JSON.stringify({ renderer, software, unpaced, viewport, readings }, null, 2) + '\n'
    );
  // `moving` frames follow the fleet: aimed at where it is and taken at
  // once, since a station's hold is seconds and a hull under way is not
  // there after it. Their GPU time is not read; the frames at rest draw the
  // same passes.
  const take = async (quality, state, poses, moving = false) => {
    for (const still of poses) {
      const name = still[0];
      // FRAMES names cameras; a staged frame has one pose and is always taken.
      if (only && POSES.some((camera) => camera[0] === name) && !only.includes(name)) continue;
      let pose = moving ? await follow(still) : still;
      await aim(page, pose);
      const label = state === null ? `${quality}-${name}` : `${quality}-${state}-${name}`;
      let probe;
      if (moving) {
        // Chased up to the shot: the last aim is a frame or two old when the
        // frame is taken, and a hull under way covers 30 m a second.
        // Twice on a software rasteriser, where a round trip to the page is
        // seconds and the leg is not long: once to see the hull, once to lead it.
        for (let i = 0; i < (software ? 2 : 4); i++) {
          pose = await follow(still);
          await aim(page, pose);
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
        camera: pose.slice(1),
        // Whether the camera's sway was held (reduced motion) or on: a pair
        // of frames lies pixel on pixel only where it was held.
        sway: probe.sway ?? null,
        hulls: await hulls(),
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
      write();
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
    // A hull in a beam, for the shadow it throws on the lit ground, and the
    // same pose with the pool empty: the pair's difference is the shadow.
    await staged('shadow frame and its control', async () => {
      const parked = await parkInBeam();
      await take('high', 'shadow', [parked.pose]);
      assert.ok(await clearPool(parked), 'the shadow frame has no level way off its pool');
      await take('high', 'shadow', [['pool-empty', ...parked.pose.slice(1)]]);
      const [lit, empty] = readings.slice(-2).map((frame) => frame.hulls);
      const beam = (frame) => frame.find((hull) => hull.name === 'Corvette').beam;
      const [a, b] = [beam(lit), beam(empty)];
      assert.ok(a !== null && b !== null, 'the Corvette threw no beam in the pair');
      const box = empty.find((hull) => hull.name === 'Harvester').screen;
      // A bearing is read between -180 and 180, and a beam that #1840 has
      // swung south lies at the seam.
      const turned = Math.abs(((a.bearingDeg - b.bearingDeg + 540) % 360) - 180);
      const control = {
        against: 'pool',
        // What must not have moved between the two: the beam they share.
        lampMovedM: Number(Math.hypot(a.xM - b.xM, a.zM - b.zM).toFixed(1)),
        beamTurnedDeg: Number(Math.hypot(turned, a.depressionDeg - b.depressionDeg).toFixed(1)),
        // And what must have left: the Harvester's model, off the viewport.
        harvesterInFrame:
          box !== null &&
          box.x1 > 0 &&
          box.x0 < viewport.width &&
          box.y1 > 0 &&
          box.y0 < viewport.height,
        // With the sway on the two frames stand some pixels apart, and their
        // difference draws every edge: said, and not a failure.
        sway: readings.at(-1).sway,
      };
      readings.at(-1).control = control;
      write();
      const said =
        `lamp moved ${control.lampMovedM} m · beam turned ${control.beamTurnedDeg}° · ` +
        `Harvester ${control.harvesterInFrame ? 'in' : 'off'} the frame · sway ${control.sway}`;
      assert.ok(
        control.lampMovedM <= 1 && control.beamTurnedDeg <= 0.5 && !control.harvesterInFrame,
        `the shadow frame and its control are not a pair: ${said}`
      );
      console.log(`shadow control: ${said}`);
    });
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
    // Rock in a beam: the Corvette at the foot of the rim, at rest.
    await staged('rim frame', async () => take('high', 'rim', [await parkAtRimFoot()]));
    // A cast edge, and the same frame with the ground's shadow off: nothing
    // moves between them, and the walk then finds no ground, so the pair
    // differs by what the walk cuts.
    await staged('cast edge and its control', async () => {
      const pose = await parkAtCastEdge();
      await take('high', 'cast', [pose]);
      try {
        assert.equal(await page.evaluate(() => window.__perspectiveGroundShadow(false)), false);
        await take('high', 'cast', [['open', ...pose.slice(1)]]);
      } finally {
        await page.evaluate(() => window.__perspectiveGroundShadow(true));
      }
      const [a, b] = readings
        .slice(-2)
        .map((frame) => frame.hulls.find((hull) => hull.name === 'Corvette').beam);
      assert.ok(a !== null && b !== null, 'the Corvette threw no beam in the pair');
      const turned = Math.abs(((a.bearingDeg - b.bearingDeg + 540) % 360) - 180);
      const control = {
        against: 'edge',
        groundShadow: false,
        lampMovedM: Number(Math.hypot(a.xM - b.xM, a.zM - b.zM).toFixed(1)),
        beamTurnedDeg: Number(Math.hypot(turned, a.depressionDeg - b.depressionDeg).toFixed(1)),
        sway: readings.at(-1).sway,
      };
      readings.at(-1).control = control;
      write();
      const said =
        `lamp moved ${control.lampMovedM} m · beam turned ${control.beamTurnedDeg}° · ` +
        `sway ${control.sway}`;
      assert.ok(
        control.lampMovedM <= 1 && control.beamTurnedDeg <= 0.5,
        `the cast edge and its control are not a pair: ${said}`
      );
      console.log(`cast control: ${said}`);
    });
  }
  for (const r of readings) {
    console.log(
      `${r.quality} ${r.state ?? ''} ${r.name}: ${r.calls} calls · ${r.triangles} triangles · ` +
        `${r.searchlights ?? 0} beams · SIG ${r.hulls.map((h) => h.sig).join(', ')}` +
        (r.queued === null ? '' : ` · ${r.queued.gpuMs} ms queued`)
    );
  }
  assert.equal(failed.length, 0, `frames not staged: ${failed.join('; ')}`);
};
