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
 * that fails against the pre-fix code. The value pin does not — it passes
 * either way — and is there for the other direction: a derivation that reads
 * the wrong field would still be self-consistent, and would still be wrong.
 * That change was
 * value-preserving — the old `130 / 2` and the new `Math.max(…) / 2` both
 * evaluated to exactly 65, because the Cruiser was the longest hull before and
 * after it — so no comparison of runtime values could tell the two versions
 * apart. Only the source can, which is why one test here does something as
 * unusual as reading it. (The pin has since moved to 75: the rung's roster
 * added a longer hull, #461, and the derivation followed it, which is the
 * whole point of the derivation.)
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
  FACTION_PRESSURE_BASELINE,
  FACTION_STRUCTURE,
  Faction,
  HULL_EFFECTS,
  MAX_UNIT_RADIUS_M,
  PRODUCIBLE,
  StructureKind,
  UNIT_STATS,
  UnitKind,
  YARDS,
  priceOf,
  statsFor,
  structureStatsFor,
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

  it('reaches 75 m — the Bulwark’s half-length — so the bound followed the fleet', () => {
    // The derivation had a job beyond being self-consistent: it had to land on
    // the reach separation was tuned against. A derivation that read the wrong
    // field would be internally tidy and quietly wrong — mapping
    // `attackRangeM` instead of `hullLengthM` would widen every neighbour query
    // to 450 m and still pass every test that only compares the constant to
    // itself. This is the assertion that says which number was correct.
    //
    // It was 65 for as long as the Cruiser was the longest hull. The rung's
    // roster (#461) added the Bulwark at 150 m, and this pin is the "legitimately
    // rewritten to the new figure" the header promised — the day it was, the
    // derivation did exactly what it was written to do.
    assert.equal(MAX_UNIT_RADIUS_M, 75);
    assert.equal(statsFor(UnitKind.Bulwark).hullLengthM / 2, MAX_UNIT_RADIUS_M);
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

  it('leaves the seven generic hulls nobody\u2019s', () => {
    // The lock stays an exception on the generic roster — docs/units.md's
    // design note argues the Chorister is the Directorate's by its *price*,
    // and a later edit that reached for a faction field instead would quietly
    // replace that argument with a rule. The rung's eight are the other kind
    // of entry, and are held to their navies below.
    for (const kind of [
      UnitKind.LightScout,
      UnitKind.Corvette,
      UnitKind.Cruiser,
      UnitKind.AbyssalSubmersible,
      UnitKind.Chorister,
      UnitKind.Harvester,
    ]) {
      assert.equal(
        statsFor(kind).faction,
        undefined,
        `${statsFor(kind).name} carries a faction lock; the generic roster is nobody’s`
      );
    }
  });
});

