/**
 * The Rift's public geography — docs/world-map.md §7.2–§7.3 (#1457).
 *
 * The atlas is authored ground, so these hold it to what the bible states
 * rather than to a picture of itself: every named place where §1–§4 put it,
 * §7.2's anchor table and the data agreeing row for row, the overview drawn
 * by maps.md's rules, and Sorrowgate's detail ground meeting both the
 * mission it surrounds and the overview it sits in. The backend suite holds
 * the detail's middle to the server's own terrain (`sorrowgateGround.test.ts`).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  Biome,
  DEPTH,
  RIFT_ATLAS,
  RIFT_GROUND,
  RIFT_PLACES,
  RIFT_REGIONS,
  SORROWGATE_GROUND,
  SORROWGATE_REGION,
  WORLD,
  detailGround,
  detailRect,
  paintGround,
  regionContains,
  shapeContains,
  surroundFor,
  type GroundCells,
  type GroundRegion,
  type PlanRect,
  type RiftPlace,
} from '../dist/index.js';

const overview = paintGround(RIFT_GROUND);

function cellAt(cells: GroundCells, xM: number, yM: number, origin = { x: 0, y: 0 }) {
  const col = Math.floor((xM - origin.x) / cells.cellM);
  const row = Math.floor((yM - origin.y) / cells.cellM);
  const i = row * cells.cols + col;
  return { biome: cells.biomes[i]!, floorM: cells.floor[i]!, ceilingM: cells.ceiling[i]! };
}

const ground = (place: RiftPlace) => cellAt(overview, place.x, place.y);

function place(id: string): RiftPlace {
  const found = RIFT_PLACES.find((p) => p.id === id);
  assert.ok(found, `no place ${id}`);
  return found;
}

const km = (a: RiftPlace, b: RiftPlace) => Math.hypot(a.x - b.x, a.y - b.y) / 1_000;

/** An overview region by its note, read off the literal. */
function region(note: string): GroundRegion {
  const found = RIFT_GROUND.regions.filter((r) => r.note === note);
  assert.equal(found.length, 1, `one region noted ${note}`);
  return found[0]!;
}

const corners = (r: GroundRegion): number[] =>
  r.shape === 'polygon' ? r.points.flat() : [r.x, r.y, r.widthM, r.heightM];

describe('the overview (§7.3)', () => {
  it('is the atlas at 1,000 m cells, 3,600 of them', () => {
    assert.equal(RIFT_GROUND.widthM, RIFT_ATLAS.widthM);
    assert.equal(RIFT_GROUND.heightM, RIFT_ATLAS.heightM);
    assert.equal(RIFT_GROUND.cellM, WORLD.ATLAS_CELL_M);
    assert.equal(overview.cols * overview.rows, 3_600);
  });

  it("is authored by maps.md's rules: whole cells, inside the frame, open water", () => {
    for (const region of RIFT_GROUND.regions) {
      assert.ok(
        corners(region).every((v) => v % 1_000 === 0),
        `${region.note}: a whole cell`
      );
      const xs =
        region.shape === 'polygon'
          ? region.points.map(([x]) => x)
          : [region.x, region.x + region.widthM];
      const ys =
        region.shape === 'polygon'
          ? region.points.map(([, y]) => y)
          : [region.y, region.y + region.heightM];
      assert.ok(Math.min(...xs) >= 0 && Math.max(...xs) <= RIFT_ATLAS.widthM, `${region.note}: x`);
      assert.ok(Math.min(...ys) >= 0 && Math.max(...ys) <= RIFT_ATLAS.heightM, `${region.note}: y`);
      // Roofed water is a mission's detail; the overview draws relief only.
      assert.equal(region.ceilingM, undefined, `${region.note}: no roof at overview detail`);
      assert.ok(region.note, 'every region says why it is there');
    }
  });

  it('runs from the Shelf under the Lid to the Mouth, and the ruleset does not follow', () => {
    const floors = Array.from(overview.floor);
    assert.ok(Math.min(...floors) >= 200, 'nothing in the Lid (docs/world-map.md §2)');
    assert.equal(Math.max(...floors), 4_410, "the Mouth's floor is the deepest ground");
    assert.equal(ground(place('the-mouth')).floorM, 4_410);
    // A place's depth is not a playing depth (§7.2): the order limit stays put.
    assert.equal(DEPTH.MAX_M, 3_000);
  });

  it('is shallow in the north and deep in the south (§1)', () => {
    const mean = (y0: number, y1: number) => {
      let sum = 0;
      for (let row = y0; row < y1; row++) {
        for (let col = 0; col < overview.cols; col++)
          sum += overview.floor[row * overview.cols + col]!;
      }
      return sum / ((y1 - y0) * overview.cols);
    };
    const north = mean(0, 22);
    const middle = mean(22, 50);
    const south = mean(50, 90);
    assert.ok(north < 600, `the north shoulder is Shelf: ${north}`);
    assert.ok(north < middle && middle < south, `${north} < ${middle} < ${south}`);
  });
});

