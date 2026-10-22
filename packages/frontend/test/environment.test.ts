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
import { Biome, ResourceKind, type ResourceNodeInfo } from '@echoes/shared';
import {
  ENVIRONMENT_PROPS,
  FIELD_PROP_SLUG,
  FIELD_STAND,
  fieldRadiusM,
  LOOK_DENSITY,
  mapProps,
  placeProps,
  PROP_INSTANCE_CAP,
  PROP_TRI_RESERVATION,
  scatterFields,
  scatterProps,
  stoneSeats,
  swayWeight,
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
  swayM: 4,
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
  swayM: 0,
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
  swayM: 0,
};

const SPECS = [KELP, CRAG, BOULDER];

describe('prop placement', () => {
  it('is deterministic: same grid, same props, with the shipped registry too', () => {
    const terrain = demoTerrain();
    assert.deepEqual(placeProps(terrain, SPECS), placeProps(terrain, SPECS));
    assert.ok(placeProps(terrain, SPECS).length > 0, 'the demo scatter placed nothing');
    // The shipped registry dresses the demo grid — kelp in the kelp block,
    // crags on the rock, a boulder or two on the open ring — identically
    // every time.
    assert.deepEqual(placeProps(terrain), placeProps(terrain));
    const slugs = new Set(placeProps(terrain).map((p) => p.slug));
    assert.ok(slugs.has('env-kelp-cluster'), 'the kelp block grew no kelp');
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
    // density and jitter (the field-stood bed aside), and one row per slug. The GLBs themselves are
    // checked by hull-intake; the backend's environmentBudget test sums
    // these rows over the shipped maps.
    assert.ok(ENVIRONMENT_PROPS.length >= 14, 'the Block 4 table has fourteen rows');
    const seen = new Set<string>();
    for (const spec of ENVIRONMENT_PROPS) {
      assert.match(spec.slug, /^env-[a-z0-9-]+$/, `${spec.slug} breaks the naming convention`);
      assert.ok(!seen.has(spec.slug), `${spec.slug} is registered twice`);
      seen.add(spec.slug);
      assert.ok(spec.triBudget > 0 && spec.triBudget <= 800, `${spec.slug} triangle budget`);
      // A row stood by the fields alone names no biome and scatters at no
      // density (#1555); every other row must dress something.
      if (spec.stands !== 'rock' && spec.stands.length === 0) {
        assert.equal(spec.density, 0, `${spec.slug} stands in no biome yet scatters`);
      } else {
        assert.ok(spec.density > 0 && spec.density <= 3, `${spec.slug} density`);
      }
      assert.ok(spec.footprintM > 0 && spec.footprintM <= 60, `${spec.slug} footprint`);
      const [lo, hi] = spec.scaleJitter;
      assert.ok(lo > 0 && hi >= lo && hi <= 2, `${spec.slug} scale jitter`);
      assert.ok(spec.swayM >= 0 && spec.swayM <= 10, `${spec.slug} sway`);
      // Only flora bends: a swaying rock would read as an agent.
      if (spec.swayM > 0) assert.equal(spec.worldLight, 'flora', `${spec.slug} sways but is stone`);
    }
  });

  it('licenses light only where Block 4 does', () => {
    // The table's Light column, transcribed: four lit rows, the coral growth
    // in the kelp's family since #1532, and everything else 'none' so intake
    // fails a glowing rock.
    const lit = Object.fromEntries(
      ENVIRONMENT_PROPS.filter((s) => s.worldLight !== 'none').map((s) => [s.slug, s.worldLight])
    );
    assert.deepEqual(lit, {
      'env-vent-chimney': 'vent',
      'env-kelp-cluster': 'flora',
      'env-coral-growth': 'flora',
      'env-resonance-crystal': 'crystal',
    });
  });
});

