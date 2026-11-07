/**
 * The free-water study's cells, rounded (roundedCells.ts; docs/free-water-slice.md
 * §9, "Crater walls"). What the field promises its readers: a straight edge
 * moves nowhere, no edge moves as far as the licence, a cell centre keeps its
 * own kind with half a cell less the licence to spare, and where three kinds
 * meet none spikes into the others. Small authored grounds stand in for the
 * study, so each property is read where it is the only one at work.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Biome } from '@echoes/shared';
import {
  buildRoundedCells,
  forgetRoundedCells,
  ROUNDED_CELLS,
  roundedCellsOf,
  roundedDistances,
} from '../src/game/roundedCells.ts';
import type { TerrainPayload } from '../src/net/GameClient.ts';

const CELL = 250;

/** A ground from rows of letters: `#` rock, any other letter one open kind at its own floor. */
function ground(rows: readonly string[]): TerrainPayload {
  const cols = rows[0]!.length;
  const floor: number[] = [];
  const ceiling: number[] = [];
  const biomes: number[] = [];
  for (const row of rows) {
    for (const ch of row) {
      if (ch === '#') {
        floor.push(200);
        ceiling.push(3000);
        biomes.push(Biome.CoralRuins);
      } else {
        floor.push(500 + 100 * (ch.charCodeAt(0) - 97));
        ceiling.push(0);
        biomes.push((ch.charCodeAt(0) - 97) % 6);
      }
    }
  }
  return { cols, rows: rows.length, cellM: CELL, floor, ceiling, biomes };
}

/** The kind with the largest rounded distance at a point: the kind its rounded ground holds. */
function heldBy(terrain: TerrainPayload, x: number, z: number): number {
  const field = roundedCellsOf(terrain);
  const s = new Float64Array(field.kinds.length);
  roundedDistances(field, x, z, s);
  let best = 0;
  for (let k = 1; k < s.length; k++) if (s[k]! > s[best]!) best = k;
  return best;
}

describe('rounded cells (roundedCells.ts)', () => {
  it('tells rock from water and each open kind by its biome, floor and ceiling', () => {
    const terrain = ground(['aa#', 'ab#']);
    const field = buildRoundedCells(terrain);
    assert.equal(field.kinds.length, 3);
    assert.equal(field.kinds.filter((k) => k.rock).length, 1);
    assert.equal(field.kindOf[0], field.kindOf[1]);
    assert.notEqual(field.kindOf[3], field.kindOf[4]);
  });

  it('moves a straight edge nowhere', () => {
    // A ground split down the middle has no staircase to round: every
    // kind's move is nothing, to within the blur's numerical tail.
    const terrain = ground(['aaaabbbb', 'aaaabbbb', 'aaaabbbb', 'aaaabbbb', 'aaaabbbb']);
    const field = buildRoundedCells(terrain);
    let worst = 0;
    for (const moves of field.moves) for (const m of moves) worst = Math.max(worst, Math.abs(m));
    assert.ok(worst < 0.5, `a straight edge moved ${worst} m`);
  });

  it('rounds a corner, and never moves an edge as far as the licence', () => {
    const terrain = ground(['aaaaaa', 'aaaaaa', 'aabbbb', 'aabbbb', 'aabbbb', 'aabbbb']);
    const field = buildRoundedCells(terrain);
    let worst = 0;
    for (const moves of field.moves) for (const m of moves) worst = Math.max(worst, Math.abs(m));
    assert.ok(worst > 10, `the positive control: the corner moved ${worst} m`);
    assert.ok(worst < ROUNDED_CELLS.LICENCE_M, `a move of ${worst} m passed the licence`);
    // The corner's own point is cut: a step into b's corner along its
    // diagonal is held by a, where the cells say b.
    assert.equal(heldBy(terrain, 2 * CELL + 10, 2 * CELL + 10), field.kindOf[0]);
  });

  it("keeps every cell centre its own kind's, half a cell less the licence inside it", () => {
    const terrain = ground(['aaab#', 'abbb#', 'aaab#', 'ccab#', 'ccaa#']);
    const field = buildRoundedCells(terrain);
    const s = new Float64Array(field.kinds.length);
    for (let i = 0; i < terrain.cols * terrain.rows; i++) {
      const x = ((i % terrain.cols) + 0.5) * CELL;
      const z = (Math.floor(i / terrain.cols) + 0.5) * CELL;
      roundedDistances(field, x, z, s);
      const own = field.kindOf[i]!;
      assert.ok(s[own]! >= CELL / 2 - ROUNDED_CELLS.LICENCE_M, `centre ${i}: own ${s[own]}`);
      for (let k = 0; k < s.length; k++) {
        if (k !== own)
          assert.ok(s[k]! <= -(CELL / 2 - ROUNDED_CELLS.LICENCE_M), `centre ${i}: ${k}`);
      }
    }
  });

  it('settles a T into a Y: where three kinds meet, none spikes into the others', () => {
    // a over the west half, b over the east, c across the south: the corners
    // a and b turn into c round off, and blurred as shares that sum to one
    // the junction settles rather than c filling the gap the two leave, as a
    // spike up the a–b edge. Up that edge, half a cell from the junction, a
    // and b still meet there rather than c holding the line.
    const terrain = ground(['aaabbb', 'aaabbb', 'aaabbb', 'cccccc', 'cccccc', 'cccccc']);
    const field = buildRoundedCells(terrain);
    const [a, b, c] = [field.kindOf[0]!, field.kindOf[5]!, field.kindOf[18]!];
    const edgeX = 3 * CELL;
    const junctionZ = 3 * CELL;
    for (const dz of [60, 90, 125]) {
      const z = junctionZ - dz;
      assert.equal(heldBy(terrain, edgeX - 5, z), a, `a holds its side ${dz} m up`);
      assert.equal(heldBy(terrain, edgeX + 5, z), b, `b holds its side ${dz} m up`);
    }
    // c may come up to the junction, by no more than the licence.
    for (let dz = ROUNDED_CELLS.LICENCE_M + 1; dz < CELL; dz += 7) {
      assert.notEqual(heldBy(terrain, edgeX, junctionZ - dz), c, `c spikes ${dz} m up the edge`);
    }
  });

  it('builds once per terrain, and reads a changed one afresh once forgotten', () => {
    const terrain = ground(['aab', 'aab']);
    const first = roundedCellsOf(terrain);
    assert.equal(roundedCellsOf(terrain), first);
    terrain.floor[2] = 900;
    assert.equal(roundedCellsOf(terrain), first, 'held until forgotten');
    forgetRoundedCells(terrain);
    assert.notEqual(roundedCellsOf(terrain), first);
  });
});