describe('the named places (§3, placed by §7.2)', () => {
  it('stand inside their region’s rectangle, each id once', () => {
    assert.equal(new Set(RIFT_PLACES.map((p) => p.id)).size, RIFT_PLACES.length);
    for (const p of RIFT_PLACES) {
      assert.ok(regionContains(RIFT_REGIONS[p.region], p), `${p.name} in ${p.region}`);
    }
  });

  it("put Sorrowgate's court where §7.2 derives it, on the pilot's own ground", () => {
    const court = place('sorrowgate');
    assert.deepEqual([court.x, court.y, court.depthM], [20_050, 42_650, 1_500]);
    assert.equal(court.x - SORROWGATE_REGION.x, 2_550);
    assert.equal(court.y - SORROWGATE_REGION.y, 2_150);
  });

  it('keep the plateaus in the Shelf, in kelp, with the bare shoulder between Marr and Kell', () => {
    for (const id of ['marr', 'teel', 'anholt', 'kell-plateau']) {
      const at = ground(place(id));
      assert.equal(at.biome, Biome.KelpForest, id);
      assert.ok(at.floorM <= 400, `${id} in the Shelf band: ${at.floorM}`);
    }
    // §3: a four-kilometre crossing between the gardens at 340 m, Open Water.
    const shoulder = place('kell-shoulder');
    assert.deepEqual(ground(shoulder), { biome: Biome.OpenWater, floorM: 340, ceilingM: 0 });
    const marr = place('marr');
    const kell = place('kell-plateau');
    const t =
      ((shoulder.x - marr.x) * (kell.x - marr.x) + (shoulder.y - marr.y) * (kell.y - marr.y)) /
      ((kell.x - marr.x) ** 2 + (kell.y - marr.y) ** 2);
    assert.ok(t > 0.2 && t < 0.8, 'between them, not beyond either');
  });

  it('make the Furrow the one Abyssal water under the plateaus (§3)', () => {
    const furrow = place('the-furrow');
    const plateaus = RIFT_REGIONS.plateaus;
    for (let row = 0; row < plateaus.heightM / 1_000; row++) {
      for (let col = plateaus.x / 1_000; col < (plateaus.x + plateaus.widthM) / 1_000; col++) {
        const floor = overview.floor[row * overview.cols + col]!;
        if (floor < 1_800) continue;
        const off = Math.hypot((col + 0.5) * 1_000 - furrow.x, (row + 0.5) * 1_000 - furrow.y);
        assert.ok(off <= 3_000, `Abyssal cell (${col}, ${row}) is not the Furrow's`);
      }
    }
    assert.ok(ground(furrow).floorM >= 1_800);
  });

  it("put the Furrow under Anholt's terrace (§3; mission-deep-furrow.md §1)", () => {
    // The ground the Furrow's Foot is entered from, a cell north of it, is the
    // last region painted there, and it is Anholt's.
    const foot = region('The Furrow’s Foot — where the plateau’s lane comes down');
    assert.ok(foot.shape === undefined);
    const above = { x: foot.x + foot.widthM / 2, y: foot.y - 500 };
    const owner = RIFT_GROUND.regions.filter((r) => shapeContains(r, above.x, above.y)).pop()!;
    assert.match(owner.note!, /^Anholt’s /, `the Foot is entered from ${owner.note}`);
    assert.equal(owner.biome, Biome.KelpForest);
  });

  it('give the plateaus and Sector Kell one fence, and Halvard its kilometre (§3, §4)', () => {
    assert.ok(km(place('sector-kell'), place('kell-plateau')) <= 4, 'adjacent');
    const halvard = place('halvard');
    for (const p of RIFT_PLACES) {
      if (p !== halvard) assert.ok(km(p, halvard) > 1, `${p.name} built within a kilometre`);
    }
  });

  it('string the west wall with vents, and keep Fivewell shallower than the Vein', () => {
    for (const id of ['holding-one', 'ninefold-vein', 'fivewell']) {
      assert.equal(ground(place(id)).biome, Biome.ThermalVein, id);
    }
    assert.ok(ground(place('fivewell')).floorM < ground(place('ninefold-vein')).floorM);
  });

  it('put the drowned city at the Shelf break: its door above the layer, its basin Abyssal', () => {
    assert.equal(ground(place('sorrowgate')).biome, Biome.CoralRuins);
    assert.ok(ground(place('upper-concourse')).floorM < 1_200, 'the Concourse above the layer');
    assert.ok(ground(place('the-commit')).floorM >= 1_800, 'the Commit in the Abyssal band');
  });

  it('keep crystal country below the layer, the Ninth 450 m under the Third (§3)', () => {
    let crystal = 0;
    for (let i = 0; i < overview.biomes.length; i++) {
      if (overview.biomes[i] !== Biome.ResonanceField) continue;
      crystal++;
      assert.ok(overview.floor[i]! >= 1_200, 'below the thermocline');
    }
    assert.ok(crystal > 300, 'the Fields are a region, not a scatter');
    assert.equal(place('ninth-chapter-house').depthM! - place('third-chapter-house').depthM!, 450);
    assert.equal(ground(place('the-seam')).biome, Biome.AbyssalTrench, 'the Seam carries, PF 1.60');
    const mouth = place('the-mouth');
    const houses = ['first-chapter-house', 'third-chapter-house', 'ninth-chapter-house'];
    const nearest = houses.sort((a, b) => km(place(a), mouth) - km(place(b), mouth))[0];
    assert.equal(nearest, 'first-chapter-house', 'the First stands nearest the Mouth');
  });

  it('run the Ninth head to Mouth: the sill 3 km on, the Lip 11 km from the galleries (§3, §4)', () => {
    const galleries = place('attending-galleries');
    const sill = place('the-sill');
    const lip = place('the-lip');
    assert.ok(Math.abs(km(galleries, sill) - 3) <= 0.5, `sill ${km(galleries, sill)} km`);
    assert.ok(Math.abs(km(galleries, lip) - 11) <= 0.5, `Lip ${km(galleries, lip)} km`);
    assert.equal(ground(sill).floorM, 4_100);
    assert.equal(ground(lip).floorM, 3_100);
    // The axis aims at the Mouth: carried on past the Lip it is over the floor.
    const on = { x: lip.x + (lip.x - galleries.x) * 0.4, y: lip.y + (lip.y - galleries.y) * 0.4 };
    assert.equal(cellAt(overview, on.x, on.y).floorM, 4_410);
    assert.ok(lip.x > place('the-mouth').x, 'the column arrives on the eastern lip');
  });

  it('deepen the named trenches in the order of their count (§3)', () => {
    // §3 counts a trench by its floor: the First's 1,800 m, the Fourth's by its
    // Foot, the Ninth below 3,400 m; the Second is the First's sill's way on
    // (docs/mission-trench-awakening.md §11).
    const floors = [
      region('The First Trench — the shallow band, under its worked rim'),
      region('The Second Trench'),
      region('The Foot — the Fourth’s last bench, where the Cantorate listens'),
      region('The Ninth’s axis, below the galleries'),
    ].map((r) => r.floorM!);
    assert.deepEqual(
      floors,
      [...floors].sort((a, b) => a - b)
    );
    assert.equal(floors[0], 1_800);
    assert.ok(floors[3]! >= 3_400);
  });

  it('aim the First Chord down the trench axis into the Mouth (§3)', () => {
    const first = place('first-chapter-house');
    const sufficiency = place('sufficiency');
    const mouth = place('the-mouth');
    const bearing = (a: RiftPlace, b: RiftPlace) => Math.atan2(b.x - a.x, b.y - a.y);
    const turn = Math.abs(bearing(first, sufficiency) - bearing(sufficiency, mouth));
    assert.ok(turn < (10 * Math.PI) / 180, `one alignment, bent ${(turn * 180) / Math.PI}°`);
  });

  it('step the Rim down north to south, eighty kilometres from Marr (§3)', () => {
    const bands = ['the-staging', 'the-slopes', 'the-terraces', 'the-lip'].map(place);
    for (let i = 1; i < bands.length; i++) {
      assert.ok(bands[i]!.y > bands[i - 1]!.y, `${bands[i]!.name} south of the last`);
      assert.ok(
        (bands[i]!.toDepthM ?? bands[i]!.depthM!) >
          (bands[i - 1]!.toDepthM ?? bands[i - 1]!.depthM!)
      );
    }
    // docs/mission-second-seeding.md: the bed is heard from eighty kilometres north.
    assert.ok(Math.abs(km(place('marr'), place('the-lip')) - 80) <= 5);
    // §3: an eleven-kilometre depression.
    let widest = 0;
    for (let row = 79; row < 90; row++) {
      let run = 0;
      for (let col = 0; col < overview.cols; col++) {
        run = overview.floor[row * overview.cols + col] === 4_410 ? run + 1 : 0;
        widest = Math.max(widest, run);
      }
    }
    assert.equal(widest, 11);
  });
});

