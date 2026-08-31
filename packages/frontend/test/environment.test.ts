/**
 * The environment prop scatter (docs/graphics-standards.md, "The environment
 * branch"). These are the promises that let instanced geometry near a
 * hidden-information game: placement is a pure function of the published
 * grid, a ground delta moves only the props beside it, eligibility follows
 * what a cell already declares, and the gate-6 reservation is enforced by
 * construction rather than by review. The InstancedMesh layer itself needs a
 * GL context and is reviewed by screenshot, per the graphics-standards
 * checklist.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Biome } from '@echoes/shared';
import {
  ENVIRONMENT_PROPS,
  placeProps,
  PROP_INSTANCE_CAP,
  PROP_TRI_RESERVATION,
  type PropSpec,
} from '../src/game/environment.ts';

/** An 8×8 map: kelp centre, open ring, one rock block, one roofed cell, one
 * cliff-adjacent step. */
function demoTerrain() {
  const cols = 8;
  const rows = 8;
  const biomes = new Array(cols * rows).fill(Biome.OpenWater);
  const floor = new Array(cols * rows).fill(2000);
  const ceiling = new Array(cols * rows).fill(0);
  for (let r = 2; r <= 5; r++) {
    for (let c = 2; c <= 5; c++) biomes[r * cols + c] = Biome.KelpForest;
  }
  // Rock: 2×2 block at (5..6, 0..1).
  for (const i of [5, 6, 13, 14]) {
    ceiling[i] = 3000;
    floor[i] = 2000;
  }
  // A roofed passage cell.
  ceiling[7 * cols + 7] = 700;
  floor[7 * cols + 7] = 1800;
  // A sharp authored step, for the slope rule.
  floor[7 * cols + 0] = 900;
  return { cols, rows, cellM: 250, biomes, floor, ceiling };
}

const KELP: PropSpec = {
  slug: 'env-kelp-cluster',
  footprintM: 18,
  triBudget: 400,
  density: 1.4,
  stands: [Biome.KelpForest],
  nearRock: 'any',
  maxSlopeM: 400,
  excludeRoofed: true,
  scaleJitter: [0.7, 1.3],
  worldLight: 'flora',
};

const CRAG: PropSpec = {
  slug: 'env-rock-crag-a',
  footprintM: 30,
  triBudget: 500,
  density: 0.6,
  stands: 'rock',
  nearRock: 'any',
  maxSlopeM: Number.POSITIVE_INFINITY,
  excludeRoofed: false,
  scaleJitter: [0.8, 1.2],
  worldLight: 'none',
};

const BOULDER: PropSpec = {
  slug: 'env-open-boulder',
  footprintM: 12,
  triBudget: 300,
  density: 0.5,
  stands: [Biome.OpenWater],
  nearRock: 'exclude',
  maxSlopeM: 300,
  excludeRoofed: true,
  scaleJitter: [0.7, 1.3],
  worldLight: 'none',
};

const SPECS = [KELP, CRAG, BOULDER];