describe('the rung’s roster — two hulls a navy (#461)', () => {
  /** Each navy's Foundry hull and Slipway hull, as docs/units.md writes them. */
  const NAVY: Record<Faction, [UnitKind, UnitKind]> = {
    [Faction.Bathyarch]: [UnitKind.Tender, UnitKind.Bulwark],
    [Faction.Pelagia]: [UnitKind.Spinner, UnitKind.Sower],
    [Faction.Directorate]: [UnitKind.Precentor, UnitKind.Dredge],
    [Faction.Hadron]: [UnitKind.Cantus, UnitKind.Reciter],
  };
  const factions = [Faction.Bathyarch, Faction.Pelagia, Faction.Directorate, Faction.Hadron];

  it('locks each of the eight to exactly the navy it is written for', () => {
    // The acceptance line of the issue: `unitAvailableTo` returns true for
    // exactly the navy each hull is written for. Every entry in the doc's
    // section carries "Faction-locked: yes" with its reason, so the matrix
    // is the whole rule — one true per row, three false.
    for (const owner of factions) {
      for (const kind of NAVY[owner]) {
        for (const asker of factions) {
          assert.equal(
            unitAvailableTo(kind, asker),
            asker === owner,
            `${statsFor(kind).name} is ${Faction[owner]}'s and ${Faction[asker]} asked`
          );
        }
      }
    }
  });

  it('puts each navy’s first hull at the Foundry and its second behind the rung', () => {
    // "The first at the Foundry, so it is an opening; the second behind the
    // rung, so the crystal is a decision about *what* to field." The Slipway
    // "produces each navy's second exclusive hull, and nothing the Foundry
    // already builds", so the two rows are disjoint.
    const foundry = PRODUCIBLE[StructureKind.Foundry]!;
    const slipway = PRODUCIBLE[StructureKind.Slipway]!;
    for (const owner of factions) {
      const [opening, decision] = NAVY[owner];
      assert.ok(foundry.includes(opening), `${statsFor(opening).name} is a Foundry hull`);
      assert.ok(slipway.includes(decision), `${statsFor(decision).name} is a Slipway hull`);
    }
    for (const kind of slipway) {
      assert.ok(!foundry.includes(kind), `${statsFor(kind).name} is built at one yard only`);
    }
    assert.ok(YARDS.includes(StructureKind.Foundry) && YARDS.includes(StructureKind.Slipway));
    assert.ok(!YARDS.includes(StructureKind.Bastion), 'the Bastion is a depot, not a yard');
  });

  it('carries the Reciter’s cone figure the way it carries the Clarion’s', () => {
    // docs/units.md: "90 ahead, 31.5 on the beam, 9 astern, 40.5 over the
    // compass — louder than a Corvette and quieter than a Cruiser on
    // average". Held against the term rather than against 40.5, as the
    // Clarion's is.
    const reciter = statsFor(UnitKind.Reciter);
    const corvette = statsFor(UnitKind.Corvette);
    const cruiser = statsFor(UnitKind.Cruiser);
    const averaged = reciter.sigCruise * DIRECTIONAL_COMPASS_AVERAGE;
    assert.ok(Math.abs(averaged - 40.5) <= 0.5, `over the compass: ${averaged.toFixed(2)}`);
    assert.ok(averaged > corvette.sigCruise && averaged < cruiser.sigCruise);
    assert.ok(reciter.sigCruise * DIRECTIONAL_SIGNATURE.WAKE < corvette.sigIdle, 'astern: 9');
  });

  it('reads the Cantus as a plain figure, because a node has no cone', () => {
    // The one Knight hull the term does not apply to while it sings — so its
    // listed SIG must be readable without the term, unlike the other two
    // Order hulls. A Cantus listed at 2.2× anything would be the mistake the
    // Clarion's lock exists to refuse, in the Order's own colours.
    const cantus = statsFor(UnitKind.Cantus);
    assert.ok(cantus.sigIdle <= statsFor(UnitKind.LightScout).sigCruise, 'silent moving');
    assert.equal(cantus.sigWorking, 80, 'and the Spire’s figure singing');
  });

  it('prices the deep in the accounts the doc names', () => {
    // The Dredge is the first hull priced in all three; the Cantus is the
    // Spire's grant "at a third of the price and none of the crystal".
    const dredge = statsFor(UnitKind.Dredge);
    assert.ok(dredge.cost > 0 && dredge.crystalCost === 40 && dredge.biomassCost === 60);
    assert.equal(statsFor(UnitKind.Cantus).crystalCost, undefined);
    assert.equal(statsFor(UnitKind.Dredge).pressureRating, 4, 'the only PR-4 entry');
    for (const stats of roster) {
      if (stats.kind === UnitKind.Dredge) continue;
      assert.ok(stats.pressureRating < 4, `${stats.name} must not reach the Dredge's band`);
    }
  });

  it('keeps the path to a rented band clear of the crystal that path is for', () => {
    // The circle #491 found, and the rule that closes it. Crystal is Abyssal,
    // so a navy whose harvester is not PR-3 reaches it only by renting a band
    // — and the Commune's source of one, the Sower, was itself priced in the
    // crystal it existed to reach, behind a yard priced the same way. A key
    // priced in the thing it unlocks is not a price, it is a wall: measured
    // across every map, no navy ever built a second yard.
    //
    // Asserted for the two navies that have a source at all. The Consortium
    // has none — its route is the Pressure Refit, designed and not built
    // (systems-progression.md §2) — and that is the open half of #491 rather
    // than something this file can hold.
    const free = (crystal: number, what: string) =>
      assert.equal(crystal, 0, `${what} is on the path to crystal and must not cost crystal`);
    free(priceOf(statsFor(UnitKind.Cantus)).crystal, "the Order's source");
    free(priceOf(statsFor(UnitKind.Sower)).crystal, "the Commune's source");
    free(priceOf(structureStatsFor(StructureKind.Slipway)).crystal, 'the yard that builds it');

    // Both navies that need a rented band have one they can buy without it.
    for (const faction of [Faction.Pelagia, Faction.Hadron]) {
      assert.ok(
        FACTION_PRESSURE_BASELINE[faction] < 3,
        `${Faction[faction]} is only in this test because it needs to rent a band`
      );
    }

    // And the gate itself is untouched: what a rented band lets you *field*
    // still costs crystal, which is economy.md §8's whole tech tier.
    assert.equal(priceOf(statsFor(UnitKind.AbyssalSubmersible)).crystal, 80);
    for (const [faction, kind] of Object.entries(FACTION_STRUCTURE)) {
      assert.ok(
        priceOf(structureStatsFor(kind as StructureKind)).crystal > 0,
        `signature structure ${faction} must stay crystal-locked`
      );
    }
  });

  it('gives an effect clock to exactly the hulls with work to clock', () => {
    // `sigWorking` is what `spawnUnit` reads to attach a HullEffect, so the
    // set has to be the doc's: the Tender welding, the Sower seeded, the
    // Cantus singing — and the Spinner's magazine is the one grown magazine.
    const working = roster.filter((s) => s.sigWorking !== undefined).map((s) => s.name);
    assert.deepEqual(working.sort(), ['Cantus', 'Sower', 'Tender']);
    const grown = roster.filter((s) => s.mineMagazine !== undefined).map((s) => s.name);
    assert.deepEqual(grown, ['Spinner']);
    assert.equal(statsFor(UnitKind.Spinner).mineMagazine, HULL_EFFECTS.SPINNER.MAGAZINE);
  });
});
