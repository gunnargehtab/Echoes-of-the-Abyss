/**
 * The far bloom at the High graphics quality (docs/art-direction.md, "A far
 * bloom of lanterns"; docs/free-water-slice.md §5, "A far bloom over the
 * bowl"; #1859). What those sections promise: a river of small lanterns over
 * the bowl and nowhere else, each two points of the lantern's cloud and no
 * body; thickest at its middle, which starts at the loop's west end; over the
 * hulls' depth; adrift on the match's clock and for nothing else. What it
 * looks like is the frames in docs/screenshots/issue-1859, and the layer that
 * hangs it is booted in tutorialLoading.test.mjs.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Vector3 } from 'three';
import { FREE_WATER_HIGH_LIFE, FREE_WATER_LIFE, HIGH_GRAPHICS } from '@echoes/shared';
import { terrainFor } from '../../backend/src/sim/maps/index.ts';
import { propHash } from '../src/game/environment.ts';
import { FREE_WATER_SLICE } from '../../backend/src/sim/maps/freeWaterSlice.ts';
import {
  FAR_BLOOM,
  farBloomAdmitted,
  farBloomLightCount,
  farBloomPlan,
  farLanternAt,
  writeFarBloom,
} from '../src/game/farBloom.ts';
import { DEPTH_VISUAL_M_PER_M } from '../src/game/perspectiveTerrain.ts';

const { at, RADII_M, startDeg, SPAN_DEG, COUNT, periodS, depthM, STATION } =
  FREE_WATER_HIGH_LIFE.BLOOM;
const { FAR } = HIGH_GRAPHICS.LIFE.JELLY;

/** The bowl's authored floor, and the pocket's under it (docs/free-water-slice.md §3). */
const BOWL_FLOOR_M = 1500;