describe('prop placement', () => {
  it('is deterministic: same grid, same props, and the registry ships empty', () => {
    const terrain = demoTerrain();
    assert.deepEqual(placeProps(terrain, SPECS), placeProps(terrain, SPECS));
    assert.ok(placeProps(terrain, SPECS).length > 0, 'the demo scatter placed nothing');
    // The registry itself is empty until the env-assets PRs land, so the
    // shipped layer is a no-op by data, not by a disabled code path.
    assert.deepEqual(ENVIRONMENT_PROPS, []);
    assert.deepEqual(placeProps(terrain), []);
  });

  it('moves only the props beside a ground delta — the locality guard', () => {
    // This is the reason placement hashes the cell rather than seabedSeed():
    // one collapsed span must not shuffle every prop on the map. Eligibility
    // reads a cell and its ring (nearRock, slope), so a delta may move props
    // within one cell of the change and no further.
    const before = placeProps(demoTerrain(), SPECS);
    const changed = demoTerrain();
    const target = 4 * changed.cols + 4; // a kelp cell mid-map
    changed.floor[target] = 2600;
    changed.biomes[target] = Biome.AbyssalTrench;
    const after = placeProps(changed, SPECS);

    const nearTarget = (index: number) => {
      const row = Math.floor(index / changed.cols);
      const col = index % changed.cols;
      return Math.abs(row - 4) <= 1 && Math.abs(col - 4) <= 1;
    };
    const settle = (list: typeof before) =>
      JSON.stringify(list.filter((p) => !nearTarget(p.cellIndex)));
    assert.equal(settle(before), settle(after), 'a delta moved props far from the change');
    assert.notEqual(
      JSON.stringify(before.filter((p) => p.cellIndex === target)),
      JSON.stringify(after.filter((p) => p.cellIndex === target)),
      'the changed cell itself never re-dressed'
    );
  });

  it('dresses only what a cell declares', () => {
    const terrain = demoTerrain();
    const isRock = (i: number) => terrain.ceiling[i]! > terrain.floor[i]!;
    const placements = placeProps(terrain, SPECS);
    let crags = 0;
    for (const p of placements) {
      // Inside its own cell — a prop never leans over a biome boundary.
      const col = Math.floor(p.xM / terrain.cellM);
      const row = Math.floor(p.yM / terrain.cellM);
      assert.equal(row * terrain.cols + col, p.cellIndex, `${p.slug} left its cell`);
      if (p.slug === CRAG.slug) {
        crags++;
        assert.ok(isRock(p.cellIndex), 'a crag stood on open water');
      } else {
        assert.ok(!isRock(p.cellIndex), `${p.slug} stood on rock`);
      }
      if (p.slug === KELP.slug) {
        assert.equal(terrain.biomes[p.cellIndex], Biome.KelpForest, 'kelp outside its biome');
        assert.notEqual(p.cellIndex, 7 * terrain.cols + 7, 'kelp under a roof');
      }
      if (p.slug === BOULDER.slug) {
        // nearRock 'exclude': no placement in the ring around the rock block.
        const r = Math.floor(p.cellIndex / terrain.cols);
        const c = p.cellIndex % terrain.cols;
        const besideRock = [5, 6, 13, 14].some((i) => {
          const rr = Math.floor(i / terrain.cols);
          const rc = i % terrain.cols;
          return Math.abs(rr - r) <= 1 && Math.abs(rc - c) <= 1;
        });
        assert.ok(!besideRock, 'a boulder hugged the mesa it was told to avoid');
      }
      assert.ok(p.scale >= 0.7 && p.scale <= 1.3, 'scale left its jitter range');
      assert.ok(p.yawRad >= 0 && p.yawRad < Math.PI * 2);
    }
    assert.ok(crags > 0, 'the rock block grew no crags at all');
  });

  it('respects the slope rule', () => {
    // The 900 m step at (row 7, col 0) makes its open neighbours' worst step
    // 1,100 m — over every spec's maxSlopeM — so nothing tall stands there.
    const terrain = demoTerrain();
    const placements = placeProps(terrain, SPECS);
    for (const p of placements) {
      if (p.slug === CRAG.slug) continue; // rock ignores slope
      const r = Math.floor(p.cellIndex / terrain.cols);
      const c = p.cellIndex % terrain.cols;
      assert.ok(
        !(Math.abs(r - 7) + Math.abs(c - 0) <= 1),
        `${p.slug} stood on the cliff step at (${r},${c})`
      );
    }
  });

  it('never exceeds the gate-6 reservation, by construction', () => {
    // A pathological registry on a big map: the caps must cut, not overflow.
    const cols = 40;
    const rows = 40;
    const terrain = {
      cols,
      rows,
      cellM: 250,
      biomes: new Array(cols * rows).fill(Biome.OpenWater),
      floor: new Array(cols * rows).fill(2000),
      ceiling: new Array(cols * rows).fill(0),
    };
    const greedy: PropSpec = { ...BOULDER, nearRock: 'any', density: 3, triBudget: 799 };
    const placements = placeProps(terrain, [greedy]);
    assert.ok(placements.length <= PROP_INSTANCE_CAP, 'instance cap breached');
    const tris = placements.length * greedy.triBudget;
    assert.ok(tris <= PROP_TRI_RESERVATION, `${tris} triangles breach the reservation`);
    assert.ok(placements.length > 0, 'the caps cut everything');
  });

  it('holds every registry row to the documented contracts', () => {
    // Block 4's table is the source: env- slugs, ≤ 800 triangles, sane
    // density and jitter. Empty today; this is the fence the asset PRs land
    // inside.
    for (const spec of ENVIRONMENT_PROPS) {
      assert.match(spec.slug, /^env-[a-z0-9-]+$/, `${spec.slug} breaks the naming convention`);
      assert.ok(spec.triBudget > 0 && spec.triBudget <= 800, `${spec.slug} triangle budget`);
      assert.ok(spec.density > 0 && spec.density <= 3, `${spec.slug} density`);
      assert.ok(spec.footprintM > 0 && spec.footprintM <= 60, `${spec.slug} footprint`);
      const [lo, hi] = spec.scaleJitter;
      assert.ok(lo > 0 && hi >= lo && hi <= 2, `${spec.slug} scale jitter`);
    }
  });
});