describe('the two maps anchored at their centre (§7.9, #1565)', () => {
  // A map stood on its anchor, by the size its mission's §11 gives it: the
  // shared package cannot read the backend's literals, so these restate them.
  const stood = (id: string, widthM: number, heightM: number): PlanRect => {
    const p = place(id);
    return { x: p.x - widthM / 2, y: p.y - heightM / 2, widthM, heightM };
  };
  const inside = (outer: PlanRect, inner: PlanRect) =>
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.widthM <= outer.x + outer.widthM &&
    inner.y + inner.heightM <= outer.y + outer.heightM;
  const fits = (map: PlanRect, region: RiftPlace['region']) => {
    assert.ok(inside(RIFT_REGIONS[region], map), `inside ${region}`);
    assert.ok(inside(RIFT_ATLAS, detailRect(map)), 'its surround inside the atlas');
  };

  it('stands the Western Margin on the top step, edge to edge north of the Shallow Band', () => {
    // mission-exposure.md §11: 5,000 × 3,000 m, its worked ground the last 750 m.
    const margin = stood('western-margin', 5_000, 3_000);
    fits(margin, 'trench-country');
    // mission-trench-awakening.md §11: 5,000 × 4,000 m, its rim the first 750 m.
    const band = stood('first-trench', 5_000, 4_000);
    assert.equal(margin.x, band.x);
    assert.equal(margin.y + margin.heightM, band.y, 'the worked ground meets the rim');
    // It crosses the line the trench country's north bound used to draw.
    assert.ok(margin.y < 50_000 && margin.y + margin.heightM > 50_000);
  });

  it("stands the Outer Formations' Seam row on the Seam, the Third north of its Approach", () => {
    // mission-aptitude.md §11: 5,000 × 4,000 m; the Seam is its last 500 m,
    // the Approach its north-east 1,250 × 1,000 m.
    const map = stood('outer-formations', 5_000, 4_000);
    fits(map, 'resonance-fields');
    const seam = place('the-seam');
    assert.equal(map.y + map.heightM, seam.y);
    assert.ok(seam.x >= map.x && seam.x < map.x + map.widthM);
    const approach = { x: map.x + 3_750 + 625, y: map.y + 500 };
    const third = place('third-chapter-house');
    assert.ok(Math.abs(km(third, { ...third, ...approach }) - 1.5) < 0.01);
    assert.ok(third.y < approach.y);
    // Half a kilometre further east and the surround leaves the atlas (§7.9).
    assert.ok(!inside(RIFT_ATLAS, detailRect({ ...map, x: map.x + 500 })));
  });
});

