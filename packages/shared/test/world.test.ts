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
  ANHOLT_FURROW_GROUND,
  ANHOLT_FURROW_REGION,
  ATTENDING_ATTENDANCE_HEADER,
  ATTENDING_CONCLAVE_HEADER,
  ATTENDING_FIRST_ARRIVAL_HEADER,
  ATTENDING_GALLERIES_GROUND,
  ATTENDING_GALLERIES_REGION,
  ATTENDING_INTAKE_HEADER,
  ATTENDING_SHALLOW_HEADER,
  ATTENDING_THE_DOME_HEADER,
  ATTENDING_TRENCH_AWAKENING_HEADER,
  BANDING_GROUND_GROUND,
  BANDING_GROUND_REGION,
  Biome,
  CHORD_RIM_DEPOSITS_HEADER,
  CHORD_SECOND_CHORD_HEADER,
  FACE_SIX_GROUND,
  FACE_SIX_REGION,
  FOURTH_FOOT_GROUND,
  FOURTH_FOOT_REGION,
  HOLDING_BOARD_GROUND,
  HOLDING_BOARD_REGION,
  HOLDING_UNDERWORKS_GROUND,
  HOLDING_UNDERWORKS_REGION,
  KELL_SHOULDER_GROUND,
  KELL_SHOULDER_REGION,
  LEDGER_ASSET_RECOVERY_HEADER,
  LEDGER_EXPOSURE_HEADER,
  LEDGER_ITEM_NINE_HEADER,
  LEDGER_PROSPECT_HEADER,
  LEDGER_SHIFT_CHANGE_HEADER,
  LEDGER_TOLERANCE_HEADER,
  MAP_HEADERS,
  MARR_PLATEAU_GROUND,
  MARR_PLATEAU_REGION,
  MISSION_HEADERS,
  MOUTH_RIM_GROUND,
  MOUTH_RIM_REGION,
  PLACED_GROUND,
  PROLOGUE_SORROWGATE_HEADER,
  RIFT_ATLAS,
  RIFT_PLACES,
  SEEDING_CONVOCATION_HEADER,
  SEEDING_DEEP_FURROW_HEADER,
  SEEDING_IN_WRITING_HEADER,
  SEEDING_SECOND_SEEDING_HEADER,
  SEEDING_TEND_HEADER,
  SEEDING_THIN_WATER_HEADER,
  SHALLOW_BAND_GROUND,
  SHALLOW_BAND_REGION,
  SORROWGATE_GROUND,
  SORROWGATE_REGION,
  UPPER_TERRACES_GROUND,
  UPPER_TERRACES_REGION,
  UPPER_WORKINGS_GROUND,
  UPPER_WORKINGS_REGION,
  WORLD,
  WESTERN_MARGIN_GROUND,
  WESTERN_MARGIN_REGION,
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

  it("centres the Western Margin on §7.2's anchor, edge to edge north of the band (§7.9, #1612)", () => {
    assert.deepEqual(WESTERN_MARGIN_REGION, {
      id: 'first-trench-margin',
      mapId: 'first-trench-margin',
      x: 3_500,
      y: 48_000,
      widthM: 5_000,
      heightM: 3_000,
    });
    assert.equal(WESTERN_MARGIN_REGION.widthM, WESTERN_MARGIN_GROUND.widthM);
    assert.equal(WESTERN_MARGIN_REGION.heightM, WESTERN_MARGIN_GROUND.heightM);
    assert.equal(WESTERN_MARGIN_REGION.mapId, LEDGER_EXPOSURE_HEADER.mapId);
    const anchor = RIFT_PLACES.find((p) => p.id === 'western-margin')!;
    assert.deepEqual(
      [
        WESTERN_MARGIN_REGION.x + WESTERN_MARGIN_REGION.widthM / 2,
        WESTERN_MARGIN_REGION.y + WESTERN_MARGIN_REGION.heightM / 2,
      ],
      [anchor.x, anchor.y]
    );
    // Edge to edge with the Shallow Band, centred on its own anchor and 4 km
    // tall: the margin's south edge is the band's north edge (#1565).
    const band = RIFT_PLACES.find((p) => p.id === 'first-trench')!;
    assert.equal(WESTERN_MARGIN_REGION.y + WESTERN_MARGIN_REGION.heightM, band.y - 4_000 / 2);
  });

  it("centres the Shallow Band on §7.2's First Trench anchor, under the margin (§7.9, #1615)", () => {
    assert.deepEqual(SHALLOW_BAND_REGION, {
      id: 'shallow-band',
      mapId: 'shallow-band',
      x: 3_500,
      y: 51_000,
      widthM: 5_000,
      heightM: 4_000,
    });
    assert.equal(SHALLOW_BAND_REGION.widthM, SHALLOW_BAND_GROUND.widthM);
    assert.equal(SHALLOW_BAND_REGION.heightM, SHALLOW_BAND_GROUND.heightM);
    assert.equal(SHALLOW_BAND_REGION.mapId, ATTENDING_TRENCH_AWAKENING_HEADER.mapId);
    const anchor = RIFT_PLACES.find((p) => p.id === 'first-trench')!;
    assert.deepEqual(
      [
        SHALLOW_BAND_REGION.x + SHALLOW_BAND_REGION.widthM / 2,
        SHALLOW_BAND_REGION.y + SHALLOW_BAND_REGION.heightM / 2,
      ],
      [anchor.x, anchor.y]
    );
    // Edge to edge: the band's north edge is the margin's south edge, so the
    // two share no cell and need not agree on one (§7.2).
    assert.equal(SHALLOW_BAND_REGION.y, WESTERN_MARGIN_REGION.y + WESTERN_MARGIN_REGION.heightM);
    assert.equal(SHALLOW_BAND_REGION.x, WESTERN_MARGIN_REGION.x);
  });

  it('places the two Ninefold maps a row apart on the Vein (§7.9, #1626)', () => {
    assert.deepEqual(UPPER_WORKINGS_REGION, {
      id: 'ninefold-workings',
      mapId: 'ninefold-workings',
      x: 3_500,
      y: 21_750,
      widthM: 4_000,
      heightM: 3_000,
    });
    assert.deepEqual(FACE_SIX_REGION, {
      id: 'ninefold-face-six',
      mapId: 'ninefold-face-six',
      x: 3_000,
      y: 25_000,
      widthM: 4_000,
      heightM: 3_000,
    });
    for (const [region, ground] of [
      [UPPER_WORKINGS_REGION, UPPER_WORKINGS_GROUND],
      [FACE_SIX_REGION, FACE_SIX_GROUND],
    ] as const) {
      assert.equal(region.widthM, ground.widthM);
      assert.equal(region.heightM, ground.heightM);
    }
    assert.equal(UPPER_WORKINGS_REGION.mapId, LEDGER_SHIFT_CHANGE_HEADER.mapId);
    assert.equal(FACE_SIX_REGION.mapId, LEDGER_ASSET_RECOVERY_HEADER.mapId);
    // The Workings' rail head, cells (1,500–2,500, 0–500), stands on Fivewell.
    const fivewell = RIFT_PLACES.find((p) => p.id === 'fivewell')!;
    assert.deepEqual(
      [UPPER_WORKINGS_REGION.x + 2_000, UPPER_WORKINGS_REGION.y + 250],
      [fivewell.x, fivewell.y]
    );
    const vein = RIFT_PLACES.find((p) => p.id === 'ninefold-vein')!;
    assert.deepEqual(
      [
        FACE_SIX_REGION.x + FACE_SIX_REGION.widthM / 2,
        FACE_SIX_REGION.y + FACE_SIX_REGION.heightM / 2,
      ],
      [vein.x, vein.y]
    );
    // One row apart: the two share no cell and need not agree on one (§7.2).
    assert.equal(
      FACE_SIX_REGION.y - (UPPER_WORKINGS_REGION.y + UPPER_WORKINGS_REGION.heightM),
      250
    );
  });

  it("stands the Fourth's Foot with its Deep Yard on §7.2's anchor (§7.9, #1628)", () => {
    assert.deepEqual(FOURTH_FOOT_REGION, {
      id: 'fourth-foot',
      mapId: 'fourth-foot',
      x: 10_000,
      y: 54_000,
      widthM: 3_000,
      heightM: 6_000,
    });
    assert.equal(FOURTH_FOOT_REGION.widthM, FOURTH_FOOT_GROUND.widthM);
    assert.equal(FOURTH_FOOT_REGION.heightM, FOURTH_FOOT_GROUND.heightM);
    assert.equal(FOURTH_FOOT_REGION.mapId, ATTENDING_THE_DOME_HEADER.mapId);
    // The Deep Yard is cells (750–2,250, 4,250–4,750); its middle is the anchor.
    const yard = RIFT_PLACES.find((p) => p.id === 'deep-yard')!;
    assert.deepEqual(
      [FOURTH_FOOT_REGION.x + 1_500, FOURTH_FOOT_REGION.y + 4_500],
      [yard.x, yard.y]
    );
    // *Baffle*'s Fourth Trench holds the same ground and stays unplaced (#1505).
    assert.equal(
      WORLD_REGIONS.some((r) => r.mapId === 'fourth-trench'),
      false
    );
  });

  it("stands Marr Plateau centred on §7.2's anchor (§7.9, #1630)", () => {
    assert.deepEqual(MARR_PLATEAU_REGION, {
      id: 'marr-plateau',
      mapId: 'marr-plateau',
      x: 6_000,
      y: 2_500,
      widthM: 4_000,
      heightM: 2_500,
    });
    assert.equal(MARR_PLATEAU_REGION.widthM, MARR_PLATEAU_GROUND.widthM);
    assert.equal(MARR_PLATEAU_REGION.heightM, MARR_PLATEAU_GROUND.heightM);
    // Both of its missions play it, and both are drawn there (#1505).
    for (const mission of [SEEDING_TEND_HEADER, SEEDING_CONVOCATION_HEADER]) {
      assert.equal(MARR_PLATEAU_REGION.mapId, mission.mapId, mission.id);
    }
    const marr = RIFT_PLACES.find((p) => p.id === 'marr')!;
    assert.deepEqual(
      [MARR_PLATEAU_REGION.x + 2_000, MARR_PLATEAU_REGION.y + 1_250],
      [marr.x, marr.y]
    );
  });

  it("stands the Kell Shoulder centred on §7.2's anchor (§7.9, #1633)", () => {
    assert.deepEqual(KELL_SHOULDER_REGION, {
      id: 'kell-shoulder',
      mapId: 'kell-shoulder',
      x: 6_500,
      y: 6_000,
      widthM: 5_000,
      heightM: 3_000,
    });
    assert.equal(KELL_SHOULDER_REGION.widthM, KELL_SHOULDER_GROUND.widthM);
    assert.equal(KELL_SHOULDER_REGION.heightM, KELL_SHOULDER_GROUND.heightM);
    // Both of its missions play it, and both are drawn there (#1505).
    for (const mission of [SEEDING_THIN_WATER_HEADER, ATTENDING_SHALLOW_HEADER]) {
      assert.equal(KELL_SHOULDER_REGION.mapId, mission.mapId, mission.id);
    }
    const shoulder = RIFT_PLACES.find((p) => p.id === 'kell-shoulder')!;
    assert.deepEqual(
      [KELL_SHOULDER_REGION.x + 2_500, KELL_SHOULDER_REGION.y + 1_500],
      [shoulder.x, shoulder.y]
    );
    // A kilometre of Marr's Drop between the two maps, so they share no cell.
    assert.equal(
      KELL_SHOULDER_REGION.y - (MARR_PLATEAU_REGION.y + MARR_PLATEAU_REGION.heightM),
      1_000
    );
  });

  it("stands the Furrow centred on §7.2's anchor (§7.9, #1638)", () => {
    assert.deepEqual(ANHOLT_FURROW_REGION, {
      id: 'anholt-furrow',
      mapId: 'anholt-furrow',
      x: 22_000,
      y: 17_500,
      widthM: 4_000,
      heightM: 3_000,
    });
    assert.equal(ANHOLT_FURROW_REGION.widthM, ANHOLT_FURROW_GROUND.widthM);
    assert.equal(ANHOLT_FURROW_REGION.heightM, ANHOLT_FURROW_GROUND.heightM);
    // Both of its missions play it, and both are drawn there (#1505).
    for (const mission of [SEEDING_DEEP_FURROW_HEADER, SEEDING_IN_WRITING_HEADER]) {
      assert.equal(ANHOLT_FURROW_REGION.mapId, mission.mapId, mission.id);
    }
    const furrow = RIFT_PLACES.find((p) => p.id === 'the-furrow')!;
    assert.deepEqual(
      [ANHOLT_FURROW_REGION.x + 2_000, ANHOLT_FURROW_REGION.y + 1_500],
      [furrow.x, furrow.y]
    );
  });

  it("stands the Rim with its four bands on §7.2's band anchors (§7.9, #1640)", () => {
    assert.deepEqual(MOUTH_RIM_REGION, {
      id: 'mouth-rim',
      mapId: 'mouth-rim',
      x: 17_000,
      y: 79_000,
      widthM: 6_000,
      heightM: 4_000,
    });
    assert.equal(MOUTH_RIM_REGION.widthM, MOUTH_RIM_GROUND.widthM);
    assert.equal(MOUTH_RIM_REGION.heightM, MOUTH_RIM_GROUND.heightM);
    // All five of its missions play it, and all five are drawn there (#1505).
    for (const mission of [
      LEDGER_PROSPECT_HEADER,
      SEEDING_SECOND_SEEDING_HEADER,
      ATTENDING_FIRST_ARRIVAL_HEADER,
      CHORD_RIM_DEPOSITS_HEADER,
      CHORD_SECOND_CHORD_HEADER,
    ]) {
      assert.equal(MOUTH_RIM_REGION.mapId, mission.mapId, mission.id);
    }
    // Each band is a kilometre of the map and stands on its anchor's row; the
    // first three are centred on theirs, and the Lip's lies 500 m east.
    const at = (id: string) => RIFT_PLACES.find((p) => p.id === id)!;
    ['the-staging', 'the-slopes', 'the-terraces'].forEach((id, band) => {
      assert.deepEqual(
        [MOUTH_RIM_REGION.x + 3_000, MOUTH_RIM_REGION.y + band * 1_000 + 500],
        [at(id).x, at(id).y],
        id
      );
    });
    const lip = at('the-lip');
    assert.equal(lip.y, MOUTH_RIM_REGION.y + 3_500);
    assert.equal(lip.x - (MOUTH_RIM_REGION.x + MOUTH_RIM_REGION.widthM), 500);
  });

  it('stands Board Country and the Underworks edge to edge, each centred on its anchor (§7.9, #1623)', () => {
    assert.deepEqual(HOLDING_BOARD_REGION, {
      id: 'holding-board',
      mapId: 'holding-board',
      x: 4_000,
      y: 15_500,
      widthM: 3_000,
      heightM: 2_500,
    });
    assert.deepEqual(HOLDING_UNDERWORKS_REGION, {
      id: 'holding-underworks',
      mapId: 'holding-underworks',
      x: 4_000,
      y: 18_000,
      widthM: 4_000,
      heightM: 3_000,
    });
    for (const [region, ground, mission] of [
      [HOLDING_BOARD_REGION, HOLDING_BOARD_GROUND, LEDGER_ITEM_NINE_HEADER],
      [HOLDING_UNDERWORKS_REGION, HOLDING_UNDERWORKS_GROUND, LEDGER_TOLERANCE_HEADER],
    ] as const) {
      assert.equal(region.widthM, ground.widthM);
      assert.equal(region.heightM, ground.heightM);
      assert.equal(region.mapId, mission.mapId, mission.id);
    }
    const at = (id: string) => RIFT_PLACES.find((p) => p.id === id)!;
    // The Underway moved 1,750 m north so the two meet edge to edge rather
    // than over each other (the owner's call on #1623).
    assert.deepEqual(
      [HOLDING_BOARD_REGION.x + 1_500, HOLDING_BOARD_REGION.y + 1_250],
      [at('the-underway').x, at('the-underway').y]
    );
    assert.deepEqual(
      [HOLDING_UNDERWORKS_REGION.x + 2_000, HOLDING_UNDERWORKS_REGION.y + 1_500],
      [at('the-underworks').x, at('the-underworks').y]
    );
    assert.equal(
      HOLDING_BOARD_REGION.y + HOLDING_BOARD_REGION.heightM,
      HOLDING_UNDERWORKS_REGION.y
    );
    // Sector Vayle stands in the Underworks' Upper Berths, where Tolerance's
    // map draws its frame, and not on Board Country's ground (#1623).
    const vayle = at('sector-vayle');
    assert.ok(
      vayle.y >= HOLDING_UNDERWORKS_REGION.y && vayle.y < HOLDING_UNDERWORKS_REGION.y + 750
    );
  });

  it('stands the Upper Terraces on Sufficiency and the galleries edge to edge south (§7.9, #1624)', () => {
    assert.deepEqual(UPPER_TERRACES_REGION, {
      id: 'upper-terraces',
      mapId: 'upper-terraces',
      x: 22_500,
      y: 67_000,
      widthM: 5_000,
      heightM: 4_000,
    });
    assert.deepEqual(ATTENDING_GALLERIES_REGION, {
      id: 'attending-galleries',
      mapId: 'attending-galleries',
      x: 22_000,
      y: 71_000,
      widthM: 5_000,
      heightM: 4_000,
    });
    for (const [region, ground, mission] of [
      [UPPER_TERRACES_REGION, UPPER_TERRACES_GROUND, ATTENDING_CONCLAVE_HEADER],
      [ATTENDING_GALLERIES_REGION, ATTENDING_GALLERIES_GROUND, ATTENDING_ATTENDANCE_HEADER],
    ] as const) {
      assert.equal(region.widthM, ground.widthM);
      assert.equal(region.heightM, ground.heightM);
      assert.equal(region.mapId, mission.mapId, mission.id);
    }
    const at = (id: string) => RIFT_PLACES.find((p) => p.id === id)!;
    assert.deepEqual(
      [UPPER_TERRACES_REGION.x + 2_500, UPPER_TERRACES_REGION.y + 2_000],
      [at('sufficiency').x, at('sufficiency').y]
    );
    assert.equal(
      UPPER_TERRACES_REGION.y + UPPER_TERRACES_REGION.heightM,
      ATTENDING_GALLERIES_REGION.y
    );
    // The galleries' anchor stays (the owner's call on #1624): on the map's
    // Lower Rows, eleven kilometres north of the Lip and three from the sill.
    const galleries = at('attending-galleries');
    assert.deepEqual(
      [galleries.x - ATTENDING_GALLERIES_REGION.x, galleries.y - ATTENDING_GALLERIES_REGION.y],
      [2_500, 500]
    );
    assert.equal(at('the-lip').y - galleries.y, 11_000);
    assert.equal(at('the-sill').y - galleries.y, 3_000);
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
  it('draws the placed missions in the world, each on its region, and no other', () => {
    assert.equal(worldRegionForMission(PROLOGUE_SORROWGATE_HEADER.id), SORROWGATE_REGION);
    assert.equal(worldRegionForMission(ATTENDING_INTAKE_HEADER.id), BANDING_GROUND_REGION);
    assert.equal(worldRegionForMission(LEDGER_EXPOSURE_HEADER.id), WESTERN_MARGIN_REGION);
    assert.equal(worldRegionForMission(ATTENDING_TRENCH_AWAKENING_HEADER.id), SHALLOW_BAND_REGION);
    assert.equal(worldRegionForMission(LEDGER_SHIFT_CHANGE_HEADER.id), UPPER_WORKINGS_REGION);
    assert.equal(worldRegionForMission(LEDGER_ASSET_RECOVERY_HEADER.id), FACE_SIX_REGION);
    assert.equal(worldRegionForMission(ATTENDING_THE_DOME_HEADER.id), FOURTH_FOOT_REGION);
    assert.equal(worldRegionForMission(SEEDING_TEND_HEADER.id), MARR_PLATEAU_REGION);
    assert.equal(worldRegionForMission(SEEDING_CONVOCATION_HEADER.id), MARR_PLATEAU_REGION);
    assert.equal(worldRegionForMission(SEEDING_THIN_WATER_HEADER.id), KELL_SHOULDER_REGION);
    assert.equal(worldRegionForMission(ATTENDING_SHALLOW_HEADER.id), KELL_SHOULDER_REGION);
    assert.equal(worldRegionForMission(SEEDING_DEEP_FURROW_HEADER.id), ANHOLT_FURROW_REGION);
    assert.equal(worldRegionForMission(SEEDING_IN_WRITING_HEADER.id), ANHOLT_FURROW_REGION);
    for (const mission of [
      LEDGER_PROSPECT_HEADER,
      SEEDING_SECOND_SEEDING_HEADER,
      ATTENDING_FIRST_ARRIVAL_HEADER,
      CHORD_RIM_DEPOSITS_HEADER,
      CHORD_SECOND_CHORD_HEADER,
    ]) {
      assert.equal(worldRegionForMission(mission.id), MOUTH_RIM_REGION, mission.id);
    }
    assert.equal(worldRegionForMission(LEDGER_ITEM_NINE_HEADER.id), HOLDING_BOARD_REGION);
    assert.equal(worldRegionForMission(LEDGER_TOLERANCE_HEADER.id), HOLDING_UNDERWORKS_REGION);
    assert.equal(worldRegionForMission(ATTENDING_CONCLAVE_HEADER.id), UPPER_TERRACES_REGION);
    assert.equal(worldRegionForMission(ATTENDING_ATTENDANCE_HEADER.id), ATTENDING_GALLERIES_REGION);
    assert.equal(worldRegionForMission(undefined), undefined);
    // Radicals plays on Sorrowgate's map and keeps its presentation: the
    // predicate is keyed on mission identity, never on the map (§7.1).
    const radicals = MISSION_HEADERS.find((h) => h.id === 'seeding-radicals');
    assert.equal(radicals?.mapId, 'sorrowgate');
    const placed = new Set([
      PROLOGUE_SORROWGATE_HEADER.id,
      ATTENDING_INTAKE_HEADER.id,
      LEDGER_EXPOSURE_HEADER.id,
      ATTENDING_TRENCH_AWAKENING_HEADER.id,
      LEDGER_SHIFT_CHANGE_HEADER.id,
      LEDGER_ASSET_RECOVERY_HEADER.id,
      ATTENDING_THE_DOME_HEADER.id,
      SEEDING_TEND_HEADER.id,
      SEEDING_CONVOCATION_HEADER.id,
      SEEDING_THIN_WATER_HEADER.id,
      ATTENDING_SHALLOW_HEADER.id,
      SEEDING_DEEP_FURROW_HEADER.id,
      SEEDING_IN_WRITING_HEADER.id,
      LEDGER_PROSPECT_HEADER.id,
      SEEDING_SECOND_SEEDING_HEADER.id,
      ATTENDING_FIRST_ARRIVAL_HEADER.id,
      CHORD_RIM_DEPOSITS_HEADER.id,
      CHORD_SECOND_CHORD_HEADER.id,
      LEDGER_ITEM_NINE_HEADER.id,
      LEDGER_TOLERANCE_HEADER.id,
      ATTENDING_CONCLAVE_HEADER.id,
      ATTENDING_ATTENDANCE_HEADER.id,
    ]);
    for (const header of MISSION_HEADERS) {
      if (placed.has(header.id)) continue;
      assert.equal(worldRegionForMission(header.id), undefined, header.id);
    }
    // A `?map=` boot passes no mission, and the map id is not one.
    assert.equal(worldRegionForMission('sorrowgate'), undefined);
    assert.equal(worldRegionForMission('banding-ground'), undefined);
    assert.equal(worldRegionForMission('first-trench-margin'), undefined);
    assert.equal(worldRegionForMission('shallow-band'), undefined);
    assert.equal(worldRegionForMission('ninefold-face-six'), undefined);
    assert.equal(worldRegionForMission('marr-plateau'), undefined);
    assert.equal(worldRegionForMission('kell-shoulder'), undefined);
    assert.equal(worldRegionForMission('anholt-furrow'), undefined);
    assert.equal(worldRegionForMission('mouth-rim'), undefined);
    assert.equal(worldRegionForMission('holding-board'), undefined);
    assert.equal(worldRegionForMission('upper-terraces'), undefined);
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
