/**
 * Cross-mission Drift Health — docs/campaign.md §2 rule 5, "the map persists"
 * (#379), against the pair the rule was chosen a map for: *Tend* and
 * *Convocation* on one `marr-plateau`.
 *
 * Two boundaries are pinned. `validateDriftGrid` is the trust boundary: the
 * grid a room is handed comes out of the client's own storage, so the server
 * checks that it is *possible* and refuses what is not *whole* — a clamp would
 * hand a tampered cell the ceiling. `seed` is the arithmetic: one flat
 * `CARRY_RECOVERY`, capped at the fresh start, nothing for the Dead. Every
 * figure is exact, for the reason `drift.test.ts` gives — the rate is the
 * mechanic, and a carry that healed a point too much would surface weeks later
 * as a plateau that forgot what was done to it.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DRIFT, Faction, SIM } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { DriftHealth, validateDriftGrid } from '../src/sim/drift.ts';
import { playReplay } from '../src/sim/replay.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { SEEDING_CONVOCATION, SEEDING_TEND } from '../src/sim/missions/index.ts';

const CELLS = DRIFT.HEALTH_REGIONS ** 2;
const STEP_MS = 1000 / SIM.TICK_HZ;

/** The grid a map played in silence closes on: every cell at the fresh start. */
function freshGrid(): number[] {
  return new Array<number>(CELLS).fill(DRIFT.HEALTH_START);
}

/** A fresh grid with one cell as the last match left it. */
function gridWith(cell: number, value: number): number[] {
  const grid = freshGrid();
  grid[cell] = value;
  return grid;
}

describe('validateDriftGrid — the trust boundary', () => {
  it('accepts a possible grid, as a copy', () => {
    const grid = freshGrid();
    grid[3] = 20;
    grid[5] = 0;
    // Cells *above* the fresh start are honest, not suspect: `tick` heals a
    // quiet cell toward HEALTH_MAX, so a softly played Tend closes most of its
    // plateau above 88. The validator's ceiling is therefore the scale's, and
    // bringing such a cell back down to the start is `seed`'s job, below.
    grid[7] = 95;
    grid[9] = DRIFT.HEALTH_MAX;
    const out = validateDriftGrid(grid, CELLS);
    assert.deepEqual(out, grid);
    assert.notEqual(out, grid, "a copy, not the caller's array");
  });

  it('refuses a grid of the wrong length rather than padding or truncating it', () => {
    assert.equal(validateDriftGrid(freshGrid().slice(1), CELLS), null, 'one short');
    assert.equal(validateDriftGrid([...freshGrid(), DRIFT.HEALTH_START], CELLS), null, 'one over');
    assert.equal(validateDriftGrid([], CELLS), null, 'empty');
  });

  it('refuses anything that is not an array', () => {
    for (const bad of [undefined, null, DRIFT.HEALTH_START, 'grid', { length: CELLS }]) {
      assert.equal(validateDriftGrid(bad, CELLS), null, String(bad));
    }
  });

  it('refuses the whole grid for one impossible cell, and never clamps it', () => {
    const impossible: [string, unknown][] = [
      ['a non-number', '88'],
      ['NaN', Number.NaN],
      ['an infinity', Number.POSITIVE_INFINITY],
      ['a negative', -1],
      ['a value above the scale', DRIFT.HEALTH_MAX + 1],
    ];
    for (const [name, cell] of impossible) {
      const grid: unknown[] = freshGrid();
      grid[6] = cell;
      assert.equal(validateDriftGrid(grid, CELLS), null, name);
    }
  });
});

