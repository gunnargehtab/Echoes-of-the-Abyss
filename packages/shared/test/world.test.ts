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
  ATTENDING_INTAKE_HEADER,
  BANDING_GROUND_GROUND,
  BANDING_GROUND_REGION,
  Biome,
  MAP_HEADERS,
  MISSION_HEADERS,
  PLACED_GROUND,
  PROLOGUE_SORROWGATE_HEADER,
  RIFT_ATLAS,
  RIFT_PLACES,
  SORROWGATE_GROUND,
  SORROWGATE_REGION,
  WORLD,
  WORLD_REGIONS,
  atlasToLocal,
  clampToRect,
  detailOwner,
  detailRect,
  exteriorDistanceM,
  exteriorFade,
  localToAtlas,
  regionContains,
  worldRegionById,
  worldRegionForMission,
  worldRegionForSession,
  worldRegionProblems,
  type GroundRegion,
  type MapGround,
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

  it("centres the Banding Ground on §7.2's banding ground anchor (§7.9, #1598)", () => {
    assert.deepEqual(BANDING_GROUND_REGION, {
      id: 'banding-ground',
      mapId: 'banding-ground',
      x: 20_500,
      y: 62_000,
      widthM: 5_000,
      heightM: 4_000,
    });
    assert.equal(BANDING_GROUND_REGION.widthM, BANDING_GROUND_GROUND.widthM);
    assert.equal(BANDING_GROUND_REGION.heightM, BANDING_GROUND_GROUND.heightM);
    assert.equal(BANDING_GROUND_REGION.mapId, ATTENDING_INTAKE_HEADER.mapId);
    const anchor = RIFT_PLACES.find((p) => p.id === 'banding-ground')!;
    assert.deepEqual(
      [
        BANDING_GROUND_REGION.x + BANDING_GROUND_REGION.widthM / 2,
        BANDING_GROUND_REGION.y + BANDING_GROUND_REGION.heightM / 2,
      ],
      [anchor.x, anchor.y]
    );
  });

  it('place every map whose ground is placed, and none without', () => {
    assert.deepEqual(WORLD_REGIONS.map((r) => r.mapId).sort(), Object.keys(PLACED_GROUND).sort());
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
      [[{ ...ok, mapId: 'no-such-map' }], /no mission or skirmish plays on map 'no-such-map'/],
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

describe('two placed maps sharing ground (#1527)', () => {
  // Two 2 km maps of one flat seabed, 1 km apart: they share a 1 × 2 km strip.
  const flat = (floorM: number, regions: GroundRegion[] = []): MapGround => ({
    widthM: 2_000,
    heightM: 2_000,
    cellM: 250,
    floorM,
    regions,
  });
  const west: WorldRegion = {
    id: 'west',
    mapId: 'west',
    x: 10_000,
    y: 40_000,
    widthM: 2_000,
    heightM: 2_000,
  };
  const east: WorldRegion = { ...west, id: 'east', mapId: 'east', x: 11_000 };
  const maps = new Set(['west', 'east']);
  const problemsWith = (eastGround: MapGround, regions = [west, east]) =>
    worldRegionProblems(regions, maps, { west: flat(1_000), east: eastGround });

  it('allows an overlap whose every shared cell agrees, and a shared edge', () => {
    assert.deepEqual(problemsWith(flat(1_000)), []);
    // Ground east of the strip is the east map's alone, so it may differ.
    const ridge = flat(1_000, [
      { x: 1_000, y: 0, widthM: 1_000, heightM: 2_000, biome: Biome.AbyssalTrench, floorM: 400 },
    ]);
    assert.deepEqual(problemsWith(ridge), []);
    assert.deepEqual(problemsWith(flat(1_200), [west, { ...east, x: 12_000 }]), []);
  });

  it('refuses an overlap where a shared cell differs in floor, ceiling or biome', () => {
    const cases: [MapGround, RegExp][] = [
      [
        flat(1_200),
        /west and east: overlap, and 32 shared cells disagree, the first at \(11000, 40000\)/,
      ],
      [
        flat(1_000, [
          { x: 750, y: 1_750, widthM: 250, heightM: 250, biome: Biome.OpenWater, ceilingM: 300 },
        ]),
        /1 shared cells disagree, the first at \(11750, 41750\)/,
      ],
      [
        flat(1_000, [{ x: 0, y: 500, widthM: 250, heightM: 250, biome: Biome.KelpForest }]),
        /1 shared cells disagree, the first at \(11000, 40500\)/,
      ],
    ];
    for (const [ground, expected] of cases) {
      const problems = problemsWith(ground);
      assert.equal(problems.length, 1, JSON.stringify(problems));
      assert.match(problems[0]!, expected);
    }
  });

  it('refuses an overlap with a map whose ground is not placed', () => {
    const problems = worldRegionProblems([west, east], maps, { west: flat(1_000) });
    assert.deepEqual(problems, [
      "west and east: overlap, and east's ground is not placed to compare",
    ]);
  });

  it("reads Sorrowgate's own ground: itself agrees, itself a cell east does not", () => {
    const twin: WorldRegion = { ...SORROWGATE_REGION, id: 'twin' };
    assert.deepEqual(worldRegionProblems([SORROWGATE_REGION, twin]), []);
    const shifted = worldRegionProblems([SORROWGATE_REGION, { ...twin, x: twin.x + 250 }]);
    assert.equal(shifted.length, 1, JSON.stringify(shifted));
    assert.match(shifted[0]!, /^sorrowgate and twin: overlap, and \d+ shared cells disagree/);
  });
});

describe('two surrounds drawn together (#1528)', () => {
  // A map placed 1,500 m east of Sorrowgate's: the two detail rectangles
  // share 21–25 km by 38–47 km, and neither map stands in the other's.
  const east: WorldRegion = {
    id: 'east',
    mapId: 'sorrowgate',
    x: 24_000,
    y: 41_000,
    widthM: 4_000,
    heightM: 3_000,
  };
  // And one whose patch overlaps Sorrowgate's by its west 1,000 m.
  const over: WorldRegion = { ...east, id: 'over', x: 21_500 };

  it('gives a cell between two surrounds to the nearer map rectangle', () => {
    const drawn = [SORROWGATE_REGION, east];
    // 22,600 is 100 m from Sorrowgate's east edge and 1,400 m from east's west edge.
    assert.equal(detailOwner(drawn, { x: 22_600, y: 42_000 })?.id, 'sorrowgate');
    assert.equal(detailOwner(drawn, { x: 23_900, y: 42_000 })?.id, 'east');
    // Either order: a property of the place, never of which arrived first.
    for (const point of [
      { x: 22_600, y: 42_000 },
      { x: 23_900, y: 42_000 },
      { x: 23_100, y: 38_100 },
    ]) {
      assert.equal(
        detailOwner(drawn, point)?.id,
        detailOwner([east, SORROWGATE_REGION], point)?.id
      );
    }
  });

  it('lets a mission patch beat any surround, and a tie go to the first listed', () => {
    // In east's patch, 1,250 m outside Sorrowgate's map, inside its surround.
    assert.equal(detailOwner([SORROWGATE_REGION, east], { x: 24_100, y: 42_000 })?.id, 'east');
    // In both patches, where §7.2 says the cells agree: the first listed.
    assert.equal(
      detailOwner([SORROWGATE_REGION, over], { x: 22_000, y: 42_000 })?.id,
      'sorrowgate'
    );
    assert.equal(detailOwner([over, SORROWGATE_REGION], { x: 22_000, y: 42_000 })?.id, 'over');
  });

  it('owns by the cell, and only where a detail draws', () => {
    const drawn = [SORROWGATE_REGION, east];
    // Every point of one 250 m cell has one owner: its centre's.
    const corner = detailOwner(drawn, { x: 23_000, y: 42_000 });
    assert.equal(detailOwner(drawn, { x: 23_249, y: 42_249 }), corner);
    // Past Sorrowgate's detail, east's alone; past both, nobody's.
    assert.equal(detailOwner(drawn, { x: 25_500, y: 42_000 })?.id, 'east');
    assert.equal(detailOwner(drawn, { x: 31_500, y: 42_000 }), undefined);
    assert.equal(detailOwner([], { x: 20_000, y: 42_000 }), undefined);
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

describe('the mission border', () => {
  const mission = { x: 0, y: 0, widthM: 5_000, heightM: 4_000 };

  it('measures d as zero inside, from the nearest edge outside, round at a corner', () => {
    assert.equal(exteriorDistanceM(mission, { x: 2_500, y: 2_000 }), 0);
    assert.equal(exteriorDistanceM(mission, { x: 5_000, y: 4_000 }), 0, 'the edge is inside');
    assert.equal(exteriorDistanceM(mission, { x: -300, y: 1_000 }), 300);
    assert.equal(exteriorDistanceM(mission, { x: 2_000, y: 4_750 }), 750);
    assert.equal(exteriorDistanceM(mission, { x: 5_300, y: -400 }), 500, 'a 3-4-5 off the corner');
  });

  it('fades exactly 1 inside, smoothstep to 0 at W = 2,000 m, and never back', () => {
    assert.equal(WORLD.FADE_M, 2_000);
    assert.equal(exteriorFade(0), 1);
    assert.equal(exteriorFade(-50), 1);
    assert.equal(exteriorFade(2_000), 0);
    assert.equal(exteriorFade(9_000), 0);
    assert.equal(exteriorFade(1_000), 0.5, 'the midpoint of a smoothstep');
    // §7.4's own reading: 0.96 one 250 m cell out, where the rim still marks the line.
    assert.equal(exteriorFade(250).toFixed(2), '0.96');
    let last = 1;
    for (let d = 0; d <= 2_100; d += 25) {
      const f = exteriorFade(d);
      assert.ok(f <= last && f >= 0 && f <= 1, `monotone at ${d}`);
      last = f;
    }
  });

  it('clamps a focus onto the mission, closed at the far edges', () => {
    assert.deepEqual(clampToRect(mission, { x: -10, y: 9_000 }), { x: 0, y: 4_000 });
    assert.deepEqual(clampToRect(mission, { x: 5_000, y: 4_000 }), { x: 5_000, y: 4_000 });
    assert.deepEqual(clampToRect(mission, { x: 1_234, y: 567 }), { x: 1_234, y: 567 });
  });
});

describe('the placed-mission predicate', () => {
  it('draws the prologue and Intake in the world, each on its region, and no other mission', () => {
    assert.equal(worldRegionForMission(PROLOGUE_SORROWGATE_HEADER.id), SORROWGATE_REGION);
    assert.equal(worldRegionForMission(ATTENDING_INTAKE_HEADER.id), BANDING_GROUND_REGION);
    assert.equal(worldRegionForMission(undefined), undefined);
    // Radicals plays on Sorrowgate's map and keeps its presentation: the
    // predicate is keyed on mission identity, never on the map (§7.1).
    const radicals = MISSION_HEADERS.find((h) => h.id === 'seeding-radicals');
    assert.equal(radicals?.mapId, 'sorrowgate');
    const placed = new Set([PROLOGUE_SORROWGATE_HEADER.id, ATTENDING_INTAKE_HEADER.id]);
    for (const header of MISSION_HEADERS) {
      if (placed.has(header.id)) continue;
      assert.equal(worldRegionForMission(header.id), undefined, header.id);
    }
    // A `?map=` boot passes no mission, and the map id is not one.
    assert.equal(worldRegionForMission('sorrowgate'), undefined);
    assert.equal(worldRegionForMission('banding-ground'), undefined);
  });

  it("places each mission on its own map's region", () => {
    for (const header of MISSION_HEADERS) {
      const region = worldRegionForMission(header.id);
      if (region !== undefined) assert.equal(region.mapId, header.mapId, header.id);
    }
  });
});

describe('a skirmish boot (#1529)', () => {
  // A `?map=` boot has no mission, so it is placed by its map id, when the map
  // is a skirmish map with a placement (docs/world-map.md §7.1).
  const corridor: (typeof WORLD_REGIONS)[number] = {
    id: 'corridor',
    mapId: 'abyssal-rift-corridor',
    x: 30_000,
    y: 50_000,
    widthM: 6_000,
    heightM: 4_000,
  };

  it('resolves a placed skirmish map to its region', () => {
    assert.ok(MAP_HEADERS.some((h) => h.id === corridor.mapId));
    assert.equal(worldRegionForSession(undefined, corridor.mapId, [corridor]), corridor);
    assert.equal(worldRegionForSession('', corridor.mapId, [corridor]), corridor);
    // And the validator takes it: a skirmish map is a known map (§7.9).
    const problems = worldRegionProblems([corridor], undefined, {});
    assert.ok(!problems.some((p) => /plays on map/.test(p)), problems.join('; '));
  });

  it('resolves none for every skirmish map today: the Ventfront Divide stays the control', () => {
    for (const header of MAP_HEADERS) {
      assert.equal(worldRegionForSession(undefined, header.id), undefined, header.id);
    }
    assert.equal(worldRegionForSession(undefined, 'ventfront-divide', [corridor]), undefined);
    assert.equal(worldRegionForSession(undefined, undefined), undefined);
  });

  it('places a mission by its identity alone, and a mission map never by its id', () => {
    assert.equal(
      worldRegionForSession(PROLOGUE_SORROWGATE_HEADER.id, undefined),
      SORROWGATE_REGION
    );
    assert.equal(worldRegionForSession('seeding-radicals', 'sorrowgate'), undefined);
    assert.equal(worldRegionForSession(undefined, 'sorrowgate'), undefined);
  });
});

describe('the public boundary', () => {
  it('gives a placed map its ground and nothing else', () => {
    // A spawn, a force or a resource field before a match is knowledge the
    // player has not earned (`maps.ts`); if a field here is genuinely ground,
    // add it deliberately.
    for (const [mapId, ground] of Object.entries(PLACED_GROUND)) {
      assert.deepEqual(
        Object.keys(ground).sort(),
        ['cellM', 'floorM', 'heightM', 'regions', 'widthM'],
        mapId
      );
    }
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
    for (const ground of Object.values(PLACED_GROUND)) {
      for (const region of ground.regions) {
        for (const key of Object.keys(region)) assert.ok(regionKeys.has(key), `region key ${key}`);
      }
    }
  });

  it('keeps its regions on whole 250 m cells', () => {
    const corners = (r: GroundRegion): number[] =>
      r.shape === 'polygon' ? r.points.flat() : [r.x, r.y, r.widthM, r.heightM];
    for (const ground of Object.values(PLACED_GROUND)) {
      const whole = (v: number) => v % ground.cellM === 0;
      for (const region of ground.regions) {
        assert.ok(corners(region).every(whole), region.note);
      }
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
