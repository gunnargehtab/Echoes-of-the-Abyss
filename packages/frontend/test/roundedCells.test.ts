/**
 * The free-water study's cells, rounded and then wandered (roundedCells.ts;
 * docs/free-water-slice.md §9, "Crater walls"). What the field promises its
 * readers. Of the rounding: a straight edge moves nowhere, a cell centre keeps
 * its own kind with `CENTRE_MARGIN_M` to spare, an edge the rounding would
 * carry too near a centre bends round it, and where three kinds meet none
 * spikes into the others. Of the wander: a straight edge meanders, by no more
 * than `WANDER_M`, and the warp folds nowhere. Of the two together: no edge
 * moves as far as the licence, and every centre still keeps its margin. Small
 * authored grounds stand in for the study, and the rounding's own properties
 * are read with the wander off (`buildRoundedCells(terrain, 0)`), so each is
 * read where it is the only one at work.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Biome } from '@echoes/shared';
import {
  buildRoundedCells,
  forgetRoundedCells,
  ROUNDED_CELLS,
  type RoundedCells,
  roundedCellsOf,
  roundedDistances,
  wanderAt,
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
function heldBy(field: RoundedCells, x: number, z: number): number {
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

  it('moves a straight edge nowhere by rounding it', () => {
    // A ground split down the middle has no staircase to round: every
    // kind's move is nothing, to within the blur's numerical tail.
    const terrain = ground(['aaaabbbb', 'aaaabbbb', 'aaaabbbb', 'aaaabbbb', 'aaaabbbb']);
    const field = buildRoundedCells(terrain, 0);
    let worst = 0;
    for (const moves of field.moves) for (const m of moves) worst = Math.max(worst, Math.abs(m));
    assert.ok(worst < 0.5, `a straight edge moved ${worst} m`);
  });

  it('rounds a corner, and never moves an edge as far as the licence', () => {
    const terrain = ground(['aaaaaa', 'aaaaaa', 'aabbbb', 'aabbbb', 'aabbbb', 'aabbbb']);
    const field = buildRoundedCells(terrain, 0);
    let worst = 0;
    for (const moves of field.moves) for (const m of moves) worst = Math.max(worst, Math.abs(m));
    assert.ok(worst > 10, `the positive control: the corner moved ${worst} m`);
    assert.ok(worst < ROUNDED_CELLS.LICENCE_M, `a move of ${worst} m passed the licence`);
    // The corner's own point is cut: a step into b's corner along its
    // diagonal is held by a, where the cells say b.
    assert.equal(heldBy(field, 2 * CELL + 10, 2 * CELL + 10), field.kindOf[0]);
  });

  it("keeps every cell centre its own kind's, the margin inside it, wandered or not", () => {
    const terrain = ground(['aaab#', 'abbb#', 'aaab#', 'ccab#', 'ccaa#']);
    for (const field of [buildRoundedCells(terrain, 0), buildRoundedCells(terrain)]) {
      const s = new Float64Array(field.kinds.length);
      for (let i = 0; i < terrain.cols * terrain.rows; i++) {
        const x = ((i % terrain.cols) + 0.5) * CELL;
        const z = (Math.floor(i / terrain.cols) + 0.5) * CELL;
        roundedDistances(field, x, z, s);
        const own = field.kindOf[i]!;
        const margin = ROUNDED_CELLS.CENTRE_MARGIN_M - 1e-3;
        assert.ok(s[own]! >= margin, `centre ${i}: own ${s[own]}`);
        for (let k = 0; k < s.length; k++) {
          if (k !== own) assert.ok(s[k]! <= -margin, `centre ${i}: ${k} at ${s[k]}`);
        }
      }
    }
  });

  it('settles a T into a Y: where three kinds meet, none spikes into the others', () => {
    // a over the west half, b over the east, c across the south: the corners
    // a and b turn into c round off, and blurred as shares that sum to one
    // the junction settles rather than c filling the gap the two leave, as a
    // spike up the a–b edge. The Y's stem climbs the edge a little; past it,
    // a and b still meet there rather than c holding the line.
    const terrain = ground(['aaabbb', 'aaabbb', 'aaabbb', 'cccccc', 'cccccc', 'cccccc']);
    const field = buildRoundedCells(terrain, 0);
    const [a, b, c] = [field.kindOf[0]!, field.kindOf[5]!, field.kindOf[18]!];
    const edgeX = 3 * CELL;
    const junctionZ = 3 * CELL;
    for (const dz of [90, 125, 160]) {
      const z = junctionZ - dz;
      assert.equal(heldBy(field, edgeX - 5, z), a, `a holds its side ${dz} m up`);
      assert.equal(heldBy(field, edgeX + 5, z), b, `b holds its side ${dz} m up`);
    }
    // c may come up to the junction, by no more than the licence.
    for (let dz = ROUNDED_CELLS.LICENCE_M + 1; dz < CELL; dz += 7) {
      assert.notEqual(heldBy(field, edgeX, junctionZ - dz), c, `c spikes ${dz} m up the edge`);
    }
  });

  it('bends an edge the rounding would carry over a centre back round it', () => {
    // A lone cell of b in a field of a: blurred, its share never leads, so the
    // rounding alone would drown it. Its centre still reads b, with the
    // margin to spare, and the bend is local: past it the field is a's.
    const terrain = ground(['aaaaa', 'aaaaa', 'aabaa', 'aaaaa', 'aaaaa']);
    const field = buildRoundedCells(terrain, 0);
    const b = field.kindOf[12]!;
    const a = field.kindOf[0]!;
    const s = new Float64Array(field.kinds.length);
    roundedDistances(field, 2.5 * CELL, 2.5 * CELL, s);
    assert.ok(s[b]! >= ROUNDED_CELLS.CENTRE_MARGIN_M - 1e-3, `the lone centre reads ${s[b]}`);
    assert.equal(heldBy(field, 2.5 * CELL, 2.5 * CELL), b);
    assert.equal(heldBy(field, 2.5 * CELL + ROUNDED_CELLS.CENTRE_BEND_M + 5, 2.5 * CELL), a);
  });

  it('wanders a straight edge, by no more than the wander', () => {
    // The same split ground, longer: rounded it is a ruled line, which from
    // the survey dolly reads as the side of a box (#1774). Wandered, the edge
    // meanders either side of the cell edge and never further than
    // `WANDER_M` from it.
    const row = 'aaaabbbb';
    const terrain = ground(Array.from({ length: 16 }, () => row));
    const field = buildRoundedCells(terrain);
    const a = field.kindOf[0]!;
    const edgeX = 4 * CELL;
    const off: number[] = [];
    for (let z = CELL; z <= 15 * CELL; z += 10) {
      let x = edgeX - CELL;
      while (heldBy(field, x, z) === a) x += 1;
      off.push(x - edgeX);
    }
    const least = Math.min(...off);
    const most = Math.max(...off);
    const said = `from ${least} to ${most} m`;
    assert.ok(most <= ROUNDED_CELLS.WANDER_M + 1 && least >= -ROUNDED_CELLS.WANDER_M - 1, said);
    assert.ok(most > 20 && least < -20, `the positive control: the edge wanders ${said}`);
  });

  it('never moves an edge as far as the licence, rounded and wandered', () => {
    // Wherever the wandered ground is held by a kind its cell is not, a cell
    // of that kind lies within the licence: the wander has only what the
    // rounding left of it.
    for (const rows of [
      ['aaaaaa', 'aaaaaa', 'aabbbb', 'aabbbb', 'aabbbb', 'aabbbb'],
      ['aaab#a', 'abbb#a', 'aaab#a', 'ccab#a', 'ccaa#a', 'ccaaaa'],
      ['aaaaaaaa', 'aabbbbaa', 'abbbbbba', 'abbbbbba', 'abbbbbba', 'aabbbbaa', 'aaaaaaaa'],
    ]) {
      const terrain = ground(rows);
      const field = buildRoundedCells(terrain);
      const { cols } = terrain;
      let moved = 0;
      for (let z = 3; z < terrain.rows * CELL; z += 9.7) {
        for (let x = 3; x < cols * CELL; x += 9.7) {
          const held = heldBy(field, x, z);
          if (held === field.kindOf[Math.floor(z / CELL) * cols + Math.floor(x / CELL)]) continue;
          let d = Number.POSITIVE_INFINITY;
          for (let i = 0; i < field.kindOf.length; i++) {
            if (field.kindOf[i] !== held) continue;
            const c = i % cols;
            const r = Math.floor(i / cols);
            const dx = Math.max(c * CELL - x, 0, x - (c + 1) * CELL);
            const dz = Math.max(r * CELL - z, 0, z - (r + 1) * CELL);
            d = Math.min(d, Math.hypot(dx, dz));
          }
          assert.ok(d < ROUNDED_CELLS.LICENCE_M, `${rows[0]} at ${x},${z}: ${d} m past its cells`);
          moved = Math.max(moved, d);
        }
      }
      assert.ok(moved > 40, `the positive control: an edge moved ${moved} m`);
    }
    assert.ok(ROUNDED_CELLS.WANDER_M + ROUNDED_CELLS.WANDER_SPARE_M < ROUNDED_CELLS.LICENCE_M);
    assert.ok(
      ROUNDED_CELLS.WANDER_M + ROUNDED_CELLS.CENTRE_MARGIN_M < CELL / 2,
      'a wandered straight edge still stands the margin off the centres either side'
    );
  });

  it('folds nowhere: the warp turns no ground inside out', () => {
    // The wander reads the rounded field through a warp of the plan. Where
    // the warp's own slope passed one it would fold, and an edge would cusp
    // or shed an island. Its Jacobian's determinant stays above nothing over
    // a plan far wider than any map, at the wander's full amplitude.
    const A = ROUNDED_CELLS.WANDER_M;
    const h = 2;
    const [at, east, south] = [new Float64Array(2), new Float64Array(2), new Float64Array(2)];
    let least = Number.POSITIVE_INFINITY;
    let longest = 0;
    for (let z = -8000; z < 8000; z += 23) {
      for (let x = -8000; x < 8000; x += 23) {
        wanderAt(x, z, at);
        wanderAt(x + h, z, east);
        wanderAt(x, z + h, south);
        const xx = 1 + (A * (east[0]! - at[0]!)) / h;
        const xz = (A * (south[0]! - at[0]!)) / h;
        const zx = (A * (east[1]! - at[1]!)) / h;
        const zz = 1 + (A * (south[1]! - at[1]!)) / h;
        least = Math.min(least, xx * zz - xz * zx);
        longest = Math.max(longest, Math.hypot(at[0]!, at[1]!));
      }
    }
    assert.ok(least > 0.1, `the warp's determinant falls to ${least}`);
    assert.ok(longest <= 1, `the warp reaches ${longest} of its amplitude`);
    assert.ok(longest > 0.9, 'the positive control: the warp spends its amplitude');
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