describe('seated stones', () => {
  it('seats loose stone on open ground only, never past half its height', () => {
    // docs/art-direction.md "Silt detail and seated stones — SPEC".
    const seated = ENVIRONMENT_PROPS.filter((s) => (s.buryFraction ?? 0) > 0);
    assert.deepEqual(Object.fromEntries(seated.map((s) => [s.slug, s.buryFraction])), {
      'env-vent-basalt': 0.15,
      'env-trench-slab': 0.3,
      'env-open-boulder': 0.3,
    });
    for (const spec of seated) {
      assert.ok(spec.buryFraction! <= 0.5, `${spec.slug} sinks past half its silhouette`);
      assert.notEqual(spec.stands, 'rock', `${spec.slug} would scour ground with no silt`);
      assert.equal(spec.swayM, 0, `${spec.slug} bends, so it is not stone`);
      assert.equal(spec.worldLight, 'none', `${spec.slug} is lit, so it is not loose stone`);
    }
  });

  it('are the stones the scatter stands, each at half its footprint and in its own cell', () => {
    const terrain = demoTerrain();
    terrain.biomes[0] = Biome.ThermalVein;
    terrain.biomes[1] = Biome.AbyssalTrench;
    const seats = stoneSeats(terrain);
    const stones = [...scatterProps(terrain)].filter(({ spec }) => (spec.buryFraction ?? 0) > 0);
    assert.ok(seats.length > 0, 'the demo map seats nothing');
    assert.equal(seats.length, stones.length);
    seats.forEach((seat, i) => {
      const { placement, spec } = stones[i]!;
      assert.equal(seat.xM, placement.xM);
      assert.equal(seat.yM, placement.yM);
      assert.equal(seat.cellIndex, placement.cellIndex);
      assert.equal(seat.radiusM, (spec.footprintM * placement.scale) / 2);
      const col = seat.cellIndex % terrain.cols;
      const row = Math.floor(seat.cellIndex / terrain.cols);
      assert.ok(seat.xM > col * terrain.cellM && seat.xM < (col + 1) * terrain.cellM);
      assert.ok(seat.yM > row * terrain.cellM && seat.yM < (row + 1) * terrain.cellM);
    });
  });

  it('move only beside a ground delta, as the props do', () => {
    const before = stoneSeats(demoTerrain());
    const changed = demoTerrain();
    const target = 1 * changed.cols + 1; // an open cell
    changed.ceiling[target] = 3000; // collapses into rock
    const after = stoneSeats(changed);
    const near = (index: number) =>
      Math.abs(Math.floor(index / changed.cols) - 1) <= 1 &&
      Math.abs((index % changed.cols) - 1) <= 1;
    const settle = (list: typeof before) => JSON.stringify(list.filter((s) => !near(s.cellIndex)));
    assert.equal(settle(before), settle(after), 'a delta moved a stone far from the change');
    assert.equal(after.filter((s) => s.cellIndex === target).length, 0, 'rock seats no stone');
  });
});

describe('sway weight', () => {
  it('roots the base and bends the tip', () => {
    // Quadratic in height: the holdfast never moves, the column bends rather
    // than leans, and nothing above the model's own height is asked for.
    assert.equal(swayWeight(0, 70), 0);
    assert.equal(swayWeight(70, 70), 1);
    assert.equal(swayWeight(35, 70), 0.25);
    assert.equal(swayWeight(140, 70), 1, 'weight saturates above the height');
    assert.equal(swayWeight(-5, 70), 0, 'a vertex below the base takes nothing');
    assert.equal(swayWeight(10, 0), 0, 'a flat prop has no sway at all');
  });
});

describe("a look's density (docs/visual-reboot.md §4)", () => {
  // Sorrowgate's regions, as docs/mission-sorrowgate.md §11 draws them.
  const inConcourse = (p: { xM: number; yM: number }) => p.xM >= 1500 && p.xM < 3500 && p.yM < 750;
  const inCourt = (p: { xM: number; yM: number }) =>
    ((p.xM - 1750) / 750) ** 2 + ((p.yM - 2250) / 500) ** 2 <= 1 && p.yM < 3000;

  it('dresses the prologue ground past the bare court and Concourse (#1532)', () => {
    const standard = mapProps('sorrowgate');
    const prologue = mapProps('sorrowgate', 'sorrowgate');
    assert.ok(prologue.filter(inConcourse).length >= 5, 'the terminus carries ruins');
    assert.ok(prologue.filter(inCourt).length > standard.filter(inCourt).length);
    const tris = prologue.reduce((sum, p) => sum + propSpecTris(p.slug), 0);
    assert.ok(prologue.length < PROP_INSTANCE_CAP && tris < PROP_TRI_RESERVATION, `${tris} tris`);
  });

  it('keeps every standard placement where it was', () => {
    assert.deepEqual(LOOK_DENSITY.standard, {});
    const terrain = {
      cols: 4,
      rows: 1,
      cellM: 250,
      biomes: [Biome.CoralRuins, Biome.ThermalVein, Biome.AbyssalTrench, Biome.KelpForest],
      floor: [1600, 1600, 2400, 600],
      ceiling: [0, 0, 0, 0],
    };
    assert.deepEqual(placeProps(terrain, ENVIRONMENT_PROPS, 'standard'), placeProps(terrain));
  });

  it('moves only the biomes the look names', () => {
    const vein = {
      cols: 8,
      rows: 8,
      cellM: 250,
      biomes: new Array(64).fill(Biome.ThermalVein),
      floor: new Array(64).fill(1600),
      ceiling: new Array(64).fill(0),
    };
    assert.deepEqual(placeProps(vein, ENVIRONMENT_PROPS, 'sorrowgate'), placeProps(vein));
  });
});

