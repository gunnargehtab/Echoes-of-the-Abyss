/**
 * Sorrowgate's ground, moved to `@echoes/shared` for the continuous world
 * (#1456, docs/world-map.md §7), paints exactly what it painted before.
 *
 * The picture below is every one of the map's 320 cells as `terrainFor`
 * painted them on main before the move, one letter per biome, floor and
 * ceiling. It is a fixture, not a spec: docs/mission-sorrowgate.md §11 owns
 * the ground, and a deliberate change to it redraws this picture in the same
 * commit. What it catches is the accidental kind — a region lost or reordered
 * in the move, or a painter that reads the shared literal differently.
 *
 * Since #1457 it also holds the shared painter (`paintGround`) to
 * `terrainFor` on every map, the world's detail ground to the server's
 * baseline, and the simulation to never reading the atlas.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  BANDING_GROUND_GROUND,
  FACE_SIX_GROUND,
  FOURTH_FOOT_GROUND,
  Biome,
  DEPTH,
  KELL_SHOULDER_GROUND,
  MARR_PLATEAU_GROUND,
  SHALLOW_BAND_GROUND,
  SORROWGATE_GROUND,
  UPPER_WORKINGS_GROUND,
  WESTERN_MARGIN_GROUND,
  WORLD_REGIONS,
  detailGround,
  detailRect,
  paintGround,
} from '@echoes/shared';
import {
  BANDING_GROUND,
  FOURTH_FOOT,
  FIRST_TRENCH_MARGIN,
  KELL_SHOULDER,
  MAPS,
  MARR_PLATEAU,
  MISSION_MAPS,
  NINEFOLD_FACE_SIX,
  NINEFOLD_WORKINGS,
  SHALLOW_BAND,
  SORROWGATE,
  missionMapById,
  terrainFor,
} from '../src/sim/maps/index.ts';

const LEGEND: Record<string, { biome: Biome; floorM: number; ceilingM: number }> = {
  '.': { biome: Biome.CoralRuins, floorM: 1600, ceilingM: 0 }, // the Districts
  C: { biome: Biome.CoralRuins, floorM: 340, ceilingM: 0 }, // the Upper Concourse
  D: { biome: Biome.CoralRuins, floorM: 900, ceilingM: 0 }, // the Descent
  W: { biome: Biome.ThermalVein, floorM: 1600, ceilingM: 0 }, // the West Approach
  L: { biome: Biome.CoralRuins, floorM: 1500, ceilingM: 1300 }, // the Service Lock
  G: { biome: Biome.CoralRuins, floorM: 1500, ceilingM: 0 }, // the Gate
  T: { biome: Biome.AbyssalTrench, floorM: 2400, ceilingM: 0 }, // the Commit
};

// North at the top, 250 m a letter: 20 columns by 16 rows.
const PICTURE = [
  '......CCCCCCCC......',
  '......CCCCCCCC......',
  '......CCDDDDDC......',
  '........DDDDD.......',
  '........DDDD........',
  '...WWW..DDDD........',
  '..WWWW..DDD.........',
  '.WWWWW.LL...........',
  'WWWWWW.LL...........',
  '.WWWWW.LLGGG........',
  '.......GGGGGG.......',
  '.......GGGGGG.......',
  '......TTTTTTTT......',
  '......TTTTTTTT......',
  '......TTTTTTTT......',
  '......TTTTTTTT......',
];

describe("Sorrowgate's shared ground", () => {
  it('is the one source: the map spreads the shared literal, not a copy', () => {
    assert.equal(SORROWGATE.regions, SORROWGATE_GROUND.regions);
    assert.equal(SORROWGATE.widthM, SORROWGATE_GROUND.widthM);
    assert.equal(SORROWGATE.heightM, SORROWGATE_GROUND.heightM);
    assert.equal(SORROWGATE.cellM, SORROWGATE_GROUND.cellM);
    assert.equal(SORROWGATE.floorM, SORROWGATE_GROUND.floorM);
  });

  it('paints all 320 cells with the biome, floor and ceiling they had', () => {
    const terrain = terrainFor(SORROWGATE);
    assert.equal(terrain.cols, 20);
    assert.equal(terrain.rows, 16);
    assert.equal(PICTURE.length, terrain.rows);
    let checked = 0;
    for (let row = 0; row < terrain.rows; row++) {
      assert.equal(PICTURE[row]!.length, terrain.cols);
      for (let col = 0; col < terrain.cols; col++) {
        const x = (col + 0.5) * terrain.cellM;
        const y = (row + 0.5) * terrain.cellM;
        const want = LEGEND[PICTURE[row]![col]!]!;
        const at = `cell (${col}, ${row})`;
        assert.equal(terrain.biomeAt(x, y), want.biome, `${at} biome`);
        assert.equal(terrain.floorAt(x, y), want.floorM, `${at} floor`);
        assert.equal(terrain.ceilingAt(x, y), want.ceilingM, `${at} ceiling`);
        checked++;
      }
    }
    assert.equal(checked, 320);
  });
});

describe("the shared painter (#1457): the world renderer's ground is the server's", () => {
  // Every map either side plays, skirmish and mission: `paintGround` is what
  // the world draws Sorrowgate and its surround with, and a cell it painted
  // differently from the server would draw ground the game is not played on.
  for (const map of [...MAPS, ...MISSION_MAPS]) {
    it(`paints ${map.id} cell for cell as terrainFor does`, () => {
      const server = terrainFor(map).serialize();
      // A map that authors no base floor gets the ruleset's, as Terrain does.
      const shared = paintGround({ ...map, floorM: map.floorM ?? DEPTH.MAX_M });
      assert.equal(shared.cols, server.cols);
      assert.equal(shared.rows, server.rows);
      assert.equal(shared.cellM, server.cellM);
      assert.deepEqual(Array.from(shared.biomes), server.biomes, 'biomes');
      assert.deepEqual(Array.from(shared.floor), server.floor, 'floors');
      assert.deepEqual(Array.from(shared.ceiling), server.ceiling, 'ceilings');
    });
  }
});

describe("the Banding Ground's shared ground (#1598)", () => {
  // Its cells are held to the server's by the shared painter's test below and
  // pinned against the mission by `missionIntake.test.ts`; this holds the move.
  it('is the one source: the map spreads the shared literal, not a copy', () => {
    assert.equal(BANDING_GROUND.regions, BANDING_GROUND_GROUND.regions);
    assert.equal(BANDING_GROUND.widthM, BANDING_GROUND_GROUND.widthM);
    assert.equal(BANDING_GROUND.heightM, BANDING_GROUND_GROUND.heightM);
    assert.equal(BANDING_GROUND.cellM, BANDING_GROUND_GROUND.cellM);
    assert.equal(BANDING_GROUND.floorM, BANDING_GROUND_GROUND.floorM);
  });
});

describe("the Western Margin's shared ground (#1612)", () => {
  // Its cells are held to the server's by the shared painter's test below and
  // pinned against the mission by `missionExposure.test.ts`; this holds the move.
  it('is the one source: the map spreads the shared literal, not a copy', () => {
    assert.equal(FIRST_TRENCH_MARGIN.regions, WESTERN_MARGIN_GROUND.regions);
    assert.equal(FIRST_TRENCH_MARGIN.widthM, WESTERN_MARGIN_GROUND.widthM);
    assert.equal(FIRST_TRENCH_MARGIN.heightM, WESTERN_MARGIN_GROUND.heightM);
    assert.equal(FIRST_TRENCH_MARGIN.cellM, WESTERN_MARGIN_GROUND.cellM);
    assert.equal(FIRST_TRENCH_MARGIN.floorM, WESTERN_MARGIN_GROUND.floorM);
  });
});

describe("the Shallow Band's shared ground (#1615)", () => {
  // Its cells are held to the server's by the shared painter's test below and
  // pinned against the mission by `missionTrenchAwakening.test.ts`; this holds
  // the move.
  it('is the one source: the map spreads the shared literal, not a copy', () => {
    assert.equal(SHALLOW_BAND.regions, SHALLOW_BAND_GROUND.regions);
    assert.equal(SHALLOW_BAND.widthM, SHALLOW_BAND_GROUND.widthM);
    assert.equal(SHALLOW_BAND.heightM, SHALLOW_BAND_GROUND.heightM);
    assert.equal(SHALLOW_BAND.cellM, SHALLOW_BAND_GROUND.cellM);
    assert.equal(SHALLOW_BAND.floorM, SHALLOW_BAND_GROUND.floorM);
  });
});

describe("the two Ninefold maps' shared ground (#1626)", () => {
  // Their cells are held to the server's by the shared painter's test below
  // and pinned against the missions by `missionAssetRecovery.test.ts` and
  // `missionShiftChange.test.ts`; this holds the move.
  for (const [map, ground] of [
    [NINEFOLD_FACE_SIX, FACE_SIX_GROUND],
    [NINEFOLD_WORKINGS, UPPER_WORKINGS_GROUND],
  ] as const) {
    it(`${map.id} spreads the shared literal, not a copy`, () => {
      assert.equal(map.regions, ground.regions);
      assert.equal(map.widthM, ground.widthM);
      assert.equal(map.heightM, ground.heightM);
      assert.equal(map.cellM, ground.cellM);
      assert.equal(map.floorM, ground.floorM);
    });
  }
});

describe("the Fourth's Foot's shared ground (#1628)", () => {
  // Its cells are held to the server's by the shared painter's test below and
  // pinned against the mission by `missionTheDome.test.ts`; this holds the move.
  it('is the one source: the map spreads the shared literal, not a copy', () => {
    assert.equal(FOURTH_FOOT.regions, FOURTH_FOOT_GROUND.regions);
    assert.equal(FOURTH_FOOT.widthM, FOURTH_FOOT_GROUND.widthM);
    assert.equal(FOURTH_FOOT.heightM, FOURTH_FOOT_GROUND.heightM);
    assert.equal(FOURTH_FOOT.cellM, FOURTH_FOOT_GROUND.cellM);
    assert.equal(FOURTH_FOOT.floorM, FOURTH_FOOT_GROUND.floorM);
  });
});

describe("Marr Plateau's shared ground (#1630)", () => {
  // Its cells are held to the server's by the shared painter's test below and
  // pinned against both missions by `missionTend.test.ts`; this holds the move.
  it('is the one source: the map spreads the shared literal, not a copy', () => {
    assert.equal(MARR_PLATEAU.regions, MARR_PLATEAU_GROUND.regions);
    assert.equal(MARR_PLATEAU.widthM, MARR_PLATEAU_GROUND.widthM);
    assert.equal(MARR_PLATEAU.heightM, MARR_PLATEAU_GROUND.heightM);
    assert.equal(MARR_PLATEAU.cellM, MARR_PLATEAU_GROUND.cellM);
    assert.equal(MARR_PLATEAU.floorM, MARR_PLATEAU_GROUND.floorM);
  });
});

describe("the Kell Shoulder's shared ground (#1633)", () => {
  // Its cells are held to the server's by the shared painter's test below and
  // pinned against both missions by `missionThinWater.test.ts` and
  // `missionShallow.test.ts`; this holds the move.
  it('is the one source: the map spreads the shared literal, not a copy', () => {
    assert.equal(KELL_SHOULDER.regions, KELL_SHOULDER_GROUND.regions);
    assert.equal(KELL_SHOULDER.widthM, KELL_SHOULDER_GROUND.widthM);
    assert.equal(KELL_SHOULDER.heightM, KELL_SHOULDER_GROUND.heightM);
    assert.equal(KELL_SHOULDER.cellM, KELL_SHOULDER_GROUND.cellM);
    assert.equal(KELL_SHOULDER.floorM, KELL_SHOULDER_GROUND.floorM);
  });
});

describe("the continuous world's detail ground (#1457) holds the server's baseline", () => {
  for (const region of WORLD_REGIONS) {
    it(`pastes ${region.id}'s cells exactly as the server paints them`, () => {
      const map = missionMapById(region.mapId);
      assert.ok(map, `a mission map ${region.mapId}`);
      const server = terrainFor(map).serialize();
      const detail = detailGround(region)!;
      const rect = detailRect(region);
      const west = (region.x - rect.x) / detail.cellM;
      const north = (region.y - rect.y) / detail.cellM;
      for (let row = 0; row < server.rows; row++) {
        for (let col = 0; col < server.cols; col++) {
          const from = row * server.cols + col;
          const to = (row + north) * detail.cols + col + west;
          const at = `cell (${col}, ${row})`;
          assert.equal(detail.biomes[to], server.biomes[from], `${at} biome`);
          assert.equal(detail.floor[to], server.floor[from], `${at} floor`);
          assert.equal(detail.ceiling[to], server.ceiling[from], `${at} ceiling`);
        }
      }
    });
  }

  it('is read by nothing in the simulation: the atlas is public ground (§7.1)', () => {
    // A server that read the atlas would play on ground no mission authored.
    const walk = (dir: URL): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? walk(new URL(`${entry.name}/`, dir))
          : entry.name.endsWith('.ts')
            ? [readFileSync(new URL(entry.name, dir), 'utf8')]
            : []
      );
    const sources = walk(new URL('../src/', import.meta.url));
    assert.ok(sources.length > 50, 'walked the backend source');
    for (const source of sources) {
      assert.doesNotMatch(
        source,
        /\b(RIFT_GROUND|RIFT_PLACES|RIFT_REGIONS|detailGround|surroundFor)\b/
      );
    }
  });
});
