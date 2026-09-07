/**
 * The refit roster against the doc that authored it — docs/systems-progression.md
 * §2, and #517, which is the issue that says an unbuilt §2 leaves one navy in
 * four with no route to the Abyssal band at all.
 *
 * What is asserted here is the *table*, because the table is the doctrine: the
 * Consortium's discount is its whole depth line, the Commune's ceiling is why
 * the Sower exists, the Directorate's absence is what "born to it" means, and
 * the Order's instant-and-sounded row is the one carve-out §1's rule 1 would
 * otherwise forbid. Everything the simulation does with these numbers is held
 * in `packages/backend/test/refit.test.ts`; what is held here is that the
 * numbers are the doc's.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CRYSTAL,
  Faction,
  FACTION_PRESSURE_BASELINE,
  REFIT_KINDS,
  REFIT_STATS,
  REFIT_TERMS,
  RefitKind,
  StructureKind,
  UnitKind,
  effectivePressureRating,
  priceOf,
  refitLineTimeS,
  refitOfferedTo,
  refitPriceFor,
  refittedPressureRating,
  requiredPressureRating,
  structureStatsFor,
} from '../dist/index.js';

const FACTIONS = [Faction.Bathyarch, Faction.Pelagia, Faction.Directorate, Faction.Hadron];

describe('the refits', () => {
  it('transcribes §2 for the one refit that is built', () => {
    const pressure = REFIT_STATS[RefitKind.Pressure];
    assert.equal(pressure.cost, 400, '400 Nodules');
    assert.equal(pressure.crystalCost, 120, '120 Crystal');
    assert.equal(pressure.buildTimeS, 120, '120 s on the line');
    assert.equal(pressure.pressureBonus, 1, '+1 PR, fleet-wide');
    assert.equal(pressure.sigBonus, 2, '+2 SIG idle and cruise');
  });

  it('prices the Pressure Refit as a signature structure, because it is the same decision', () => {
    // §2 says so in as many words: "the same 120 Crystal as a Baffle Barge, a
    // Cantor, a Sounding Spire or a Spore Veil — because it is the same kind
    // of decision: the deep, spent on something you cannot un-spend." Read off
    // the structures rather than restated, so re-pricing the tier moves both.
    const signature = priceOf(structureStatsFor(StructureKind.BaffleBarge)).crystal;
    assert.equal(REFIT_STATS[RefitKind.Pressure].crystalCost, signature);
  });

  it('gives each navy the terms its depth line already promised', () => {
    // The Consortium *buys* access, so its refit is the cheapest crystal in the
    // game — and the discount is crystal-only, because the Nodules and the two
    // minutes at SIG 70 are the currency the Klaxon always pays in.
    assert.equal(refitPriceFor(RefitKind.Pressure, Faction.Bathyarch).crystal, 84, '×0.7');
    assert.equal(refitPriceFor(RefitKind.Pressure, Faction.Bathyarch).nodules, 400);
    assert.equal(refitLineTimeS(RefitKind.Pressure, Faction.Bathyarch), 120);

    // The Commune's are poor: half again in crystal and half again on the line.
    assert.equal(refitPriceFor(RefitKind.Pressure, Faction.Pelagia).crystal, 180, '×1.5');
    assert.equal(refitLineTimeS(RefitKind.Pressure, Faction.Pelagia), 180, '×1.5 line time');

    // The Order's is instant, priced in Resonance alone, and sounded.
    const order = refitPriceFor(RefitKind.Pressure, Faction.Hadron);
    assert.equal(order.crystal, 180, 'Crystal alone at ×1.5');
    assert.equal(order.nodules, 0, 'no Nodules');
    assert.equal(refitLineTimeS(RefitKind.Pressure, Faction.Hadron), 0, 'no line time');
    assert.deepEqual(REFIT_TERMS[Faction.Hadron].sounding, { sig: 80, seconds: 15 });
    assert.equal(REFIT_TERMS[Faction.Hadron].boughtAt, StructureKind.Bastion);
  });

  it('offers the Pressure Refit to everyone except the navy that starts with it', () => {
    for (const faction of FACTIONS) {
      const offered = refitOfferedTo(RefitKind.Pressure, faction);
      assert.equal(
        offered,
        faction !== Faction.Directorate,
        `${Faction[faction]}: §2's per-faction table`
      );
      // And the reason, stated as arithmetic rather than as a comment: the one
      // navy not offered it is the one already at the ceiling everyone else is
      // buying toward.
      if (!offered) assert.equal(FACTION_PRESSURE_BASELINE[faction], 3);
    }
  });

  it('sells the Consortium and the Order the band the crystal field needs, and the Commune not', () => {
    // The whole of #517 in four numbers. Crystal sits in the Abyssal band on
    // every map, so a navy's route to it is exactly whether its hauler ends up
    // rated for `CRYSTAL.FIELD_DEPTH_M` once the refit is bought.
    const needed = requiredPressureRating(CRYSTAL.FIELD_DEPTH_M);
    const reaches = (faction: Faction): boolean =>
      refittedPressureRating(effectivePressureRating(UnitKind.Harvester, faction), faction) >=
      needed;

    assert.ok(reaches(Faction.Bathyarch), 'Buys access — and now there is something to buy');
    assert.ok(reaches(Faction.Hadron), 'Projects access, and may also purchase it outright');
    assert.ok(
      !reaches(Faction.Pelagia),
      'Terraforms access: PR-1 → PR-2 only, so the Sower stays their answer to the deep'
    );
    // The Directorate is not offered one, and does not need one.
    assert.ok(effectivePressureRating(UnitKind.Harvester, Faction.Directorate) >= needed);
  });

  it('never carries a hull past its navy’s ceiling, however deep the hull already is', () => {
    // The Abyssal Submersible is PR-3 for everyone. A refit that stepped it to
    // 4 would invent water no depth band asks for, which is why the terms carry
    // a ceiling rather than a flat +1.
    for (const faction of FACTIONS) {
      const ceiling = REFIT_TERMS[faction].pressureCeiling;
      const sub = effectivePressureRating(UnitKind.AbyssalSubmersible, faction);
      assert.ok(refittedPressureRating(sub, faction) <= Math.max(ceiling, sub));
      assert.ok(refittedPressureRating(sub, faction) <= 3, `${Faction[faction]}: no PR-4 by refit`);
    }
    // And the navy that is not offered one gets nothing from the function
    // either, so a caller that forgot to ask `refitOfferedTo` cannot smuggle a
    // band past the table.
    const born = effectivePressureRating(UnitKind.Harvester, Faction.Directorate);
    assert.equal(refittedPressureRating(born, Faction.Directorate), born);
  });

  it('keeps the list at the five §2 wrote, and no more', () => {
    // "Five refits is the list. A sixth is a design change to this document,
    // not a constant." Only the Pressure Refit is built; what this holds is
    // that the enum and the roster table cannot drift apart, so a sixth cannot
    // be offered by one reader and missed by the other.
    assert.deepEqual([...REFIT_KINDS], [RefitKind.Pressure]);
    assert.equal(Object.keys(REFIT_STATS).length, REFIT_KINDS.length);
    for (const kind of REFIT_KINDS) assert.equal(REFIT_STATS[kind].kind, kind);
  });
});
