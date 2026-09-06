/**
 * The one rule for spending — economy.ts, against docs/economy.md §2 and §6.
 *
 * Three claims, and they are the ones the server, the commander AI and the
 * shell all stand on, because all three call these functions rather than
 * reading the roster's columns themselves:
 *
 * - **Every account is checked, and each one alone refuses.** A thing priced
 *   in Biomass is refused on Biomass with any amount of Nodules banked, which
 *   is docs/economy.md §6's "a different resource, not a discount on the same
 *   one" stated as a test.
 * - **A debit is the price, in every account, and nothing else.** No account
 *   the price does not name moves.
 * - **`priceOf` is total over the roster's columns**, which is what "no drift
 *   between the price the shell shows and the price the server charges" rests
 *   on: both sides read this one sum.
 *
 * The Biomass prices in the rule tests are synthetic on purpose: the rule
 * held before the roster carried an entry that used it, and it must not
 * depend on one. The last block is where the roster's own entry — the
 * Chorister, issue #352 — is held to what docs/units.md says of it.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ECONOMY_ACCOUNTS,
  Faction,
  STRUCTURE_STATS,
  UNIT_STATS,
  UnitKind,
  affords,
  charge,
  priceOf,
  shortfall,
  type Price,
  type Stockpile,
} from '../dist/index.js';

const price = (nodules: number, crystal = 0, biomass = 0): Price => ({
  nodules,
  crystal,
  biomass,
});
const banked = (nodules: number, crystal = 0, biomass = 0): Stockpile => ({
  nodules,
  crystal,
  biomass,
});

describe('priceOf', () => {
  it('reads all three of the roster’s columns, and an absent one as zero', () => {
    assert.deepEqual(priceOf({ cost: 120 }), price(120));
    assert.deepEqual(priceOf({ cost: 260, crystalCost: 80 }), price(260, 80));
    assert.deepEqual(priceOf({ cost: 40, biomassCost: 35 }), price(40, 0, 35));
    assert.deepEqual(priceOf({ cost: 0, crystalCost: 120, biomassCost: 60 }), price(0, 120, 60));
  });

  it('names exactly the accounts the economy record carries', () => {
    // The wire's three fields, in docs/economy.md §2's order — which is also
    // the order a refusal names them in, so a reader of `shortfall` gets
    // Nodules before Crystal before Biomass every time.
    assert.deepEqual([...ECONOMY_ACCOUNTS], ['nodules', 'crystal', 'biomass']);
    assert.deepEqual(Object.keys(priceOf({ cost: 1 })), [...ECONOMY_ACCOUNTS]);
  });
});

describe('affords', () => {
  it('is met when every account exactly covers its share', () => {
    assert.equal(affords(banked(260, 80, 35), price(260, 80, 35)), true);
    assert.equal(affords(banked(120), price(120)), true);
  });

  it('refuses on Nodules alone', () => {
    assert.equal(affords(banked(119, 1000, 1000), price(120)), false);
  });

  it('refuses on Crystal alone', () => {
    // The crystal gate: docs/economy.md §2's "every faction's upper tech
    // tier is crystal-locked". Five thousand nodules do not open it.
    assert.equal(affords(banked(5000, 79, 1000), price(260, 80)), false);
  });

  it('refuses on Biomass alone', () => {
    // docs/economy.md §6: the Directorate's living is a different resource,
    // not a discount on the same one. A cohort hull with a Biomass price is
    // refused on Biomass however rich the other two accounts are — there is
    // no rate at which Nodules become a cohort.
    assert.equal(affords(banked(5000, 5000, 34), price(40, 0, 35)), false);
    assert.equal(affords(banked(5000, 5000, 35), price(40, 0, 35)), true);
  });

  it('refuses a stockpile that is not a number, rather than admitting it', () => {
    // NaN compares false against everything, so a corrupted account refuses
    // rather than buying — the safe default for a server-side check.
    assert.equal(affords(banked(Number.NaN), price(1)), false);
  });
});

describe('charge', () => {
  it('debits the price in every account it names and no other', () => {
    const purse = banked(500, 200, 100);
    charge(purse, price(260, 80));
    assert.deepEqual(purse, banked(240, 120, 100), 'Biomass was not in the price');

    charge(purse, price(0, 0, 35));
    assert.deepEqual(purse, banked(240, 120, 65), 'only Biomass was');
  });

  it('never takes an account below zero once affords has said yes', () => {
    for (const p of [price(120), price(260, 80), price(40, 0, 35), price(0, 120, 60)]) {
      const purse = banked(300, 120, 60);
      if (!affords(purse, p)) continue;
      charge(purse, p);
      for (const account of ECONOMY_ACCOUNTS) {
        assert.ok(purse[account] >= 0, `${account} went negative paying ${JSON.stringify(p)}`);
      }
    }
  });
});

describe('shortfall', () => {
  it('is empty exactly when the price is afforded', () => {
    assert.deepEqual(shortfall(banked(260, 80, 35), price(260, 80, 35)), []);
    assert.deepEqual(shortfall(banked(1000, 1000, 1000), price(120)), []);
  });

  it('names each short account and by how much, in the record’s order', () => {
    assert.deepEqual(shortfall(banked(200, 0, 0), price(300, 120)), [
      { account: 'nodules', short: 100 },
      { account: 'crystal', short: 120 },
    ]);
    assert.deepEqual(shortfall(banked(5000, 5000, 12), price(40, 0, 35)), [
      { account: 'biomass', short: 23 },
    ]);
  });

  it('carries a fractional balance through, since Biomass is paid in fractions', () => {
    // A rendering under a strained region pays three quarters of the roster's
    // figure (docs/bestiary.md §6), so 26.25 banked against a price of 35 is
    // 8.75 short — the shell rounds that up for display, the rule does not.
    assert.deepEqual(shortfall(banked(0, 0, 26.25), price(0, 0, 35)), [
      { account: 'biomass', short: 8.75 },
    ]);
  });
});

describe('the roster’s prices', () => {
  const roster = [...Object.values(UNIT_STATS), ...Object.values(STRUCTURE_STATS)];

  it('are finite and non-negative in every account', () => {
    // A negative price would be income on a button, and a NaN would refuse
    // everything forever; both would fail quietly, so they are caught here.
    for (const stats of roster) {
      const p = priceOf(stats);
      for (const account of ECONOMY_ACCOUNTS) {
        assert.ok(
          Number.isFinite(p[account]) && p[account] >= 0,
          `${stats.name} has a degenerate ${account} price: ${p[account]}`
        );
      }
    }
  });

  it('price the Directorate’s hulls in Biomass, and nobody else’s', () => {
    // docs/economy.md §6: Biomass is what a cohort costs, not a discount on
    // what a hull costs. The Chorister is the roster's cohort entry (#352),
    // the rung's roster adds the Directorate's two — the Precentor at 30
    // and the Dredge at 60, "three accounts, the first hull priced in all of
    // them" (docs/units.md; #461) — and the transports add the Verger at 30
    // (#501). The Abyssal Submersible is the crystal-locked deep hull and
    // stays priced as one, so a Biomass price on any hull outside the
    // Directorate's is a roster edit that needs its docs, and a Submersible
    // with one is the two hulls' roles drifting together.
    //
    // Two ways a Biomass hull is the Directorate's, and the roster uses both:
    // locked besides (the Precentor, the Dredge), or nobody's by lock with
    // the price doing the whole job (the Chorister, the Verger — docs/units.md,
    // design notes). What it may not be is locked to *another* navy.
    const inBiomass = roster.filter((stats) => priceOf(stats).biomass > 0);
    assert.deepEqual(
      inBiomass.map((stats) => stats.name).sort(),
      ['Chorister', 'Dredge', 'Precentor', 'Verger'],
      'the Biomass column names the cohort programme’s hulls and nothing else'
    );
    for (const stats of inBiomass) {
      assert.ok(
        stats.faction === undefined || stats.faction === Faction.Directorate,
        `${stats.name} is priced in Biomass and must be the Directorate’s, by lock or by price`
      );
    }
    const submersible = priceOf(UNIT_STATS[UnitKind.AbyssalSubmersible]);
    assert.ok(submersible.crystal > 0 && submersible.biomass === 0);
  });

  it('make the cohort hull the cheapest hull in Nodules — §6’s "cheapest per unit"', () => {
    // The sentence issue #352 was filed over. It is a claim about Nodules,
    // the account every hull is written in, and it has to hold against the
    // Light Scout: a cohort hull dearer than a scout is not what "very many,
    // cheap, slow" (docs/factions.md) describes.
    const chorister = UNIT_STATS[UnitKind.Chorister];
    for (const stats of Object.values(UNIT_STATS)) {
      if (stats.kind === UnitKind.Chorister) continue;
      assert.ok(
        priceOf(stats).nodules > priceOf(chorister).nodules,
        `${stats.name} (${stats.cost}) undercuts the cohort hull (${chorister.cost})`
      );
    }
  });

  it('price the cohort hull at one mid-water rendering, refused under a strained region', () => {
    // docs/units.md, design notes: one Draymaw at full rate pays for one,
    // and the same Draymaw under a strained region (three quarters,
    // docs/bestiary.md §6) falls short — so the guard-rail bites at the
    // first hull, not the tenth. Through a rendering contract (30%) it pays
    // for a third of one, which is how the hull is the Directorate's without
    // a faction lock.
    const price = priceOf(UNIT_STATS[UnitKind.Chorister]);
    const draymaw = 22;
    assert.ok(affords(banked(1000, 0, draymaw), price), 'a Draymaw pays for a Chorister');
    assert.ok(!affords(banked(1000, 0, draymaw * 0.75), price), '...but not on worn ground');
    assert.ok(!affords(banked(1000, 0, draymaw * 0.3), price), '...nor through a contract');
    assert.ok(affords(banked(1000, 0, draymaw * 0.3 * 3.1), price), 'three and a bit do');
  });
});
