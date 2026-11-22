/**
 * The far bloom at the High graphics quality (docs/art-direction.md, "A far
 * bloom of lanterns"; docs/free-water-slice.md §5, "A far bloom over the
 * bowl"; #1859). What those sections promise: a river of whole lanterns over
 * the bowl and nowhere else, the last slots of High's list; thickest at its
 * middle, which starts at the loop's west end; over the hulls' depth; a
 * procession round an ellipse, clockwise, each lantern heading the way it
 * travels; and a wave of light a third as strong as a lantern's by the fleet.
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
const { at, RADII_M, startDeg, SPAN_DEG, COUNT, depthM, STATION, MOTION } = BLOOM;
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
      assert.deepEqual([p.xM, p.yM], [...at]);
      // One offset across the river's line, on both of the loop's radii.
      const acrossM = m.radiusM - RADII_M[0];
      assert.ok(Math.abs(acrossM) <= STATION.acrossM);
      assert.ok(Math.abs(m.radiusNsM! - RADII_M[1] - acrossM) < 1e-9);
      assert.ok(Math.abs(m.depthM! - depthM) <= STATION.depthM);
      // Its whole body, strands not counted, stands over the hulls.
      assert.ok(m.depthM! + reach < HULLS_M, `a lantern at ${m.depthM} m, among the hulls`);
      assert.equal(m.depthSwingM, 0);
      assert.equal(m.periodS, MOTION.periodS);
      assert.equal(m.axisM, JELLIES.MOTION.axisM);
      assert.ok(Math.abs(m.bankDeg!) <= MOTION.bankDeg);
      const off = (m.phase * 180) / Math.PI - startDeg;
      assert.ok(Math.abs(off) <= SPAN_DEG / 2, `a lantern ${off} degrees from the middle`);
    }
    assert.equal(new Set(river.map((p) => `${p.motion!.phase}:${p.motion!.radiusM}`)).size, COUNT);
    assert.ok(new Set(river.map((p) => p.motion!.bankDeg)).size > COUNT / 2);
  });

  it('is drawn from the fixture’s seed and nothing else', () => {
    // Every lantern is the fixture's seed, the loop's centre, its own number
    // and an axis through the registry's hash: no clock, no camera and no
    // match is an input, so every client draws the one river.
    river.forEach((p, i) => {
      const draw = (axis: number) => propHash([FREE_WATER_LIFE.SEED, at[0], at[1], i, axis]);
      const along = draw(1) + draw(2) - 1;
      const acrossM = (draw(3) * 2 - 1) * STATION.acrossM;
      assert.equal(p.motion!.phase, ((startDeg + (along * SPAN_DEG) / 2) * Math.PI) / 180);
      assert.equal(p.motion!.radiusM, RADII_M[0] + acrossM);
      assert.equal(p.motion!.depthM, depthM + (draw(4) * 2 - 1) * STATION.depthM);
      assert.equal(p.motion!.bankDeg, (draw(5) * 2 - 1) * MOTION.bankDeg);
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

  it('starts with its middle at the loop’s west end, the end nearer Home’s eye', () => {
    const middle = { ...river[0]!, motion: { ...river[0]!.motion!, phase: Math.PI } };
    middle.motion.radiusM = RADII_M[0];
    middle.motion.radiusNsM = RADII_M[1];
    const pose = decorationPose(middle, 0, ground);
    assert.ok(Math.abs(pose.x - (at[0] - RADII_M[0])) < 1e-6);
    assert.ok(Math.abs(pose.z - at[1]) < 1e-6);
  });

  it('is a procession: a lap a period, clockwise, each lantern heading the way it travels', () => {
    const lapMs = MOTION.periodS * 1000;
    for (const p of [river[0]!, river[40]!, river[COUNT - 1]!]) {
      const start = decorationPose(p, 0, ground);
      // A lap brings it back, at the depth it kept all the way round.
      const back = decorationPose(p, lapMs, ground);
      assert.ok(Math.hypot(back.x - start.x, back.z - start.z) < 1e-6);
      for (const share of [0.1, 0.37, 0.5, 0.81]) {
        const now = decorationPose(p, lapMs * share, ground);
        assert.equal(now.y, start.y);
        // Its heading is where the next second carries it: a model swims
        // along +X, and a yaw about +y turns that toward -Z.
        const next = decorationPose(p, lapMs * share + 1000, ground);
        const run = Math.hypot(next.x - now.x, next.z - now.z);
        assert.ok(Math.abs((next.x - now.x) / run - Math.cos(now.yaw)) < 1e-3);
        assert.ok(Math.abs((next.z - now.z) / run + Math.sin(now.yaw)) < 1e-3);
      }
    }
    // A quarter lap from the east is the south: clockwise seen from above.
    const east = { ...river[0]!, motion: { ...river[0]!.motion!, phase: 0 } };
    east.motion.radiusM = RADII_M[0];
    east.motion.radiusNsM = RADII_M[1];
    const south = decorationPose(east, lapMs / 4, ground);
    assert.ok(Math.abs(south.x - at[0]) < 1e-6 && Math.abs(south.z - (at[1] + RADII_M[1])) < 1e-6);
    // So the north side runs east, with the kelp's current, and the south side west.
    const north = decorationPose(east, (lapMs * 3) / 4, ground);
    const northNext = decorationPose(east, (lapMs * 3) / 4 + 1000, ground);
    assert.ok(northNext.x > north.x);
    assert.ok(decorationPose(east, lapMs / 4 + 1000, ground).x < south.x);
    // No faster on the loop's long sides than twice a drifting jelly on its
    // own loop, and nowhere slower than a third of one.
    const jellyMps = (2 * Math.PI * JELLIES.MOTION.radiusM) / JELLIES.MOTION.periodS;
    assert.ok((2 * Math.PI * RADII_M[0]) / MOTION.periodS <= jellyMps * 2);
    assert.ok((2 * Math.PI * RADII_M[1]) / MOTION.periodS >= jellyMps / 3);
  });

  it('leaves a circle’s heading the expression it always was', () => {
    // Low does not move: a body on a circle takes its heading as it did
    // before an ellipse was a loop, to the last bit.
    const low = freeWaterPlacements(crater, true);
    for (const p of low.filter((slot) => slot.motion !== undefined)) {
      assert.equal(p.motion!.radiusNsM, undefined);
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