function propSpecTris(slug: string): number {
  return ENVIRONMENT_PROPS.find((spec) => spec.slug === slug)!.triBudget;
}

/**
 * A resource field's ore (#1555): stood at the fields the room publishes,
 * from the field's own values alone, inside its rim, first in the spend. The
 * bed model is a GLB and is reviewed by screenshot; this holds the placement.
 */
describe('field placement', () => {
  const fields: ResourceNodeInfo[] = [
    { id: 1, x: 900, y: 900, kind: ResourceKind.Nodule, depth: 600, initialAmount: 3000 },
    {
      id: 2,
      x: 1200,
      y: 1700,
      kind: ResourceKind.ResonanceCrystal,
      depth: 2400,
      initialAmount: 900,
    },
  ];

  it('stands each kind its own prop, inside the rim the chart draws, deterministically', () => {
    const terrain = demoTerrain();
    const placed = [...scatterFields(terrain, fields)].map((f) => f.placement);
    assert.deepEqual(
      placed,
      [...scatterFields(terrain, fields)].map((f) => f.placement)
    );
    for (const field of fields) {
      const own = placed.filter(
        (p) => Math.hypot(p.xM - field.x, p.yM - field.y) <= fieldRadiusM(field)
      );
      assert.equal(own.length, FIELD_STAND[field.kind].count, `field ${field.id} stands short`);
      for (const p of own) assert.equal(p.slug, FIELD_PROP_SLUG[field.kind]);
    }
    assert.equal(
      placed.length,
      fields.reduce((n, f) => n + FIELD_STAND[f.kind].count, 0)
    );
  });

  it('reads nothing but the field: another id is another pattern, the same field the same', () => {
    const terrain = demoTerrain();
    const [a] = fields;
    const same = { ...a! };
    const other = { ...a!, id: 9 };
    const pattern = (field: ResourceNodeInfo) =>
      JSON.stringify([...scatterFields(terrain, [field])].map((f) => f.placement));
    assert.equal(pattern(a!), pattern(same));
    assert.notEqual(pattern(a!), pattern(other));
  });

  it('skips ore that would stand on rock or off the map', () => {
    const terrain = demoTerrain();
    // The 2×2 rock block at (5..6, 0..1): x 1250–1750, y 0–500.
    const onRock: ResourceNodeInfo = { ...fields[0]!, id: 3, x: 1500, y: 250, initialAmount: 1500 };
    const offMap: ResourceNodeInfo = { ...fields[0]!, id: 4, x: -400, y: -400 };
    assert.equal([...scatterFields(terrain, [onRock])].length, 0, 'ore stood in a wall');
    assert.equal([...scatterFields(terrain, [offMap])].length, 0, 'ore stood off the map');
  });

  it('spends the reservation on the fields first, then the biome scatter', () => {
    const terrain = demoTerrain();
    const fieldCount = fields.reduce((n, f) => n + FIELD_STAND[f.kind].count, 0);
    const placements = placeProps(terrain, ENVIRONMENT_PROPS, 'standard', fields);
    const slugs = new Set(Object.values(FIELD_PROP_SLUG));
    assert.ok(
      placements.slice(0, fieldCount).every((p) => slugs.has(p.slug)),
      'a field was not first'
    );
    assert.ok(placements.length > fieldCount, 'the scatter stood nothing after the fields');
    // The bed is never scattered by biome: without a field, none stands.
    assert.ok(
      placeProps(terrain).every((p) => p.slug !== FIELD_PROP_SLUG[ResourceKind.Nodule]),
      'a bed stood with no field to stand in'
    );
  });
});
