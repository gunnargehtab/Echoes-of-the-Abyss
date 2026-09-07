/**
 * The acoustic veil (#472, docs/ui-ux.md §4.5).
 *
 * What this file holds is what the doc section *promises*, never what the
 * shading code says — a test that mirrors the implementation is a change
 * detector, and how the veil looks is a screenshot's job under
 * docs/graphics-standards.md gate 7.
 *
 * Three of those promises are load-bearing enough to be worth naming:
 *
 * - the field is the propagation model's own arithmetic and not an
 *   approximation of it, so it is checked against `minAudibleSigAt` in shared
 *   rather than against numbers copied out of a run;
 * - the biome is the lever, which is the whole argument for a field over a
 *   listening radius — the same metres of water read differently through a
 *   Thermal Vein and through an Abyssal Trench;
 * - nothing the player earned is dimmed by it, which is the rule that keeps a
 *   presentation-only fog of war from quietly becoming a second one.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ACOUSTIC_VEIL,
  Biome,
  PROPAGATION_FACTOR,
  minAudibleSigAt,
  statsFor,
  UnitKind,
} from '@echoes/shared';
import type { TerrainPayload } from '../src/net/GameClient.ts';
import { VeilField, veilShade, VEIL_FLOOR_RGB } from '../src/game/acousticVeil.ts';

const CELL_M = 250;
const COLS = 40;
const ROWS = 40;

/** Open water everywhere, so a test can put one biome in and read the effect. */
function flatTerrain(biome: Biome = Biome.OpenWater): TerrainPayload {
  return {
    cols: COLS,
    rows: ROWS,
    cellM: CELL_M,
    biomes: new Array<number>(COLS * ROWS).fill(biome),
    floor: new Array<number>(COLS * ROWS).fill(1500),
    ceiling: new Array<number>(COLS * ROWS).fill(0),
  };
}

/** The centre of the cell holding a point — where the field is defined. */
function cellCentre(xM: number): number {
  return (Math.floor(xM / CELL_M) + 0.5) * CELL_M;
}

describe('the veil field', () => {
  it('draws the water whole where a hull running silent could not slip past', () => {
    const field = new VeilField();
    field.build(flatTerrain(), [{ xM: 2000, yM: 2000, hyd: 50 }]);

    assert.equal(field.at(2000, 2000), 1, 'a listener stands in water it holds completely');

    // The anchor is a fact about the model, not about this listener: find the
    // range where the quietest thing in the game is still exactly audible and
    // check the field is still clear inside it.
    let clearRangeM = 0;
    while (minAudibleSigAt(clearRangeM + 10, 1, 50) <= ACOUSTIC_VEIL.CLEAR_SIG) clearRangeM += 10;
    assert.ok(clearRangeM > 500, 'a baseline ear reaches further than a hull length');
    assert.equal(field.at(2000 + clearRangeM * 0.8, 2000), 1);
  });

  it('floors where nothing in the game is loud enough to reach', () => {
    const field = new VeilField();
    field.build(flatTerrain(), [{ xM: 250, yM: 250, hyd: 50 }]);

    let deafRangeM = 1000;
    while (minAudibleSigAt(deafRangeM, 1, 50) < ACOUSTIC_VEIL.DEAF_SIG) deafRangeM += 50;
    assert.ok(deafRangeM * 1.2 < COLS * CELL_M, 'the fixture map is big enough to go deaf on');
    // A cell centre, and clear of the anchor: the field is defined per cell
    // and interpolated between them, so a sample straddling the boundary
    // legitimately carries a little of the brighter neighbour.
    assert.equal(field.at(cellCentre(250 + deafRangeM * 1.2), cellCentre(250)), 0);
  });

  it('agrees with the shared propagation math it is a rearrangement of', () => {
    // The field takes its minimum in a monotone transform of the answer so
    // the inner loop costs no `pow` and no `sqrt`. That optimisation is the
    // one thing here that could silently drift from the Echo Layer, so it is
    // checked against the reference function cell by cell.
    const terrain = flatTerrain();
    terrain.biomes[0] = Biome.ThermalVein;
    terrain.biomes[COLS * 5 + 7] = Biome.AbyssalTrench;
    const listener = { xM: 1300, yM: 900, hyd: 65 };
    const field = new VeilField();
    field.build(terrain, [listener]);

    const span = ACOUSTIC_VEIL.DEAF_SIG - ACOUSTIC_VEIL.CLEAR_SIG;
    for (const [col, row] of [
      [0, 0],
      [7, 5],
      [5, 3],
      [20, 20],
      [39, 39],
    ] as const) {
      const x = (col + 0.5) * CELL_M;
      const y = (row + 0.5) * CELL_M;
      const pf = PROPAGATION_FACTOR[terrain.biomes[row * COLS + col] as Biome];
      const sig = minAudibleSigAt(Math.hypot(x - listener.xM, y - listener.yM), pf, listener.hyd);
      const t = Math.min(1, Math.max(0, (sig - ACOUSTIC_VEIL.CLEAR_SIG) / span));
      const expected = 1 - t * t * (3 - 2 * t);
      assert.ok(
        Math.abs(field.at(x, y) - expected) < 1e-6,
        `cell ${col},${row}: ${field.at(x, y)} vs ${expected}`
      );
    }
  });

  it('makes the biome the lever, which a listening radius could not', () => {
    // docs/systems-echo.md §3: the Thermal Vein masks at PF 0.45 and the
    // Abyssal Trench carries at 1.6. A circle drawn at a reference SIG would
    // be the same circle in both, which is the lie this field exists to
    // avoid — and the thing the player is meant to be able to see.
    const listener = { xM: 500, yM: 500, hyd: 50 };
    const probeX = 3000;
    const probeY = 500;

    const clarityIn = (biome: Biome): number => {
      const terrain = flatTerrain();
      const col = Math.floor(probeX / CELL_M);
      const row = Math.floor(probeY / CELL_M);
      terrain.biomes[row * COLS + col] = biome;
      const field = new VeilField();
      field.build(terrain, [listener]);
      return field.at(cellCentre(probeX), cellCentre(probeY));
    };

    const vein = clarityIn(Biome.ThermalVein);
    const open = clarityIn(Biome.OpenWater);
    const trench = clarityIn(Biome.AbyssalTrench);
    assert.ok(vein < open, 'water that masks is water you hold less of');
    assert.ok(trench > open, 'water that carries is water you hold more of');
  });

  it('never darkens water by adding an ear to the force', () => {
    const terrain = flatTerrain();
    const alone = new VeilField();
    alone.build(terrain, [{ xM: 500, yM: 500, hyd: 50 }]);
    const pair = new VeilField();
    pair.build(terrain, [
      { xM: 500, yM: 500, hyd: 50 },
      { xM: 6000, yM: 6000, hyd: 40 },
    ]);

    for (let x = 125; x < COLS * CELL_M; x += CELL_M * 4) {
      for (let y = 125; y < ROWS * CELL_M; y += CELL_M * 4) {
        assert.ok(pair.at(x, y) >= alone.at(x, y) - 1e-6, `best ear wins at ${x},${y}`);
      }
    }
  });

  it('fades away from the only listener and never back towards it', () => {
    const field = new VeilField();
    field.build(flatTerrain(), [{ xM: 125, yM: 125, hyd: 50 }]);
    let previous = Infinity;
    for (let x = 125; x < COLS * CELL_M; x += CELL_M) {
      const clarity = field.at(x, 125);
      assert.ok(clarity <= previous + 1e-6, `clarity climbs again at ${x} m`);
      previous = clarity;
    }
  });

  it('reads a force of nobody as a chart, not as a dark map', () => {
    // A player who has just lost their last hull has been told so already.
    // Closing the veil over the whole map at that moment would read as a
    // broken renderer rather than as dread (CLAUDE.md).
    const field = new VeilField();
    field.build(flatTerrain(), []);
    assert.equal(field.at(0, 0), 1);
    assert.equal(field.at(4000, 4000), 1);
  });

  it('answers before a terrain arrives rather than throwing at one', () => {
    const field = new VeilField();
    assert.equal(field.at(0, 0), 1);
    field.build(flatTerrain(), [{ xM: 500, yM: 500, hyd: 50 }]);
    field.clear();
    assert.equal(field.at(500, 500), 1);
  });

  it('takes a roster hull at its own rating', () => {
    // The listeners are read off the shipped stats rather than a number the
    // veil keeps of its own, so a hull with sharper ears holds more water.
    const terrain = flatTerrain();
    const sharp = statsFor(UnitKind.LightScout).hyd;
    const dull = statsFor(UnitKind.Harvester).hyd;
    assert.ok(sharp > dull, 'the fixture assumes the scout hears better than the harvester');

    const at = (hyd: number): number => {
      const field = new VeilField();
      field.build(terrain, [{ xM: 500, yM: 500, hyd }]);
      return field.at(cellCentre(3000), cellCentre(500));
    };
    assert.ok(at(sharp) > at(dull));
  });
});

