/**
 * What a silence order reads out, against what it enforces (#623, criterion 8).
 *
 * The order is the one mission rule stated as a SIG number, and until now the
 * panel printed only its ceiling. The instrument nearest to hand — the SIG
 * meter — is a fleet instrument with docs/ui-ux.md §3's fixed stops, measured
 * over everything the player owns, and the owner's decision on #623 is that it
 * stays one. The order binds a single authored role (`silenceRole`), so in
 * Sorrowgate the meter reads the court's tenders at 18 while the rule the
 * player is being charged against reads the flight's 6. A player with a
 * ceiling and no reading has nothing to check.
 *
 * `EchoSnapshot.boundSig` is that reading, and it is latched by
 * `applySilenceLedger` from the same call the debt is computed from, so the
 * two cannot be drawn from different sets without someone deleting a line.
 * These tests hold the observable half of that, over the registry rather than
 * over Sorrowgate: the criterion is written to cover the five ceiling missions
 * shipping today *and* the sixth authored next month, so no mission is named
 * here and none should be.
 *
 * One property is deliberately *not* held here. "The reading reaches only the
 * observer the order was given to" has no instances to hold: a mission seats
 * one human slot, so `resolveEcho` produces exactly one snapshot per pass and
 * there is no second observer to protect. A test for it passed by walking
 * nothing, which is the guard that cannot fail — so it was deleted rather than
 * kept for the shape of it. The day a mission seats two, it wants writing.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { SIM, type EchoSnapshot } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { MISSIONS } from '../src/sim/missions/index.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import type { MissionDefinition } from '../src/sim/missions/types.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

/**
 * Passes to sample before choosing the ceilings to sweep. Four, because a
 * mission's opening pass is its party still being seated and the figure the
 * order settles at arrives after it.
 */
const PROBE_PASSES = 4;

/** A mission runs a ledger exactly when it has an array to withdraw. */
const runsLedger = (mission: MissionDefinition) => mission.arrayTag !== undefined;

interface Pass {
  own: EchoSnapshot;
  /**
   * The debt as of this same Echo tick. `currentView` is rebuilt every pass
   * whether or not the edge fires, and carries `debtS` unrounded, so this is
   * the ledger's own state beside the reading that produced it.
   */
  debtS: number;
}

/**
 * Drive a mission a few Echo passes and keep the player's own snapshot and the
 * ledger's debt from each.
 *
 * Two passes is enough for everything here and matters for the suite's wall
 * clock: the mission tests already play whole missions out at 60 Hz and are
 * most of its time, and nothing asserted below needs a mission played.
 */
function passes(match: Match, playerSlot: number, count: number): Pass[] {
  const out: Pass[] = [];
  for (let tick = 0; tick < SIM.TICK_HZ * 4 && out.length < count; tick++) {
    const snapshots = match.update(STEP_MS);
    if (snapshots === null) continue;
    const own = snapshots.get(playerSlot);
    if (own === undefined) continue;
    out.push({ own, debtS: match.missionView?.debtS ?? 0 });
  }
  return out;
}

function matchFor(mission: MissionDefinition): Match {
  const map = missionMapById(mission.mapId);
  assert.ok(map !== undefined, `${mission.id} names a map that exists`);
  return new Match(map, { mission, fauna: false, seed: 11 });
}

