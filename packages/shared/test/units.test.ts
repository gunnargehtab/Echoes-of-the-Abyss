/**
 * Tests for the roster's collision geometry.
 *
 * There is one number here worth defending — the largest radius in the roster —
 * and it is load-bearing in a way that is easy to miss: it is not a display
 * figure, it is the reach of the separation broadphase.
 *
 * Two tests below defend the issue #149 change that made `MAX_UNIT_RADIUS_M`
 * derive itself from `UNIT_STATS` instead of being written down beside it, and
 * they defend it from opposite sides. The source-shape test is the only one
 * that fails against the pre-fix code. The 65 m value pin does not — it passes
 * either way — and is there for the other direction: a derivation that reads
 * the wrong field would still be self-consistent, and would still be wrong.
 * That change was
 * value-preserving — the old `130 / 2` and the new `Math.max(…) / 2` both
 * evaluate to exactly 65, because the Cruiser was the longest hull before and
 * still is — so no comparison of runtime values can tell the two versions
 * apart. Only the source can, which is why one test here does something as
 * unusual as reading it.
 *
 * Everything under `roster invariants` is not a regression test. Those
 * assertions held before #149 and hold after it, and most are identities under
 * the derivation. They are kept because they are cheap and they state what the
 * bound is for, so a future roster edit that quietly breaks the broadphase has
 * something to trip over.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DIRECTIONAL_COMPASS_AVERAGE,
  DIRECTIONAL_SIGNATURE,
  Faction,
  MAX_UNIT_RADIUS_M,
  UNIT_STATS,
  UnitKind,
  statsFor,
  unitAvailableTo,
  unitRadiusM,
} from '../dist/index.js';

const roster = Object.values(UNIT_STATS);

/**
 * The right-hand side of the `MAX_UNIT_RADIUS_M` declaration, read out of the
 * TypeScript source rather than the compiled module.
 *
 * Reading source from a test is normally a smell. Here it is the only vantage
 * point that can see the property we care about: `MAX_UNIT_RADIUS_M` is
 * evaluated once at module load, so by the time any test can observe it the
 * derivation has already collapsed into a number — and it collapses to the same
 * 65 the hardcoded literal produced. There is no roster we can substitute to
 * force the two apart, because the roster is baked in before we get control.
 * The written expression is the only surviving evidence of which one is there.
 */
function maxUnitRadiusExpression(): string {
  const source = readFileSync(new URL('../src/units.ts', import.meta.url), 'utf8');
  const declaration = /export const MAX_UNIT_RADIUS_M\s*=\s*([^;]+);/.exec(source);
  assert.ok(
    declaration,
    'no `export const MAX_UNIT_RADIUS_M = …;` declaration found in src/units.ts — ' +
      'if the constant moved or was renamed, move this test with it rather than deleting it'
  );
  return declaration[1].replace(/\s+/g, ' ').trim();
}

describe('MAX_UNIT_RADIUS_M is derived from the roster', () => {
  it('is written as an expression over UNIT_STATS, not as a transcribed number', () => {
    // The failure this defends against is a maintenance one and it is silent:
    // someone adds a hull longer than the Cruiser, and the bound — being a
    // literal — does not follow. Separation asks the broadphase for neighbours
    // within `ownRadius + MAX_UNIT_RADIUS_M`, so that hull would overlap other
    // units without ever appearing in their neighbour lists. Nobody shoves it,
    // and it drifts through the formation it is standing in. The symptom reads
    // as a renderer or pathing glitch, never as roster bookkeeping.
    //
    // Note there is nothing to assert about digits: the derivation still ends
    // in `/ 2`, so a "contains no literal number" check would fail on the good
    // code. What distinguishes the two is whether the expression consults the
    // roster at all.
    const expression = maxUnitRadiusExpression();
    assert.match(
      expression,
      /UNIT_STATS/,
      `MAX_UNIT_RADIUS_M is declared as \`${expression}\`, which never reads UNIT_STATS. ` +
        'A bound that does not consult the roster stops describing the fleet the moment ' +
        'the fleet changes, and says nothing when it does.'
    );
  });

  it('still reaches 65 m, so the refactor preserved the broadphase it was sizing', () => {
    // The derivation had a job beyond being self-consistent: it had to land on
    // the reach separation was already tuned against. A derivation that read
    // the wrong field would be internally tidy and quietly wrong — mapping
    // `attackRangeM` instead of `hullLengthM` would widen every neighbour query
    // to 450 m and still pass every test that only compares the constant to
    // itself. This is the assertion that says which number was correct.
    assert.equal(MAX_UNIT_RADIUS_M, 65);
  });
});

