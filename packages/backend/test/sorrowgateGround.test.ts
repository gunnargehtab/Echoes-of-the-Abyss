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
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Biome, SORROWGATE_GROUND } from '@echoes/shared';
import { SORROWGATE, terrainFor } from '../src/sim/maps/index.ts';

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