describe('the silence order reads out the set it enforces (#623 §8)', () => {
  it('publishes a reading in every mission that keeps a ledger, and in no other', () => {
    let withLedger = 0;
    let withoutLedger = 0;
    for (const mission of MISSIONS) {
      // The criterion is written over `silenceCeilingSig < 100`, and that is
      // the same population as "keeps a ledger" only while the two agree. A
      // mission authored with a ceiling and no array would be a rule stated
      // and never enforced, and the panel would have nothing to draw — so the
      // coherence is asserted rather than assumed.
      if (mission.silenceCeilingSig < 100) {
        assert.ok(
          runsLedger(mission),
          `${mission.id} states a ceiling of ${mission.silenceCeilingSig} but lends no array`
        );
      }
      for (const { own } of passes(matchFor(mission), mission.playerSlot, 2)) {
        if (!runsLedger(mission)) {
          // No order, no rule in force. A ceiling drawn against nothing is the
          // note in the margin turned into a rule that `sigBudget` warns about.
          assert.equal(own.boundSig, undefined, `${mission.id} keeps no ledger and reads none`);
          withoutLedger++;
          continue;
        }
        assert.ok(own.boundSig !== undefined, `${mission.id} keeps a ledger and reads it out`);
        assert.equal(
          own.boundSig.ceiling,
          mission.silenceCeilingSig,
          `${mission.id}: the ceiling shown is the ceiling enforced`
        );
        assert.ok(Number.isInteger(own.boundSig.peak), `${mission.id}: the reading is whole`);
        withLedger++;
      }
    }
    // Both halves were actually walked. An assertion that only ever ran on the
    // empty side would read as coverage and hold nothing.
    assert.ok(withLedger > 0, `${withLedger} passes under a ledger`);
    assert.ok(withoutLedger > 0, `${withoutLedger} passes with no ledger`);
  });

  it('reads a narrower set than the meter beside it, and never a wider one', () => {
    // The whole reason this field exists: `peakSig` is the max over everything
    // the player owns, and the order binds one role. A reading that could not
    // come out below the meter would be the meter, and wiring `peakSig` here
    // would pass every other assertion in this file.
    let narrower = 0;
    for (const mission of MISSIONS) {
      if (!runsLedger(mission)) continue;
      for (const { own } of passes(matchFor(mission), mission.playerSlot, 2)) {
        const bound = own.boundSig;
        assert.ok(bound !== undefined);
        assert.ok(
          bound.peak <= Math.ceil(own.peakSig),
          `${mission.id}: the order binds a subset of the player's own hulls`
        );
        if (bound.peak < Math.ceil(own.peakSig)) narrower++;
      }
    }
    assert.ok(narrower > 0, 'at least one ledger mission reads below its own meter');
  });

  it('crosses at the tick the ledger charges, both ways', () => {
    // The ceiling is moved rather than the hulls, because a mission's own
    // hulls cannot be made loud from out here without naming them — and naming
    // them is what this criterion is written to avoid. A ceiling of 0 puts any
    // audible bound hull in breach; 100 is above every SIG there is, so the
    // same water is compliant. Both derived from the registry, so a mission
    // added later is driven through both branches without anyone editing this.
    //
    // The rest hold the *rounding*, and they are not decoration: two thirds of
    // the SIG readings in these five missions are fractional (4.8333, 4.3333),
    // so a reading is rounded before the player compares it to anything, and
    // the two comparisons agree at every whole ceiling only if it is rounded
    // **up**. A flight at 4.33 is charged for at a ceiling of 4; rounded to
    // nearest or down it reads a compliant 4 while the debt climbs.
    //
    // The sweep sits a point either side of every reading the order actually
    // takes, because that is where the two roundings differ. Two things about
    // it are scars rather than style. The ceilings are whole numbers fixed
    // before the comparison and never derived from the rounded figure — a
    // ceiling computed from the reading moves when the rounding does, and
    // every rounding then passes its own test. And *every* reading is probed
    // rather than the first: these missions open with a party still being
    // seated and settle a pass later (First Arrival reads 16, then 4.33 for
    // the rest), so a sweep around the opening figure brackets a number the
    // order never holds again.
    let charged = 0;
    let forgiven = 0;
    let byAFraction = 0;
    for (const mission of MISSIONS) {
      if (!runsLedger(mission)) continue;
      const probes = passes(matchFor(mission), mission.playerSlot, PROBE_PASSES);
      assert.ok(probes.length > 0, `${mission.id} reads something to work from`);
      const bracket = new Set([0, 100]);
      for (const { own } of probes) {
        assert.ok(own.boundSig !== undefined, `${mission.id} reads on every pass`);
        for (const near of [own.boundSig.peak - 1, own.boundSig.peak, own.boundSig.peak + 1]) {
          if (near >= 0) bracket.add(near);
        }
      }
      const ceilings = [...bracket];
      for (const ceiling of ceilings) {
        const derived: MissionDefinition = { ...mission, silenceCeilingSig: ceiling };
        let previous = 0;
        for (const { own, debtS } of passes(matchFor(derived), mission.playerSlot, 3)) {
          const bound = own.boundSig;
          assert.ok(bound !== undefined);
          assert.equal(bound.ceiling, ceiling, `${mission.id}: the derived ceiling is shown`);
          if (debtS > previous) {
            // The ledger charged this pass, so the panel has to be showing a
            // breach on the same pass. This is the whole criterion in one line.
            assert.ok(
              bound.peak > bound.ceiling,
              `${mission.id}: charged while the panel reads ${bound.peak} of ${ceiling}`
            );
            if (bound.peak === ceiling + 1) byAFraction++;
          }
          if (bound.peak > bound.ceiling) {
            assert.ok(
              debtS >= previous,
              `${mission.id}: reads ${bound.peak} over ${ceiling} while the debt falls`
            );
            if (debtS > previous) charged++;
          } else {
            assert.ok(
              debtS <= previous,
              `${mission.id}: reads ${bound.peak} under ${ceiling} while the debt rises`
            );
            forgiven++;
          }
          previous = debtS;
        }
      }
    }
    // Both branches of the ledger were reached. Without this the test passes on
    // a mission whose hulls happen never to make a sound.
    assert.ok(charged > 0, `${charged} passes where the reading was charged for`);
    assert.ok(forgiven > 0, `${forgiven} passes where it was not`);
    // And the rounding case was actually reached, rather than every breach
    // being comfortably clear of its ceiling.
    assert.ok(byAFraction > 0, `${byAFraction} breaches inside a single point`);
  });
});