/** The shade is a product of ratios, so it lands a float's width off exact. */
function assertShade(
  actual: { r: number; g: number; b: number },
  expected: { r: number; g: number; b: number }
): void {
  for (const channel of ['r', 'g', 'b'] as const) {
    assert.ok(
      Math.abs(actual[channel] - expected[channel]) < 1e-9,
      `${channel}: ${actual[channel]} vs ${expected[channel]}`
    );
  }
}

describe('the veil shade', () => {
  it('leaves the chart alone where the water is held', () => {
    assertShade(veilShade(1, 1), { r: 1, g: 1, b: 1 });
  });

  it('drains rather than blacks out, so the chart stays plannable', () => {
    // §5: terrain is always fully drawn, and what is hidden is occupancy.
    // The veil's floor is a cold wash over a chart the player can still read
    // a route on, not the unexplored black that would be the wrong game.
    const floor = veilShade(0, 1);
    assertShade(floor, VEIL_FLOOR_RGB);
    const mean = (floor.r + floor.g + floor.b) / 3;
    assert.ok(mean > 0.25 && mean < 0.6, `floor mean ${mean} is a wash, not a blackout`);
    // Blue held well above the other two is what makes the multiply read as a
    // desaturation towards the ambient rather than as a dimmer, which is what
    // keeps a ridge legible on a palette that is already dark.
    assert.ok(floor.b > floor.r * 1.5, 'the warmth goes out of it first');
  });

  it('turns off completely, because turning it off can cost nothing', () => {
    for (const clarity of [0, 0.3, 1]) {
      assertShade(veilShade(clarity, 0), { r: 1, g: 1, b: 1 });
    }
  });

  it('scales between the two without overshooting either', () => {
    const half = veilShade(0, 0.5);
    assert.ok(half.r > VEIL_FLOOR_RGB.r && half.r < 1);
    // Out-of-range input is a setting that got written badly, not a licence
    // to brighten the ground past what the texture holds.
    assertShade(veilShade(2, 2), { r: 1, g: 1, b: 1 });
    assertShade(veilShade(-1, 2), VEIL_FLOOR_RGB);
  });
});
