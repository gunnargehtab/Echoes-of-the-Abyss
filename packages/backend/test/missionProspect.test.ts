/**
 * The Ledger 6 — docs/mission-prospect.md, against a live match.
 *
 * - **The refit is bought, and it is a mission fact** (§2): every expedition
 *   hull spawns at PR-3 while the roster's own ratings stand unchanged.
 * - **Nobody on the rim is armed** (§5): four navies, weapons-cold, and the
 *   convergence mechanically incapable of the war everyone is early for.
 * - **The survey is soundings at the trade standard** (§6): six faces, two
 *   calibrated readers, three per bank, at the figures both campaign
 *   documents quote.
 * - **An idle expedition returns short** — the twenty-two-minute run closes
 *   Partial: the column never left the staging, so the ascent reads met and
 *   the field does not, with the ledger's unheard line and both attendant
 *   gaps assembled beneath it.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { MissionOutcome, SIM, UnitKind, statsFor } from '@echoes/shared';
import { defineQuery, hasComponent } from 'bitecs';
import { Owner, Pressure, Unit, Weapon } from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { LEDGER_PROSPECT } from '../src/sim/missions/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const hulls = defineQuery([Unit, Owner]);

describe('the writ, run out — docs/mission-prospect.md §2, §5, §6, §8', () => {
  it('reads the survey and its certificates off one idle descent', () => {
    const map = missionMapById(LEDGER_PROSPECT.mapId)!;
    const match = new Match(map, { mission: LEDGER_PROSPECT, fauna: false, seed: 61 });

    // §2 — the refit: every player hull at PR-3, bought, while the roster's
    // own Cruiser stays a PR-2 hull for everybody else.
    let armedAnywhere = 0;
    for (const eid of hulls(match.world)) {
      if (hasComponent(match.world, Weapon, eid)) armedAnywhere++;
      if (Owner.slot[eid] !== LEDGER_PROSPECT.playerSlot) continue;
      assert.equal(Pressure.rating[eid], 3, 'an expedition hull sailed without its certificate');
    }
    assert.equal(statsFor(UnitKind.Cruiser).pressureRating, 2, 'the refit leaked into the roster');
    // §5 — four navies, one rim, and nothing armed on any of them.
    assert.equal(armedAnywhere, 0, 'something on the rim is carrying a weapon');

    // §6 — six faces at the trade standard, three per calibrated reader.
    const soundings = LEDGER_PROSPECT.soundings ?? [];
    assert.equal(soundings.length, 6);
    for (const sounding of soundings) {
      assert.equal(sounding.radiusM, 400);
      assert.equal(sounding.holdTicks, 20 * SIM.TICK_HZ);
      assert.equal(sounding.sig, 80);
    }
    assert.equal(soundings.filter((s) => s.tag === 'reader-west').length, 3);
    assert.equal(soundings.filter((s) => s.tag === 'reader-east').length, 3);

    for (let tick = 0; tick <= T(22, 30); tick++) {
      match.update(STEP_MS);
      if (match.missionOver !== null) break;
    }
    const result = match.missionOver;
    assert.ok(result !== null, 'the writ never turned north');
    // §8 — an idle expedition never left the staging: the ascent reads met,
    // the field does not, and the close is the middle reading with the
    // ledger's unheard line and both attendant gaps beneath it.
    assert.equal(result.outcome, MissionOutcome.Partial);
    assert.match(result.epilogue, /returns short of standard/);
    assert.match(result.epilogue, /classified by nobody for long/);
    assert.match(result.epilogue, /western return was not resolved/);
    assert.match(result.epilogue, /file does not believe/);
  });
});