describe("§7.2's anchor table", () => {
  const doc = readFileSync(new URL('../../../docs/world-map.md', import.meta.url), 'utf8');
  const table = doc.slice(
    doc.indexOf('**Anchors.**'),
    doc.indexOf('**Regions, as coarse allocations.**')
  );
  const rows = table
    .split('\n')
    .filter(
      (line) => line.startsWith('| ') && !line.startsWith('| Anchor') && !line.startsWith('| ---')
    )
    .map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim())
    );

  const position = (row: string[]) =>
    row[1]!
      .replace(/[()]/g, '')
      .split(', ')
      .map((v) => Number(v.replace(/,/g, '')));

  it("pins Sorrowgate's map origin where the region stands", () => {
    const origin = rows.filter(([name]) => name!.startsWith("Sorrowgate's map origin"));
    assert.equal(origin.length, 1);
    assert.deepEqual(position(origin[0]!), [SORROWGATE_REGION.x, SORROWGATE_REGION.y]);
  });

  it('is the data, row for row: name, position and depth', () => {
    const matched = new Set<string[]>();
    for (const p of RIFT_PLACES) {
      const row = rows.filter(([name]) => name === p.name || name!.startsWith(`${p.name} —`));
      assert.equal(row.length, 1, `${p.name} has exactly one row`);
      matched.add(row[0]!);
      assert.deepEqual(position(row[0]!), [p.x, p.y], `${p.name}'s position`);
      const depths = row[0]![2] === '—' ? [] : row[0]![2]!.replace(/ m$/, '').split('–');
      const want = [p.depthM, p.toDepthM].filter((d) => d !== undefined);
      assert.deepEqual(
        depths.map((d) => Number(d.replace(/,/g, ''))),
        want,
        `${p.name}'s depth`
      );
    }
    // Every row but the origin's is a place, and no place has two.
    assert.equal(matched.size, RIFT_PLACES.length);
    assert.equal(rows.length, RIFT_PLACES.length + 1, "the places and Sorrowgate's map origin");
  });
});

