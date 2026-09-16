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
 * A handful of passes, never a mission played out: the mission tests already
 * run whole missions at 60 Hz and are most of the suite's time, and nothing
 * asserted below needs one. Three or four is enough because everything here is
 * a property of a single pass — the reading beside the debt it produced —
 * rather than of a mission's arc.
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
      if (runsLedger(mission)) {
        // The premise the whole readout rests on, asserted rather than assumed.
        // `BoundSig.peak` rounds *up* and claims that is safe because every
        // ceiling is a whole number — `ceil(peak) > ceiling` and
        // `peak > ceiling` then agree on every input. Author a ceiling of 7.5
        // and that stops being true: a bound peak of 7.2 reads 8, which is over
        // 7.5, while the ledger forgives it. Nothing else in the tree would
        // notice, because the per-mission tests pin the five numbers shipping
        // today and a sixth authored next month has no test until someone
        // writes one — which is the gap this criterion exists to close.
        assert.ok(
          Number.isInteger(mission.silenceCeilingSig),
          `${mission.id}: a ledger ceiling must be whole (see BoundSig.peak), got ${mission.silenceCeilingSig}`
        );
        // And the converse of the check above. 100 is the sentinel for "no
        // ceiling"; a mission that lends an array against it keeps a ledger
        // nothing can ever breach, and the panel would put `flight SIG 022 /
        // 100` on screen — an order that is not one.
        assert.ok(
          mission.silenceCeilingSig < 100,
          `${mission.id} lends an array against no ceiling at all`
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

  it('names the bound set from the authored word alone, or not at all', () => {
    // Criterion 9. The panel puts a word in front of the figure so the player
    // knows *which* hulls it is over, and the tempting source for that word is
    // one field away: `silenceRole`, which the ledger already indexes the set
    // by. It is the wrong source, and `MissionRole`'s own comment says why —
    // roles are internal ids authored per mission, so rendering one gives
    // `called SIG 022 / 025`, a word that names nothing a player can act on.
    //
    // So the reading carries `silenceSetName` verbatim or carries nothing, and
    // this holds both halves of that over the registry rather than over
    // Sorrowgate: a court worded next month is covered, and so is one that is
    // not.
    let worded = 0;
    let unworded = 0;
    for (const mission of MISSIONS) {
      if (!runsLedger(mission)) continue;

      // The premise, in the same register as the whole-ceiling one above. If a
      // mission's display word is also a role it hands out, then the word and
      // the id have converged and nothing downstream can tell an authored
      // noun from the ledger's index piped through — which is exactly the
      // defect this criterion exists to prevent, wearing the right clothes.
      // Today no mission trips it; one that means to wants the reason written
      // down rather than a silently passing test.
      const assigned = new Set(
        mission.parties
          .flatMap((party) => party.units.map((unit) => unit.role))
          .filter((role): role is string => role !== undefined)
      );
      assigned.add(mission.silenceRole ?? 'escort');
      if (mission.silenceSetName !== undefined) {
        assert.ok(
          mission.silenceSetName.length > 0,
          `${mission.id}: an authored set-name is a word, not an empty string`
        );
        assert.ok(
          !assigned.has(mission.silenceSetName),
          `${mission.id}: "${mission.silenceSetName}" is a role this mission assigns, ` +
            'so the display word is indistinguishable from the ledger id'
        );
      }

      for (const { own } of passes(matchFor(mission), mission.playerSlot, 2)) {
        const bound = own.boundSig;
        assert.ok(bound !== undefined);
        // Identity with the authored field, not merely "a string". This is
        // what forbids the default: `setName: definition.silenceRole` would
        // satisfy every other assertion in this file and fails here.
        assert.equal(
          bound.setName,
          mission.silenceSetName,
          `${mission.id}: the word shown is the word authored`
        );
        if (bound.setName === undefined) unworded++;
        else worded++;
      }
    }
    // Both branches walked. Sorrowgate is the worded one today and the other
    // four courts are not, so an assertion that only ever ran on one side
    // would hold half of the criterion and read as all of it.
    assert.ok(worded > 0, `${worded} passes under a worded order`);
    assert.ok(unworded > 0, `${unworded} passes under an unworded one`);
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
    // takes, plus the mission's own authored ceiling. Three things about it are
    // scars rather than style.
    //
    // The bracket is `reading ± 1` and the reading *is* rounded, which looks
    // like the trap the first draft of this test fell into — a ceiling computed
    // from the rounded figure moves when the rounding does, and every rounding
    // passes its own test. It is not, and the reason is worth writing down:
    // whichever of ceil, round or floor is in force, the figure shown is one of
    // `floor(raw)` or `ceil(raw)`, so a ±1 bracket around it always contains
    // `floor(raw)` — and `floor(raw)` is exactly the ceiling at which a
    // fractional reading discriminates, because the ledger charges there
    // (`raw > floor(raw)`) and only rounding up also reads as a breach. What
    // the earlier draft got wrong was using a *single* derived ceiling, which
    // could and did miss that point.
    //
    // *Every* reading is probed rather than the first: these missions open with
    // a party still being seated and settle a pass later (First Arrival reads
    // 16, then 4.33 for the rest), so a sweep around the opening figure
    // brackets a number the order never holds again.
    //
    // And the mission's own `silenceCeilingSig` is in the set, so the number
    // actually shipping is exercised for agreement rather than only the ones
    // this test invented.
    let charged = 0;
    let forgiven = 0;
    let byAFraction = 0;
    for (const mission of MISSIONS) {
      if (!runsLedger(mission)) continue;
      const probes = passes(matchFor(mission), mission.playerSlot, PROBE_PASSES);
      assert.ok(probes.length > 0, `${mission.id} reads something to work from`);
      const bracket = new Set([0, 100, mission.silenceCeilingSig]);
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