describe('the far bloom (#1859)', () => {
  const crater = terrainFor(FREE_WATER_SLICE).serialize();

  it('sweeps open water over the bowl and nowhere else, a whole lap long', () => {
    assert.equal(farBloomAdmitted(crater), true);
    // Every point of the band, at any match time: the river goes all the way
    // round, so the whole loop is its envelope and not its span alone.
    for (let deg = 0; deg < 360; deg += 0.5) {
      for (const acrossM of [-STATION.acrossM, 0, STATION.acrossM]) {
        const [x, y] = farBloomPlan((deg * Math.PI) / 180, acrossM);
        const i = Math.floor(y / crater.cellM) * crater.cols + Math.floor(x / crater.cellM);
        assert.equal(crater.ceiling[i], 0, `a roof at ${deg} degrees`);
        assert.ok(crater.floor[i]! >= BOWL_FLOOR_M, `the rim or the garden at ${deg} degrees`);
      }
    }
    // Ground that shoals under the river, or roofs it, stands none of it: one
    // cell under the loop's west end, at the rim's floor and then roofed.
    const [x, y] = farBloomPlan(Math.PI, 0);
    const under = Math.floor(y / crater.cellM) * crater.cols + Math.floor(x / crater.cellM);
    const shoaled = {
      ...crater,
      floor: crater.floor.map((floor, i) => (i === under ? 200 : floor)),
    };
    assert.equal(farBloomAdmitted(shoaled), false);
    const roofed = {
      ...crater,
      ceiling: crater.ceiling.map((top, i) => (i === under ? 100 : top)),
    };
    assert.equal(farBloomAdmitted(roofed), false);
  });

  it('is an authored list: every lantern inside the band, over the hulls, at a width of its own', () => {
    assert.equal(FAR_BLOOM.length, COUNT);
    const hulls = 300;
    for (const slot of FAR_BLOOM) {
      assert.ok(Math.abs(slot.acrossM) <= STATION.acrossM);
      assert.ok(Math.abs(slot.depthM - depthM) <= STATION.depthM);
      assert.ok(slot.depthM < hulls, `a lantern at ${slot.depthM} m, among the hulls`);
      assert.ok(slot.sizeM <= FAR.SIZE_M && slot.sizeM >= FAR.SIZE_M * FAR.SMALLEST);
      const off = (slot.phase * 180) / Math.PI - startDeg;
      assert.ok(Math.abs(off) <= SPAN_DEG / 2, `a lantern ${off} degrees from the middle`);
    }
    // No two alike, so no lantern is drawn over another.
    assert.equal(new Set(FAR_BLOOM.map((slot) => `${slot.phase}:${slot.acrossM}`)).size, COUNT);
    assert.ok(new Set(FAR_BLOOM.map((slot) => slot.sizeM)).size > COUNT / 2);
  });

  it('is a river with a head and a tail: thickest at its middle, and no ring', () => {
    assert.ok(SPAN_DEG < 360);
    const third = (slot: (typeof FAR_BLOOM)[number]) =>
      Math.min(
        2,
        Math.floor((((slot.phase * 180) / Math.PI - startDeg + SPAN_DEG / 2) / SPAN_DEG) * 3)
      );
    const thirds = [0, 0, 0];
    for (const slot of FAR_BLOOM) thirds[third(slot)]!++;
    assert.ok(thirds[1]! > thirds[0]! * 2 && thirds[1]! > thirds[2]! * 2, `${thirds}`);
    assert.ok(thirds[0]! > 0 && thirds[2]! > 0, `${thirds}`);
  });

  it('starts with its middle at the loop’s west end, the end nearer Home’s eye', () => {
    const [x, y] = farBloomPlan((startDeg * Math.PI) / 180, 0);
    assert.ok(Math.abs(x - (at[0] - RADII_M[0])) < 1e-6);
    assert.ok(Math.abs(y - at[1]) < 1e-6);
  });

  it('hangs two points a lantern: the glow round it, then its bell’s disc', () => {
    const lights: [number, number, number, number, number][] = [];
    writeFarBloom(FAR_BLOOM, 0, (p, sizeM, level) => lights.push([p.x, p.y, p.z, sizeM, level]));
    assert.equal(lights.length, farBloomLightCount(COUNT));
    assert.equal(lights.length, COUNT * 2);
    FAR_BLOOM.forEach((slot, i) => {
      const [halo, bell] = [lights[i * 2]!, lights[i * 2 + 1]!];
      // Both stand where the lantern hangs, at its depth as the column is drawn.
      const [x, z] = farBloomPlan(slot.phase, slot.acrossM);
      for (const light of [halo, bell]) {
        assert.ok(Math.abs(light[0] - x) < 1e-6 && Math.abs(light[2] - z) < 1e-6);
        assert.ok(Math.abs(light[1] + slot.depthM * DEPTH_VISUAL_M_PER_M) < 1e-6);
      }
      assert.equal(bell[3], slot.sizeM);
      assert.equal(bell[4], FAR.LEVEL);
      assert.ok(Math.abs(halo[3] / bell[3] - FAR.HALO.SIZE_M / FAR.SIZE_M) < 1e-9);
      assert.equal(halo[4], FAR.HALO.LEVEL);
    });
    // One level for every lantern and every match time: nothing flashes.
    const later: number[] = [];
    writeFarBloom(FAR_BLOOM, 1234.5, (_p, _sizeM, level) => later.push(level));
    assert.deepEqual(
      later,
      lights.map((light) => light[4])
    );
  });

  it('drifts on the match’s clock alone: a lap a period, clockwise, at a jelly’s pace', () => {
    const slot = FAR_BLOOM[0]!;
    const start = farLanternAt(slot, 0, new Vector3()).clone();
    // A lap brings it back, and the match's start is where reduced motion holds it.
    assert.ok(farLanternAt(slot, periodS, new Vector3()).distanceTo(start) < 1e-6);
    // A quarter lap from the east is the south: clockwise seen from above.
    const east = { ...slot, phase: 0, acrossM: 0 };
    const south = farLanternAt(east, periodS / 4, new Vector3());
    assert.ok(Math.abs(south.x - at[0]) < 1e-6 && Math.abs(south.z - (at[1] + RADII_M[1])) < 1e-6);
    // It keeps its depth: a lantern drifts along the river and neither sinks nor climbs.
    assert.equal(farLanternAt(slot, periodS / 3, new Vector3()).y, start.y);
    // Along the loop's long sides, where it runs fastest, it is no faster
    // than twice a drifting jelly on its own loop, and nowhere slower than a third of one.
    const { radiusM, periodS: lapS } = FREE_WATER_HIGH_LIFE.JELLIES.MOTION;
    const jellyMps = (2 * Math.PI * radiusM) / lapS;
    const fastest = (2 * Math.PI * RADII_M[0]) / periodS;
    const slowest = (2 * Math.PI * RADII_M[1]) / periodS;
    assert.ok(fastest <= jellyMps * 2, `${fastest} m/s on the long side`);
    assert.ok(slowest >= jellyMps / 3, `${slowest} m/s round the ends`);
  });

  it('is drawn from the fixture’s seed and nothing else', () => {
    // Every lantern is the fixture's seed, the loop's centre, its own number
    // and an axis through the registry's hash: no clock, no camera and no
    // match is an input, so every client draws the one river.
    FAR_BLOOM.forEach((slot, i) => {
      const draw = (axis: number) => propHash([FREE_WATER_LIFE.SEED, at[0], at[1], i, axis]);
      const along = draw(1) + draw(2) - 1;
      assert.equal(slot.phase, ((startDeg + (along * SPAN_DEG) / 2) * Math.PI) / 180);
      assert.equal(slot.acrossM, (draw(3) * 2 - 1) * STATION.acrossM);
      assert.equal(slot.depthM, depthM + (draw(4) * 2 - 1) * STATION.depthM);
      assert.equal(slot.sizeM, FAR.SIZE_M * (FAR.SMALLEST + (1 - FAR.SMALLEST) * draw(5)));
    });
  });
});