describe("Sorrowgate's detail ground (§7.3)", () => {
  const detail = detailGround(SORROWGATE_REGION)!;
  const rect = detailRect(SORROWGATE_REGION);
  const mission = paintGround(SORROWGATE_GROUND);
  const west = (SORROWGATE_REGION.x - rect.x) / 250;
  const north = (SORROWGATE_REGION.y - rect.y) / 250;
  const at = (col: number, row: number) => {
    const i = row * detail.cols + col;
    return { biome: detail.biomes[i], floorM: detail.floor[i], ceilingM: detail.ceiling[i] };
  };

  it('is the detail rectangle at 250 m: 40 × 36 cells', () => {
    assert.equal(detail.cellM, 250);
    assert.equal(detail.cols, rect.widthM / 250);
    assert.equal(detail.rows, rect.heightM / 250);
    assert.equal(detail.cols * detail.rows, 1_440);
  });

  it("holds the mission's 320 cells unchanged at its middle", () => {
    for (let row = 0; row < mission.rows; row++) {
      for (let col = 0; col < mission.cols; col++) {
        const i = row * mission.cols + col;
        assert.deepEqual(
          at(col + west, row + north),
          { biome: mission.biomes[i], floorM: mission.floor[i], ceilingM: mission.ceiling[i] },
          `mission cell (${col}, ${row})`
        );
      }
    }
  });

  it('carries each edge on: the ring outside the map takes the edge cell it touches', () => {
    let ring = 0;
    for (let row = north - 1; row <= north + mission.rows; row++) {
      for (let col = west - 1; col <= west + mission.cols; col++) {
        const inside =
          row >= north && row < north + mission.rows && col >= west && col < west + mission.cols;
        if (inside) continue;
        const mc = Math.min(mission.cols - 1, Math.max(0, col - west));
        const mr = Math.min(mission.rows - 1, Math.max(0, row - north));
        const i = mr * mission.cols + mc;
        assert.deepEqual(
          at(col, row),
          { biome: mission.biomes[i], floorM: mission.floor[i], ceilingM: mission.ceiling[i] },
          `ring cell (${col}, ${row}) against edge cell (${mc}, ${mr})`
        );
        ring++;
      }
    }
    assert.equal(ring, 2 * (mission.cols + 2) + 2 * mission.rows);
  });

  it("meets the overview at the seam: its last 500 m are the overview's cells", () => {
    let seam = 0;
    for (let row = 0; row < detail.rows; row++) {
      for (let col = 0; col < detail.cols; col++) {
        if (col >= 2 && col < detail.cols - 2 && row >= 2 && row < detail.rows - 2) continue;
        const want = cellAt(overview, rect.x + (col + 0.5) * 250, rect.y + (row + 0.5) * 250);
        assert.deepEqual(at(col, row), want, `seam cell (${col}, ${row})`);
        seam++;
      }
    }
    assert.equal(seam, 1_440 - 36 * 32);
  });

  it('is authored like a map, inside the detail and short of its last 500 m', () => {
    const surround = surroundFor(SORROWGATE_REGION)!;
    assert.ok(surround.length > 0);
    for (const region of surround) {
      assert.ok(
        corners(region).every((v) => v % 250 === 0),
        `${region.note}: whole cells`
      );
      const xs =
        region.shape === 'polygon'
          ? region.points.map(([x]) => x)
          : [region.x, region.x + region.widthM];
      const ys =
        region.shape === 'polygon'
          ? region.points.map(([, y]) => y)
          : [region.y, region.y + region.heightM];
      assert.ok(Math.min(...xs) >= rect.x + 500 && Math.max(...xs) <= rect.x + rect.widthM - 500);
      assert.ok(Math.min(...ys) >= rect.y + 500 && Math.max(...ys) <= rect.y + rect.heightM - 500);
    }
  });

  it('is a fresh baseline each time, so a session pastes over its own copy', () => {
    const a = detailGround(SORROWGATE_REGION)!;
    a.floor.fill(0);
    assert.deepEqual(Array.from(detailGround(SORROWGATE_REGION)!.floor), Array.from(detail.floor));
    assert.equal(detailGround({ ...SORROWGATE_REGION, id: 'nowhere' }), undefined);
  });
});
