/**
 * The continuous world's public contract — docs/world-map.md §7 (#1456).
 *
 * The atlas frame, the placed regions and the pilot predicate, plus the
 * boundary that makes it safe for a client to hold any of it: a placed map's
 * ground is public, and nothing else of the map is here. The backend suite
 * holds the other half — that Sorrowgate's 320 cells paint exactly as they did
 * before its ground moved here (`sorrowgateGround.test.ts`).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import {
  MISSION_HEADERS,
  PROLOGUE_SORROWGATE_HEADER,
  RIFT_ATLAS,
  SORROWGATE_GROUND,
  SORROWGATE_REGION,
  WORLD,
  WORLD_REGIONS,
  atlasToLocal,
  detailRect,
  localToAtlas,
  regionContains,
  worldRegionById,
  worldRegionForMission,
  worldRegionProblems,
  type GroundRegion,
  type WorldRegion,
} from '../dist/index.js';

describe('the atlas frame', () => {
  it('is §7.2: 40 km east by 90 km south, 1,000 m overview cells on 250 m detail', () => {
    assert.deepEqual(RIFT_ATLAS, { x: 0, y: 0, widthM: 40_000, heightM: 90_000 });
    assert.equal(WORLD.ATLAS_CELL_M % WORLD.DETAIL_CELL_M, 0);
    // §7.4's fade ends inside §7.3's surround, so the exterior has gone dark
    // before the overview's coarser ground begins.
    assert.ok(WORLD.FADE_M < WORLD.DETAIL_SURROUND_M);
  });
});

describe('placed regions', () => {
  it('pins Sorrowgate at (17,500, 40,500), its own 5,000 × 4,000 m', () => {
    assert.deepEqual(SORROWGATE_REGION, {
      id: 'sorrowgate',
      mapId: 'sorrowgate',
      x: 17_500,
      y: 40_500,
      widthM: 5_000,
      heightM: 4_000,
    });
    assert.equal(SORROWGATE_REGION.widthM, SORROWGATE_GROUND.widthM);
    assert.equal(SORROWGATE_REGION.heightM, SORROWGATE_GROUND.heightM);
    assert.equal(SORROWGATE_REGION.mapId, PROLOGUE_SORROWGATE_HEADER.mapId);
  });

  it('are valid: unique ids, known maps, whole cells, inside the atlas', () => {
    assert.deepEqual(worldRegionProblems(WORLD_REGIONS), []);
    for (const region of WORLD_REGIONS) assert.equal(worldRegionById(region.id), region);
    assert.equal(worldRegionById('no-such-region'), undefined);
  });

  it('refuses each invalid region by name', () => {
    const ok: WorldRegion = { ...SORROWGATE_REGION };
    const cases: [WorldRegion[], RegExp][] = [
      [[ok, { ...ok }], /sorrowgate: id used twice/],
      [[{ ...ok, mapId: 'no-such-map' }], /no mission plays on map 'no-such-map'/],
      [[{ ...ok, x: 17_600 }], /x 17600 is not a whole 250 m cell/],
      [[{ ...ok, heightM: 4_100 }], /heightM 4100 is not a whole 250 m cell/],
      [[{ ...ok, x: 36_000 }], /outside the atlas/],
      [[{ ...ok, y: -250 }], /outside the atlas/],
      [[{ ...ok, widthM: 0 }], /empty/],
      // Inside the frame, but 1,250 m from its west edge: §7.3's surround
      // would leave the atlas, and is never clipped.
      [[{ ...ok, x: 1_250 }], /detail surround leaves the atlas/],
      [[{ ...ok, y: 90_000 - 4_000 - 2_250 }], /detail surround leaves the atlas/],
    ];
    for (const [regions, expected] of cases) {
      const problems = worldRegionProblems(regions);
      assert.ok(
        problems.some((p) => expected.test(p)),
        `${expected}: got ${JSON.stringify(problems)}`
      );
    }
  });
});

describe('local and atlas metres', () => {
  it('round-trip, and put the court at (20,050, 42,650)', () => {
    const spawn = { x: 2_550, y: 2_150 };
    const atlas = localToAtlas(SORROWGATE_REGION, spawn);
    assert.deepEqual(atlas, { x: 20_050, y: 42_650 });
    assert.deepEqual(atlasToLocal(SORROWGATE_REGION, atlas), spawn);
    for (const point of [
      { x: 0, y: 0 },
      { x: 4_999.5, y: 3_999.5 },
      { x: -1_200, y: 6_300 },
    ]) {
      assert.deepEqual(
        atlasToLocal(SORROWGATE_REGION, localToAtlas(SORROWGATE_REGION, point)),
        point
      );
    }
  });

  it('bound a region half-open, west and north edges in', () => {
    const r = SORROWGATE_REGION;
    assert.ok(regionContains(r, { x: r.x, y: r.y }));
    assert.ok(regionContains(r, { x: r.x + r.widthM - 0.001, y: r.y + r.heightM - 0.001 }));
    assert.ok(!regionContains(r, { x: r.x + r.widthM, y: r.y }));
    assert.ok(!regionContains(r, { x: r.x, y: r.y + r.heightM }));
    assert.ok(!regionContains(r, { x: r.x - 0.001, y: r.y }));
  });
});

describe('the detail rectangle', () => {
  it("is Sorrowgate's 10 × 9 km at 15–25 km by 38–47 km, 1,440 cells", () => {
    const detail = detailRect(SORROWGATE_REGION);
    assert.deepEqual(detail, { x: 15_000, y: 38_000, widthM: 10_000, heightM: 9_000 });
    const cells = (detail.widthM / WORLD.DETAIL_CELL_M) * (detail.heightM / WORLD.DETAIL_CELL_M);
    assert.equal(cells, 1_440);
  });

  it('grows outward to the overview grid, never thinner than the surround', () => {
    const odd = { x: 5_250, y: 20_250, widthM: 3_000, heightM: 2_750 };
    const detail = detailRect(odd);
    for (const edge of [detail.x, detail.y, detail.x + detail.widthM, detail.y + detail.heightM]) {
      assert.equal(edge % WORLD.ATLAS_CELL_M, 0, `edge ${edge} off the overview grid`);
    }
    assert.deepEqual(detail, { x: 2_000, y: 17_000, widthM: 9_000, heightM: 9_000 });
    assert.ok(odd.x - detail.x >= WORLD.DETAIL_SURROUND_M);
    assert.ok(odd.y - detail.y >= WORLD.DETAIL_SURROUND_M);
    assert.ok(detail.x + detail.widthM - (odd.x + odd.widthM) >= WORLD.DETAIL_SURROUND_M);
    assert.ok(detail.y + detail.heightM - (odd.y + odd.heightM) >= WORLD.DETAIL_SURROUND_M);
  });

  it('is never clipped at the frame; the placement is refused instead', () => {
    // §7.3 promises the surround on every side (the owner's call on #1456).
    const nearEdge = { x: 1_250, y: 20_250, widthM: 3_000, heightM: 2_750 };
    assert.equal(detailRect(nearEdge).x, -2_000);
  });
});

describe('the pilot predicate', () => {
  it('draws the prologue in the world, and no other mission', () => {
    assert.equal(worldRegionForMission(PROLOGUE_SORROWGATE_HEADER.id), SORROWGATE_REGION);
    assert.equal(worldRegionForMission(undefined), undefined);
    // Radicals plays on Sorrowgate's map and keeps its presentation: the
    // predicate is keyed on mission identity, never on the map (§7.1).
    const radicals = MISSION_HEADERS.find((h) => h.id === 'seeding-radicals');
    assert.equal(radicals?.mapId, 'sorrowgate');
    for (const header of MISSION_HEADERS) {
      if (header.id === PROLOGUE_SORROWGATE_HEADER.id) continue;
      assert.equal(worldRegionForMission(header.id), undefined, header.id);
    }
    // A `?map=` boot passes no mission, and the map id is not one.
    assert.equal(worldRegionForMission('sorrowgate'), undefined);
  });
});

describe('the public boundary', () => {
  it('gives a placed map its ground and nothing else', () => {
    // A spawn, a force or a resource field before a match is knowledge the
    // player has not earned (`maps.ts`); if a field here is genuinely ground,
    // add it deliberately.
    assert.deepEqual(Object.keys(SORROWGATE_GROUND).sort(), [
      'cellM',
      'floorM',
      'heightM',
      'regions',
      'widthM',
    ]);
    const regionKeys = new Set([
      'shape',
      'x',
      'y',
      'widthM',
      'heightM',
      'points',
      'biome',
      'floorM',
      'ceilingM',
      'note',
    ]);
    for (const region of SORROWGATE_GROUND.regions) {
      for (const key of Object.keys(region)) assert.ok(regionKeys.has(key), `region key ${key}`);
    }
  });

  it('keeps its regions on whole 250 m cells', () => {
    const cell = SORROWGATE_GROUND.cellM;
    const whole = (v: number) => v % cell === 0;
    const corners = (r: GroundRegion): number[] =>
      r.shape === 'polygon' ? r.points.flat() : [r.x, r.y, r.widthM, r.heightM];
    for (const region of SORROWGATE_GROUND.regions) {
      assert.ok(corners(region).every(whole), region.note);
    }
  });

  it('imports nothing from outside the shared package', () => {
    // The client bundles this package whole, so one import of a backend
    // module would ship authoring data to every browser.
    const dir = new URL('../src/', import.meta.url);
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
      const source = readFileSync(new URL(file, dir), 'utf8');
      for (const match of source.matchAll(/^\s*(?:import|export)[^'"]*from\s+'([^']+)'/gm)) {
        assert.match(match[1]!, /^\.\/[\w.]+\.js$/, `${file} imports ${match[1]}`);
      }
    }
  });
});
