/**
 * The far bloom at the High graphics quality (docs/art-direction.md, "A far
 * bloom of lanterns"; docs/free-water-slice.md §5, "A far bloom over the
 * bowl"; #1859). What those sections promise: a river of whole lanterns over
 * the bowl and nowhere else, the last slots of High's list; thickest at its
 * middle, which starts at the loop's west end; over the hulls' depth; carried
 * clockwise round the eddy over the bowl, faster beside the stream and slower and
 * wider on its far side, each lantern wandering across the flow and heading
 * the way it travels; and a wave of light a third as strong as a lantern's by
 * the fleet.
 * What it looks like is the frames in docs/screenshots/issue-1859, and the
 * layer that stands it is booted in tutorialLoading.test.mjs.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Matrix4, ShaderLib, Vector3 } from 'three';
import { FREE_WATER_HIGH_LIFE, FREE_WATER_LIFE, HIGH_GRAPHICS } from '@echoes/shared';
import { terrainFor } from '../../backend/src/sim/maps/index.ts';
import { FREE_WATER_SLICE } from '../../backend/src/sim/maps/freeWaterSlice.ts';
import { propHash, propSpec } from '../src/game/environment.ts';
import { decorationPose, freeWaterPlacements } from '../src/game/freeWaterDecoration.ts';
import {
  jellyLightCount,
  jellyPulse,
  jellyWaveGain,
  patchJellyMembrane,
  writeJellyLights,
} from '../src/game/jellyLight.ts';
import { DEPTH_VISUAL_M_PER_M } from '../src/game/perspectiveTerrain.ts';

const { BLOOM, JELLIES } = FREE_WATER_HIGH_LIFE;
const { at, RADII_M, startDeg, SPAN_DEG, COUNT, depthM, STATION, MOTION, EDDY } = BLOOM;
const { PULSE, FAR } = HIGH_GRAPHICS.LIFE.JELLY;
const { LANTERN } = HIGH_GRAPHICS.LIFE.GLOW;

/** The bowl's authored floor, and the pocket's under it (docs/free-water-slice.md §3). */
const BOWL_FLOOR_M = 1500;
/** Where the fleet rests (§4). */
const HULLS_M = 300;