describe('roster invariants', () => {
  it('agrees with the longest hull in UNIT_STATS', () => {
    // This recomputation is character-for-character the implementation, so it
    // holds no independent opinion and cannot fail while the derivation stands.
    // What it has is a longer life than the 65 m pin above: the day someone
    // adds a hull longer than the Cruiser, that pin is legitimately rewritten
    // to the new figure, and this is what is left tying the bound to the fleet.
    const longestHullM = Math.max(...roster.map((stats) => stats.hullLengthM));
    assert.equal(MAX_UNIT_RADIUS_M, longestHullM / 2);
  });

  it('bounds every hull in the roster', () => {
    // An identity under the derivation — max(h)/2 is not less than h_k/2 for
    // any k — so this cannot go red while the derivation is in place. It stays
    // because it is the plain statement of what the bound is for: every hull
    // must be findable by the hulls it is overlapping, or separation never
    // hears about the overlap.
    for (const stats of roster) {
      assert.ok(
        unitRadiusM(stats.kind) <= MAX_UNIT_RADIUS_M,
        `${stats.name} (${stats.hullLengthM} m) exceeds the separation query bound`
      );
    }
  });

  it('is itself a real hull radius, so the bound is tight rather than generous', () => {
    // Also an identity: the maximum of a non-empty set is attained by a member
    // of it. The argument it records is that padding the bound above the roster
    // would still be safe but would widen every broadphase query in the
    // simulation on behalf of a unit that does not exist.
    assert.ok(roster.some((stats) => unitRadiusM(stats.kind) === MAX_UNIT_RADIUS_M));
  });

  it('gives every unit a positive, finite hull length', () => {
    // Unrelated to #149 — this guards the authoring of UNIT_STATS itself.
    // Radius is half the hull length and nothing downstream re-checks it: a 0
    // would let two hulls share the same water without ever registering an
    // overlap, and a NaN would poison the separation push and teleport the unit
    // to nowhere. Both fail quietly, so they get caught at the source.
    for (const stats of roster) {
      assert.ok(
        Number.isFinite(stats.hullLengthM) && stats.hullLengthM > 0,
        `${stats.name} has a degenerate hull length: ${stats.hullLengthM}`
      );
    }
  });
});

describe('the Clarion carries the directional balance clause (#401)', () => {
  const clarion = statsFor(UnitKind.Clarion);
  const corvette = statsFor(UnitKind.Corvette);

  it('lists a cone figure whose compass average is the Corvette it is scaled against', () => {
    // docs/systems-echo.md §8's balance clause is the whole reason a Knight
    // entry exists as its own hull rather than as a generic one in Order
    // colours: "a Knight hull is an ordinary hull with its loudness moved, not
    // a quiet one." The listed SIG is what the hull emits *in the cone*, and
    // averaged over the compass it must come back to the hull it is a peer of.
    //
    // Asserted against DIRECTIONAL_COMPASS_AVERAGE rather than against 2.2 or
    // against 62, so the day somebody re-tunes the sector table this fails
    // here — where a roster number is wrong — instead of silently making the
    // faction quieter or louder than the model says it is.
    const averaged = clarion.sigCruise * DIRECTIONAL_COMPASS_AVERAGE;
    assert.ok(
      Math.abs(averaged - corvette.sigCruise) <= 0.5,
      `a Clarion averaged over the compass is ${averaged.toFixed(2)}, ` +
        `which should land on the Corvette's ${corvette.sigCruise}`
    );
  });

  it('moves the Corvette’s loudness rather than adding to it', () => {
    // The other half of the same clause, and the difference between a doctrine
    // and a drawback. §8's sentence is "an ordinary hull with its loudness
    // moved": the cone has to be *louder* than the hull it is scaled against
    // and the wake *quieter* than it, or the entry is simply a noisier
    // Corvette with a discount in one quarter. The average above says the
    // trade is even; this says there is a trade at all.
    assert.ok(
      clarion.sigCruise > corvette.sigCruise,
      `bow-on, ${clarion.sigCruise} should beat a generic Corvette's ${corvette.sigCruise}`
    );
    assert.ok(
      clarion.sigCruise * DIRECTIONAL_SIGNATURE.WAKE < corvette.sigCruise,
      'and stern-on it should be the quieter of the two'
    );

    // A Clarion is also dearer and slower than the hull it replaces: the
    // doctrine is bought, not granted. A retune that made it cheaper *and*
    // better would leave the Order with no reason ever to build a Corvette.
    assert.ok(clarion.cost > corvette.cost, 'the doctrine is paid for at the yard');
    assert.ok(clarion.speed < corvette.speed, '...and in the water');
  });

  it('is the Order\u2019s and is refused to the other three navies', () => {
    assert.equal(unitAvailableTo(UnitKind.Clarion, Faction.Hadron), true);
    for (const faction of [Faction.Bathyarch, Faction.Pelagia, Faction.Directorate]) {
      assert.equal(
        unitAvailableTo(UnitKind.Clarion, faction),
        false,
        'a cone figure means nothing without the term, and the term is one navy\u2019s'
      );
    }
  });

  it('leaves every other hull nobody\u2019s', () => {
    // The lock is an exception and has to stay one — docs/units.md's design
    // note argues the Chorister is the Directorate's by its *price*, and a
    // later edit that reached for a faction field instead would quietly
    // replace that argument with a rule.
    for (const stats of roster) {
      if (stats.kind === UnitKind.Clarion) continue;
      assert.equal(
        stats.faction,
        undefined,
        `${stats.name} carries a faction lock; only the Clarion is meant to`
      );
    }
  });
});