describe('DriftHealth.seed — the gap between two tides', () => {
  it('writes the grid with one flat recovery, capped at the fresh start', () => {
    const drift = new DriftHealth(8000, 8000);
    const grid = freshGrid();
    grid[0] = 20;
    grid[1] = DRIFT.HEALTH_START - 2;
    grid[2] = DRIFT.HEALTH_MAX;
    grid[3] = 0;
    drift.seed(grid);

    const seeded = drift.snapshot();
    assert.equal(seeded[0], 20 + DRIFT.CARRY_RECOVERY, 'a Failing cell, plus the gap');
    assert.ok(seeded[0]! < DRIFT.HEALTH_FAILING, 'and still Failing — the gap is not a cure');
    assert.equal(seeded[1], DRIFT.HEALTH_START, 'the cap, from below');
    assert.equal(seeded[2], DRIFT.HEALTH_START, 'the cap, from above');
    assert.equal(seeded[3], 0, 'Dead is permanent: there is nothing left to recover from');
    for (let i = 4; i < CELLS; i++) {
      assert.equal(seeded[i], DRIFT.HEALTH_START, `cell ${i}: a fresh cell carried arrives fresh`);
    }
  });

  it('refuses a grid of the wrong size rather than half-seeding', () => {
    const drift = new DriftHealth(8000, 8000);
    assert.throws(() => drift.seed([20, 20]));
    assert.ok(
      drift.snapshot().every((h) => h === DRIFT.HEALTH_START),
      'and wrote nothing'
    );
  });
});

describe('a Match seeded from a carried grid', () => {
  it('starts at the carried values, plus the gap, and never above the fresh start', () => {
    const grid = freshGrid();
    grid[6] = 20;
    grid[9] = 0;
    grid[10] = DRIFT.HEALTH_MAX;
    const match = new Match(undefined, { fauna: false, seed: 3791, driftHealth: grid });
    const seeded = match.world.drift.snapshot();
    assert.equal(seeded[6], 20 + DRIFT.CARRY_RECOVERY);
    assert.equal(seeded[9], 0);
    assert.equal(seeded[10], DRIFT.HEALTH_START);
  });

  it('starts fresh without one', () => {
    const match = new Match(undefined, { fauna: false, seed: 3792 });
    assert.ok(match.world.drift.snapshot().every((h) => h === DRIFT.HEALTH_START));
  });

  it('records the grid as presented, so a replay seeds through the same arithmetic', () => {
    const presented = gridWith(6, 20);
    const live = new Match(undefined, {
      fauna: false,
      seed: 3793,
      record: true,
      driftHealth: presented,
    });
    live.addPlayer(0, Faction.Bathyarch);
    for (let i = 0; i < SIM.TICK_HZ; i++) live.update(STEP_MS);

    const replay = live.replay()!;
    // Before `seed`'s recovery, not after: a header holding the seeded grid
    // would be healed twice on playback.
    assert.deepEqual(replay.driftHealth, presented);

    const played = playReplay(replay);
    assert.deepEqual(played.match.world.drift.snapshot(), live.world.drift.snapshot());
    // And the header is load-bearing: the same file without it is a different match.
    const fresh = playReplay({ ...replay, driftHealth: undefined });
    assert.notDeepEqual(fresh.match.world.drift.snapshot(), live.world.drift.snapshot());
  });
});

describe("Tend → Convocation — campaign.md §2 rule 5's first pair", () => {
  it('is one plateau under two missions', () => {
    // The record is keyed by map for exactly this reason: what Convocation
    // inherits is what Tend did to the ground, whichever mission did it.
    assert.equal(SEEDING_TEND.mapId, SEEDING_CONVOCATION.mapId);
    assert.equal(SEEDING_TEND.mapId, 'marr-plateau');
  });

  it('opens Convocation on the plateau Tend left, one gap later', () => {
    const map = missionMapById(SEEDING_CONVOCATION.mapId)!;
    // A point on the plateau, resolved to its region through the same
    // arithmetic the live grid uses rather than a hard-coded index, so a
    // repainted map cannot quietly move the test off its cell.
    const x = 2500;
    const y = 900;
    const region = new DriftHealth(map.widthM, map.heightM).regionIndex(x, y);

    // Tend, played loudly on one terrace and quietly everywhere else.
    const asTendLeftIt = gridWith(region, 20);
    const convocation = new Match(map, {
      mission: SEEDING_CONVOCATION,
      fauna: false,
      seed: 379,
      driftHealth: asTendLeftIt,
    });

    assert.equal(convocation.world.drift.at(x, y), 20 + DRIFT.CARRY_RECOVERY);
    assert.ok(convocation.world.drift.at(x, y) < DRIFT.HEALTH_FAILING, 'still Failing');
    const seeded = convocation.world.drift.snapshot();
    for (let i = 0; i < CELLS; i++) {
      if (i === region) continue;
      assert.equal(seeded[i], DRIFT.HEALTH_START, `cell ${i}: the rest of the plateau as it was`);
    }
  });
});
