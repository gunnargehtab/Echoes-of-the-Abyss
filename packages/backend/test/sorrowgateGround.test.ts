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
  Biome,
  DEPTH,
  SORROWGATE_GROUND,
  SORROWGATE_REGION,
  detailGround,
  detailRect,
  paintGround,
} from '@echoes/shared';
import { MAPS, MISSION_MAPS, SORROWGATE, terrainFor } from '../src/sim/maps/index.ts';

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

describe("the continuous world's detail ground (#1457) holds the server's baseline", () => {
  it("pastes Sorrowgate's 320 cells exactly as the server paints them", () => {
    const server = terrainFor(SORROWGATE).serialize();
    const detail = detailGround(SORROWGATE_REGION)!;
    const rect = detailRect(SORROWGATE_REGION);
    const west = (SORROWGATE_REGION.x - rect.x) / detail.cellM;
    const north = (SORROWGATE_REGION.y - rect.y) / detail.cellM;
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
        /(RIFT_GROUND|RIFT_PLACES|RIFT_REGIONS|detailGround|surroundFor)/
      );
    }
  });
});