describe('the far bloom (#1859)', () => {
  const crater = terrainFor(FREE_WATER_SLICE).serialize();
  const high = freeWaterPlacements(crater, true, true);
  const river = high.filter((p) => p.far === true);
  const ground = () => 0;

  it('is the last slots of High’s list, whole lanterns of the jelly’s own file, and none of Low’s', () => {
    assert.equal(river.length, COUNT);
    assert.deepEqual(high.slice(-COUNT), river);
    for (const p of river) {
      assert.equal(p.slug, 'env-drift-jelly');
      assert.equal(p.scale, 1);
      assert.notEqual(p.disabled, true, 'the crater’s own ground refuses a lantern');
    }
    // The five by the fleet stay the first of their file's list, which is
    // what tells the membrane's program whose wave is the whole one.
    const jellies = high.filter((p) => p.slug === 'env-drift-jelly');
    assert.equal(jellies.length, JELLIES.SLOTS.length + COUNT);
    assert.ok(jellies.slice(0, JELLIES.SLOTS.length).every((p) => p.far !== true));
    assert.ok(jellies.slice(JELLIES.SLOTS.length).every((p) => p.far === true));
    assert.ok(!freeWaterPlacements(crater, true).some((p) => p.far === true));
  });

  it('sweeps open water over the bowl and nowhere else, a whole lap long', () => {
    // Every lantern's own loop, all the way round: the river goes round, so
    // the whole loop is its envelope and not its span alone.
    for (const p of river) {
      for (let step = 0; step < 720; step++) {
        const pose = decorationPose(p, (MOTION.periodS * 1000 * step) / 720, ground);
        const i =
          Math.floor(pose.z / crater.cellM) * crater.cols + Math.floor(pose.x / crater.cellM);
        assert.equal(crater.ceiling[i], 0, `a roof over ${pose.x}, ${pose.z}`);
        assert.ok(
          crater.floor[i]! >= BOWL_FLOOR_M,
          `the rim or the garden at ${pose.x}, ${pose.z}`
        );
      }
    }
    // Ground that shoals under the river refuses every lantern whose loop
    // crosses it, and a refused lantern keeps its slot and draws nothing: the
    // cell under the loop's north point, which every lantern's loop passes
    // over, raised over the shallowest of them.
    const under =
      Math.floor((at[1] - RADII_M[1]) / crater.cellM) * crater.cols +
      Math.floor(at[0] / crater.cellM);
    const shoaled = {
      ...crater,
      floor: crater.floor.map((floor, i) => (i === under ? depthM - STATION.depthM : floor)),
    };
    const refused = freeWaterPlacements(shoaled, true, true).filter((p) => p.far === true);
    assert.equal(refused.length, COUNT);
    assert.ok(refused.every((p) => p.disabled === true));
    assert.equal(freeWaterPlacements(shoaled, false, true).filter((p) => p.far === true).length, 0);
  });

  it('is an authored list: every lantern inside the band, over the hulls, leaning its own way', () => {
    const reach = propSpec('env-drift-jelly')!.footprintM / DEPTH_VISUAL_M_PER_M;
    for (const p of river) {
      const m = p.motion!;
      const eddy = m.eddy!;
      assert.deepEqual([p.xM, p.yM], [...at]);
      assert.deepEqual([m.radiusM, eddy.radiusNsM], [...RADII_M]);
      assert.ok(Math.abs(eddy.acrossM) <= STATION.acrossM);
      assert.ok(Math.abs(m.depthM! - depthM) <= STATION.depthM);
      // Its whole body, strands not counted, stands over the hulls.
      assert.ok(m.depthM! + reach < HULLS_M, `a lantern at ${m.depthM} m, among the hulls`);
      assert.equal(m.depthSwingM, 0);
      assert.equal(m.periodS, MOTION.periodS);
      assert.equal(m.axisM, JELLIES.MOTION.axisM);
      assert.ok(Math.abs(m.bankDeg!) <= MOTION.bankDeg);
      const off = (m.phase * 180) / Math.PI - startDeg;
      assert.ok(Math.abs(off) <= SPAN_DEG / 2, `a lantern ${off} degrees from the middle`);
      // The eddy's own two numbers, and a wander of its own: a whole number
      // of them a lap, so a lap brings it back.
      assert.deepEqual([eddy.skew, eddy.spread], [EDDY.SKEW, EDDY.SPREAD]);
      assert.ok(eddy.wanderM >= EDDY.WANDER_M[0] && eddy.wanderM <= EDDY.WANDER_M[1]);
      assert.ok(Number.isInteger(eddy.wanderLaps));
      assert.ok(eddy.wanderLaps >= EDDY.WANDER_LAPS[0] && eddy.wanderLaps <= EDDY.WANDER_LAPS[1]);
    }
    assert.equal(
      new Set(river.map((p) => `${p.motion!.phase}:${p.motion!.eddy!.acrossM}`)).size,
      COUNT
    );
    assert.ok(new Set(river.map((p) => p.motion!.bankDeg)).size > COUNT / 2);
    assert.ok(new Set(river.map((p) => p.motion!.eddy!.wanderPhase)).size > COUNT / 2);
  });

  it('is drawn from the fixture’s seed and nothing else', () => {
    // Every lantern is the fixture's seed, the loop's centre, its own number
    // and an axis through the registry's hash: no clock, no camera and no
    // match is an input, so every client draws the one river.
    river.forEach((p, i) => {
      const draw = (axis: number) => propHash([FREE_WATER_LIFE.SEED, at[0], at[1], i, axis]);
      const along = draw(1) + draw(2) - 1;
      const eddy = p.motion!.eddy!;
      assert.equal(p.motion!.phase, ((startDeg + (along * SPAN_DEG) / 2) * Math.PI) / 180);
      assert.equal(eddy.acrossM, (draw(3) * 2 - 1) * STATION.acrossM);
      assert.equal(p.motion!.depthM, depthM + (draw(4) * 2 - 1) * STATION.depthM);
      assert.equal(p.motion!.bankDeg, (draw(5) * 2 - 1) * MOTION.bankDeg);
      assert.equal(
        eddy.wanderM,
        EDDY.WANDER_M[0] + (EDDY.WANDER_M[1] - EDDY.WANDER_M[0]) * draw(6)
      );
      assert.equal(eddy.wanderPhase, draw(8) * Math.PI * 2);
    });
    assert.deepEqual(
      freeWaterPlacements(crater, true, true).filter((p) => p.far === true),
      river
    );
  });

  it('is a river with a head and a tail: thickest at its middle, and no ring', () => {
    assert.ok(SPAN_DEG < 360);
    const thirds = [0, 0, 0];
    for (const p of river) {
      const share = ((p.motion!.phase * 180) / Math.PI - startDeg + SPAN_DEG / 2) / SPAN_DEG;
      thirds[Math.min(2, Math.floor(share * 3))]!++;
    }
    assert.ok(thirds[1]! > thirds[0]! * 2 && thirds[1]! > thirds[2]! * 2, `${thirds}`);
    assert.ok(thirds[0]! > 0 && thirds[2]! > 0, `${thirds}`);
  });

  /** A lantern on the river's own line, at a phase, that neither keeps off it nor wanders. */
  const onLine = (phase: number, acrossM = 0) => ({
    ...river[0]!,
    motion: {
      ...river[0]!.motion!,
      phase,
      eddy: { ...river[0]!.motion!.eddy!, acrossM, wanderM: 0 },
    },
  });
  /**
   * How far one body stands outside another that shares its place on the
   * loop: both hang on one ray of it, so the gap is all across the flow.
   */
  const outside = (body: { x: number; z: number }, line: { x: number; z: number }) =>
    Math.hypot(body.x - line.x, body.z - line.z) *
    Math.sign((body.x - line.x) * (line.x - at[0]) + (body.z - line.z) * (line.z - at[1]));

  it('starts with its middle at the loop’s west end, the end nearer Home’s eye', () => {
    const pose = decorationPose(onLine(Math.PI), 0, ground);
    assert.ok(Math.abs(pose.x - (at[0] - RADII_M[0])) < 1e-6);
    assert.ok(Math.abs(pose.z - at[1]) < 1e-6);
  });

  it('is carried round the eddy: a lap a period, clockwise, each lantern heading the way it travels', () => {
    const lapMs = MOTION.periodS * 1000;
    for (const p of [river[0]!, river[40]!, river[COUNT - 1]!]) {
      const start = decorationPose(p, 0, ground);
      // A lap brings it back, wander and all, at the depth it kept all the way round.
      const back = decorationPose(p, lapMs, ground);
      assert.ok(Math.hypot(back.x - start.x, back.z - start.z) < 1e-6);
      for (const share of [0.1, 0.37, 0.5, 0.81]) {
        const now = decorationPose(p, lapMs * share, ground);
        assert.equal(now.y, start.y);
        // Its heading is where the next second carries it: a model swims
        // along +X, and a yaw about +y turns that toward -Z.
        const next = decorationPose(p, lapMs * share + 1000, ground);
        const run = Math.hypot(next.x - now.x, next.z - now.z);
        assert.ok(Math.abs((next.x - now.x) / run - Math.cos(now.yaw)) < 1e-9);
        assert.ok(Math.abs((next.z - now.z) / run + Math.sin(now.yaw)) < 1e-9);
      }
    }
    // Clockwise seen from above: from the west end the line goes north, and
    // a lap passes the north point, the east end and the south point in turn.
    const line = onLine(Math.PI);
    const quarter = (pose: { x: number; z: number }) =>
      (Math.atan2(pose.z - at[1], pose.x - at[0]) + Math.PI * 2) % (Math.PI * 2);
    let turned = 0;
    let last = quarter(decorationPose(line, 0, ground));
    for (let step = 1; step <= 720; step++) {
      const now = quarter(decorationPose(line, (lapMs * step) / 720, ground));
      const by = ((now - last + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      assert.ok(by > 0, `the line turns back at step ${step}`);
      turned += by;
      last = now;
    }
    assert.ok(Math.abs(turned - Math.PI * 2) < 1e-6);
  });

  it('runs with the stream on its north side and comes back slower and wider on its south', () => {
    // The fixture's one current runs east, where the kelp leans, in the garden
    // north of the bowl (docs/free-water-slice.md §5, "No rows"). The eddy is
    // read as what that stream's shear turns in the slower water south of it.
    const lapMs = MOTION.periodS * 1000;
    const line = onLine(Math.PI);
    const samples = Array.from({ length: 1440 }, (_, step) => {
      const ms = (lapMs * step) / 1440;
      const [now, next] = [
        decorationPose(line, ms, ground),
        decorationPose(line, ms + 1000, ground),
      ];
      return { now, east: next.x - now.x, mps: Math.hypot(next.x - now.x, next.z - now.z) };
    });
    const north = samples.reduce((a, b) => (b.now.z < a.now.z ? b : a));
    const south = samples.reduce((a, b) => (b.now.z > a.now.z ? b : a));
    assert.ok(north.east > 0, 'the north side runs west, against the stream');
    assert.ok(south.east < 0, 'the south side runs east');
    // Faster beside the stream by about the eddy's own share, and as much
    // slower coming back: the lap's pace is skewed about its north and south
    // points, a few degrees of the loop off each.
    const paceMps = (2 * Math.PI * RADII_M[0]) / MOTION.periodS;
    assert.ok(Math.abs(north.mps / paceMps - (1 + EDDY.SKEW)) < 0.04, `${north.mps} m/s north`);
    assert.ok(Math.abs(south.mps / paceMps - (1 - EDDY.SKEW)) < 0.04, `${south.mps} m/s south`);
    // No faster anywhere than twice a drifting jelly on its own loop, and
    // nowhere slower than a third of one.
    const jellyMps = (2 * Math.PI * JELLIES.MOTION.radiusM) / JELLIES.MOTION.periodS;
    const paces = samples.map((sample) => sample.mps);
    assert.ok(Math.max(...paces) <= jellyMps * 2, `${Math.max(...paces)} m/s at the fastest`);
    assert.ok(Math.min(...paces) >= jellyMps / 3, `${Math.min(...paces)} m/s at the slowest`);
    // Wider coming back: a lantern that keeps outside the line keeps further
    // out on the south side than on the north, by the eddy's own share.
    const kept = onLine(Math.PI, STATION.acrossM);
    const gap = (sample: (typeof samples)[number]) =>
      outside(decorationPose(kept, (lapMs * samples.indexOf(sample)) / 1440, ground), sample.now);
    assert.ok(
      Math.abs(gap(north) - STATION.acrossM * (1 - EDDY.SPREAD)) < 0.5,
      `${gap(north)} m north`
    );
    assert.ok(
      Math.abs(gap(south) - STATION.acrossM * (1 + EDDY.SPREAD)) < 0.5,
      `${gap(south)} m south`
    );
  });

  it('holds no lantern at a fixed station: each wanders across the flow, and no two together', () => {
    const lapMs = MOTION.periodS * 1000;
    for (const p of [river[3]!, river[57]!, river[101]!]) {
      const eddy = p.motion!.eddy!;
      const still = { ...p, motion: { ...p.motion!, eddy: { ...eddy, wanderM: 0 } } };
      let most = 0;
      let crossings = 0;
      let side = 0;
      for (let step = 0; step < 5400; step++) {
        const ms = (lapMs * step) / 5400;
        const by = outside(decorationPose(p, ms, ground), decorationPose(still, ms, ground));
        most = Math.max(most, Math.abs(by));
        if (side !== 0 && Math.sign(by) !== 0 && Math.sign(by) !== side) crossings++;
        if (Math.sign(by) !== 0) side = Math.sign(by);
      }
      // As far as its own wander and no further, once each way a wander.
      assert.ok(
        most <= eddy.wanderM + 0.5 && most >= eddy.wanderM * 0.9,
        `${most} of ${eddy.wanderM}`
      );
      assert.ok(Math.abs(crossings - eddy.wanderLaps * 2) <= 1, `${crossings} crossings`);
      // Slowly: across the flow it never moves as fast as the flow carries it.
      const acrossMps = (eddy.wanderM * 2 * Math.PI * eddy.wanderLaps) / MOTION.periodS;
      assert.ok(acrossMps < (2 * Math.PI * RADII_M[1]) / MOTION.periodS);
    }
  });

  it('leaves a circle’s heading the expression it always was', () => {
    // Low does not move: a body on a circle takes its heading as it did
    // before an eddy was a loop, to the last bit.
    const low = freeWaterPlacements(crater, true);
    for (const p of low.filter((slot) => slot.motion !== undefined)) {
      assert.equal(p.motion!.eddy, undefined);
      const ms = 123456;
      const phase =
        p.motion!.phase + (((ms / 1000) % p.motion!.periodS) / p.motion!.periodS) * Math.PI * 2;
      assert.equal(decorationPose(p, ms, ground).yaw, -phase - Math.PI / 2);
    }
  });

  it('takes a wave of light a third as strong as a lantern’s by the fleet', () => {
    assert.equal(jellyWaveGain(false), PULSE.GAIN);
    assert.equal(jellyWaveGain(true), FAR.PULSE_GAIN);
    assert.ok(FAR.PULSE_GAIN > 0 && FAR.PULSE_GAIN <= PULSE.GAIN / 3 + 1e-9);
    // On the beads and the seats: the same lantern, at the moment the wave
    // stands on its lip, with each gain.
    const shape = { lipY: 1.5, lipR: 3, crownY: 5 };
    const seats = [new Vector3(3, 1.5, 0)];
    const atLipS = (shape.crownY - shape.lipY + PULSE.LEAD * PULSE.WIDTH_M) / PULSE.SPEED_MPS;
    assert.ok(Math.abs(jellyPulse(shape.crownY - shape.lipY, atLipS, 0, true) - 1) < 1e-9);
    const levels = (gain?: number) => {
      const out: number[] = [];
      writeJellyLights(
        shape,
        seats,
        new Matrix4(),
        0,
        atLipS,
        true,
        (_p, _s, l) => out.push(l),
        gain
      );
      return out;
    };
    const [whole, soft] = [levels(), levels(jellyWaveGain(true))];
    assert.equal(whole.length, jellyLightCount(1));
    // The seat is the second light, after the glow round the bell.
    assert.ok(Math.abs(whole[1]! - LANTERN.LEVEL * (1 + PULSE.GAIN)) < 1e-9);
    assert.ok(Math.abs(soft[1]! - LANTERN.LEVEL * (1 + FAR.PULSE_GAIN)) < 1e-9);
    // No bead of the softer wave stands over the same bead of the whole one.
    assert.ok(soft.every((level, i) => level <= whole[i]! + 1e-12));
    assert.ok(soft.some((level, i) => level < whole[i]! - 1e-6));
    // And on the bell: the membrane's program takes its gain by the
    // instance's place in the list, the whole wave before `uJellyNear`.
    const shader = {
      vertexShader: ShaderLib.basic.vertexShader,
      fragmentShader: ShaderLib.basic.fragmentShader,
    };
    patchJellyMembrane(shader);
    assert.match(shader.vertexShader, /uniform float uJellyNear;/);
    assert.match(
      shader.vertexShader,
      /vJellyGain = float\( gl_InstanceID \) < uJellyNear \? 0\.600000 : 0\.200000;/
    );
    assert.match(shader.fragmentShader, /uJellyMoves \* vJellyGain \* exp/);
  });
});
